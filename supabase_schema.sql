BEGIN;
-- ==============================================================================
-- CONTROLE DE TAREFAS - ESQUEMA COMPLETO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Atualizado com: Cadastro de Empresas, Matriz de Recorrência e Recibos de Obrigações (SPED/DAS)
-- Execute este script no "SQL Editor" do seu painel do Supabase.
-- ==============================================================================

-- 1. TABELA DE EMPRESAS & CLIENTES
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT NOT NULL,
    regime TEXT NOT NULL DEFAULT 'Simples Nacional',
    default_assignee TEXT,
    status TEXT NOT NULL DEFAULT 'Ativa',
    notes TEXT,
    obligations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE TAREFAS E OBRIGAÇÕES COM PROTOCOLO DE RECIBO
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    company_id TEXT REFERENCES public.companies(id) ON DELETE SET NULL,
    assignee TEXT NOT NULL,
    due_date DATE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Média',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    checklist JSONB DEFAULT '[]'::jsonb,
    type TEXT DEFAULT 'custom',
    receipt_protocol TEXT,
    receipt_date DATE,
    receipt_file_name TEXT,
    receipt_file_data TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency TEXT DEFAULT 'Mensal',
    recurrence_day INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Migração rápida para tabelas existentes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT DEFAULT 'Mensal';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

-- 3. TABELA DE HISTÓRICO E AUDITORIA DE SEGURANÇA (LGPD)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    user_agent TEXT
);

-- 4. TABELA DA EQUIPE COM PERMISSÕES
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT
);

-- Um projeto Supabase representa um escritório. Não inclui usuários/dados de demonstração.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS competencia TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS competencia_label TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS receipt_path TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cycle_key TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_cycle_key_unique ON public.tasks(cycle_key);
CREATE UNIQUE INDEX IF NOT EXISTS team_email_unique ON public.team_members(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS team_name_unique ON public.team_members(name);

CREATE TABLE IF NOT EXISTS public.task_catalog (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consulta a identidade validada no servidor, não nomes/papéis enviados pelo navegador.
CREATE OR REPLACE FUNCTION public.office_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.role FROM public.team_members m
  JOIN auth.users u ON lower(m.email) = lower(u.email)
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND NOT coalesce(u.is_anonymous, false)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.office_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.office_role() TO authenticated;

-- Substitui inclusive as políticas públicas da versão anterior.
DO $$ DECLARE item RECORD; t TEXT; BEGIN
  FOR item IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('tasks','companies','team_members','audit_logs','task_catalog')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', item.policyname, item.tablename); END LOOP;
  FOREACH t IN ARRAY ARRAY['tasks','companies','team_members','audit_logs','task_catalog'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY members_read ON public.%I FOR SELECT TO authenticated USING (public.office_role() IS NOT NULL)', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['companies','task_catalog'] LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY members_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.office_role() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY members_update ON public.%I FOR UPDATE TO authenticated USING (public.office_role() IS NOT NULL) WITH CHECK (public.office_role() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY managers_delete ON public.%I FOR DELETE TO authenticated USING (public.office_role() = ''Gestor'')', t);
  END LOOP;
END $$;
GRANT INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
CREATE POLICY managers_write ON public.team_members FOR ALL TO authenticated
  USING (public.office_role() = 'Gestor') WITH CHECK (public.office_role() = 'Gestor');
GRANT DELETE ON public.tasks TO authenticated;
CREATE POLICY managers_delete ON public.tasks FOR DELETE TO authenticated USING (public.office_role() = 'Gestor');

CREATE OR REPLACE FUNCTION public.task_cycle_key(company TEXT, client_name TEXT, title TEXT, competence TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_array(coalesce(company,client_name,''),
    lower(regexp_replace(trim(regexp_replace(title,
      '(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s*/\s*[0-9]{4}|\m(0[1-9]|1[0-2])/[0-9]{4}\M', '', 'gi')), '[\s/-]+$', '')),
    competence)::text;
$$;

CREATE OR REPLACE FUNCTION public.validate_task() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN
  IF trim(NEW.title) = '' OR trim(NEW.assignee) = '' THEN RAISE EXCEPTION 'Informe título e responsável.'; END IF;
  IF NEW.competencia IS NULL OR NEW.competencia !~ '^(0[1-9]|1[0-2])/[0-9]{4}$' THEN RAISE EXCEPTION 'Competência inválida.'; END IF;
  IF NEW.status NOT IN ('Pendente','Em Andamento','Concluído') THEN RAISE EXCEPTION 'Status inválido.'; END IF;
  IF NEW.is_recurring AND (NEW.recurrence_day IS NULL OR NEW.recurrence_day NOT BETWEEN 1 AND 31 OR NEW.recurrence_frequency NOT IN ('Mensal','Bimestral','Trimestral','Semestral','Anual')) THEN RAISE EXCEPTION 'Recorrência inválida.'; END IF;
  IF NEW.receipt_path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts' AND name = NEW.receipt_path) THEN RAISE EXCEPTION 'Recibo não encontrado.'; END IF;
  NEW.cycle_key := public.task_cycle_key(NEW.company_id,NEW.client,NEW.title,NEW.competencia);
  RETURN NEW;
END $$;

-- Preenche dados legados sem excluir duplicatas. Duplicatas legadas permanecem para revisão.
UPDATE public.tasks SET competencia = to_char(due_date,'MM/YYYY') WHERE competencia IS NULL OR competencia = '';
WITH ranked AS (
  SELECT id, public.task_cycle_key(company_id,client,title,competencia) AS key,
    row_number() OVER (PARTITION BY public.task_cycle_key(company_id,client,title,competencia) ORDER BY id) AS n
  FROM public.tasks
)
UPDATE public.tasks t SET cycle_key = r.key FROM ranked r WHERE t.id = r.id AND r.n = 1 AND t.cycle_key IS NULL;
DROP TRIGGER IF EXISTS validate_task ON public.tasks;
CREATE TRIGGER validate_task BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.validate_task();

-- Função interna: sem permissão de execução pela API.
CREATE OR REPLACE FUNCTION public.insert_task_internal(p_task JSONB, p_ignore_duplicate BOOLEAN DEFAULT false)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tasks; result TEXT; BEGIN
  t := jsonb_populate_record(NULL::public.tasks, p_task);
  INSERT INTO public.tasks(id,title,client,company_id,assignee,due_date,competencia,competencia_label,priority,description,status,checklist,type,
    receipt_protocol,receipt_date,receipt_file_name,receipt_file_data,receipt_path,is_recurring,recurrence_frequency,recurrence_day,version)
  VALUES(t.id,t.title,t.client,t.company_id,t.assignee,t.due_date,t.competencia,t.competencia_label,coalesce(t.priority,'Média'),t.description,
    coalesce(t.status,'Pendente'),coalesce(t.checklist,'[]'),coalesce(t.type,'custom'),t.receipt_protocol,t.receipt_date,t.receipt_file_name,
    t.receipt_file_data,t.receipt_path,coalesce(t.is_recurring,false),coalesce(t.recurrence_frequency,'Mensal'),t.recurrence_day,1)
  ON CONFLICT (cycle_key) DO NOTHING RETURNING id INTO result;
  IF result IS NULL AND NOT p_ignore_duplicate THEN RAISE EXCEPTION 'Já existe uma tarefa desta empresa/rotina/competência.'; END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.insert_task_internal(JSONB,BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_task(p_task JSONB, p_next JSONB DEFAULT NULL) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.tasks; previous public.tasks; result TEXT; BEGIN
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
  t := jsonb_populate_record(NULL::public.tasks,p_task);
  IF coalesce(t.version,0) = 0 THEN
    IF p_next IS NOT NULL THEN RAISE EXCEPTION 'Renovação inválida.'; END IF;
    RETURN public.insert_task_internal(p_task,false);
  END IF;
  SELECT * INTO previous FROM public.tasks WHERE id=t.id FOR UPDATE;
  IF NOT FOUND OR previous.version <> t.version THEN RAISE EXCEPTION 'A tarefa foi alterada por outra pessoa. Atualize a página antes de salvar.'; END IF;
  UPDATE public.tasks SET title=t.title,client=t.client,company_id=t.company_id,assignee=t.assignee,due_date=t.due_date,
    competencia=t.competencia,competencia_label=t.competencia_label,priority=t.priority,description=t.description,status=t.status,
    checklist=t.checklist,type=t.type,receipt_protocol=t.receipt_protocol,receipt_date=t.receipt_date,receipt_file_name=t.receipt_file_name,
    receipt_file_data=t.receipt_file_data,receipt_path=t.receipt_path,is_recurring=t.is_recurring,
    recurrence_frequency=t.recurrence_frequency,recurrence_day=t.recurrence_day,version=previous.version+1 WHERE id=t.id;
  IF p_next IS NOT NULL THEN
    IF previous.status='Concluído' OR t.status<>'Concluído' OR NOT t.is_recurring THEN RAISE EXCEPTION 'Renovação inválida.'; END IF;
    result := public.insert_task_internal(p_next,true);
  END IF;
  RETURN t.id;
END $$;
REVOKE ALL ON FUNCTION public.save_task(JSONB,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_task(JSONB,JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_task_batch(p_tasks JSONB) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE item JSONB; count INTEGER := 0; BEGIN
  IF public.office_role() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado.'; END IF;
  IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)>1000 THEN RAISE EXCEPTION 'Lote inválido (máximo 1000 tarefas).'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
    IF public.insert_task_internal(item,true) IS NOT NULL THEN count:=count+1; END IF;
  END LOOP;
  RETURN count;
END $$;
REVOKE ALL ON FUNCTION public.create_task_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task_batch(JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_companies(p_name TEXT,p_ids TEXT[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  IF public.office_role() IS DISTINCT FROM 'Gestor' THEN RAISE EXCEPTION 'Somente o gestor pode distribuir carteiras.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_members WHERE name=p_name) THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  UPDATE public.companies SET default_assignee = CASE WHEN id=ANY(p_ids) THEN p_name ELSE NULL END
    WHERE id=ANY(p_ids) OR default_assignee=p_name;
END $$;
REVOKE ALL ON FUNCTION public.assign_companies(TEXT,TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_companies(TEXT,TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_team() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  PERFORM pg_advisory_xact_lock(902617);
  IF TG_OP <> 'INSERT' AND OLD.role='Gestor' AND (TG_OP='DELETE' OR NEW.role<>'Gestor')
    AND (SELECT count(*) FROM public.team_members WHERE role='Gestor')<=1 THEN RAISE EXCEPTION 'Mantenha pelo menos um gestor.'; END IF;
  IF TG_OP='DELETE' THEN
    UPDATE public.companies SET default_assignee=NULL WHERE default_assignee=OLD.name;
    RETURN OLD;
  END IF;
  NEW.email := lower(trim(NEW.email));
  IF NEW.email IS NULL OR NEW.email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR trim(NEW.name)='' THEN RAISE EXCEPTION 'Informe nome e e-mail válidos.'; END IF;
  IF TG_OP='UPDATE' AND NEW.name<>OLD.name THEN
    UPDATE public.companies SET default_assignee=NEW.name WHERE default_assignee=OLD.name;
    UPDATE public.tasks SET assignee=NEW.name,version=version+1 WHERE assignee=OLD.name;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_team ON public.team_members;
CREATE TRIGGER protect_team BEFORE INSERT OR UPDATE OR DELETE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.protect_team();

-- Auditoria do banco: autor e horário não são aceitos do cliente; não há DELETE/UPDATE pela API.
CREATE OR REPLACE FUNCTION public.audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor TEXT; record_data JSONB; BEGIN
  SELECT m.name || ' (' || m.role || ')' INTO actor FROM public.team_members m JOIN auth.users u ON lower(m.email)=lower(u.email) WHERE u.id=auth.uid();
  record_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  INSERT INTO public.audit_logs(id,user_name,action,details,ip,user_agent)
    VALUES(gen_random_uuid()::text,coalesce(actor,'Administrador do banco'),TG_TABLE_NAME || ': ' || TG_OP,
      coalesce(record_data->>'title',record_data->>'name',record_data->'data'->>'title',record_data->>'id'),NULL,NULL);
  RETURN NULL;
END $$;
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['tasks','companies','team_members','task_catalog'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_change ON public.%I',t);
    EXECUTE format('CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_change()',t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.audit_change(), public.protect_team(), public.validate_task() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('receipts','receipts',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'];
DROP POLICY IF EXISTS receipts_read ON storage.objects;
DROP POLICY IF EXISTS receipts_upload ON storage.objects;
CREATE POLICY receipts_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='receipts' AND public.office_role() IS NOT NULL);
CREATE POLICY receipts_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='receipts' AND public.office_role() IS NOT NULL AND (storage.foldername(name))[1]=auth.uid()::text);

DO $$ DECLARE t TEXT; BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['tasks','companies','team_members','task_catalog','audit_logs'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
      END IF;
    END LOOP;
  END IF;
END $$;
COMMIT;
