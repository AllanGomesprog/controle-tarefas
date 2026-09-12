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

-- Inserir membros padrão da equipe se a tabela estiver vazia
INSERT INTO public.team_members (id, name, role, email)
VALUES 
    ('usr-1', 'Alan Gomes', 'Gestor', 'alan@gestaocontabil.com.br'),
    ('usr-2', 'Lucas', 'Coordenador', 'lucas@gestaocontabil.com.br'),
    ('usr-3', 'Fernanda', 'Analista', 'fernanda@gestaocontabil.com.br'),
    ('usr-4', 'Gabriela', 'Assistente', 'gabriela@gestaocontabil.com.br')
ON CONFLICT (id) DO NOTHING;

-- Inserir empresas clientes iniciais de exemplo
INSERT INTO public.companies (id, name, razao_social, nome_fantasia, cnpj, regime, default_assignee, status, obligations, notes)
VALUES 
    ('comp-1', 'Alpha Empreendimentos', 'Alpha Empreendimentos e Participações Ltda', 'Alpha Empreendimentos', '12.345.678/0001-90', 'Simples Nacional', 'Fernanda', 'Ativa', '["DAS Simples Nacional", "Folha de Pagamento / FGTS Digital", "DEFIS / Declaração Anual"]'::jsonb, 'Cliente prioritário do escritório'),
    ('comp-2', 'Silva & Associados ME', 'Silva e Associados Serviços Contábeis ME', 'Silva & Associados ME', '23.456.789/0001-01', 'Simples Nacional', 'Fernanda', 'Ativa', '["DAS Simples Nacional", "Folha de Pagamento / FGTS Digital"]'::jsonb, 'Anexo III do Simples Nacional'),
    ('comp-3', 'Metalúrgica Alfa S.A.', 'Indústria Metalúrgica Alfa S.A.', 'Metalúrgica Alfa', '34.567.890/0001-12', 'Lucro Presumido', 'Lucas', 'Ativa', '["SPED Fiscal (ICMS/IPI)", "SPED Contribuições (PIS/COFINS)", "DCTFWeb / EFD-Reinf", "Folha de Pagamento / FGTS Digital"]'::jsonb, 'Obrigação de transmissão mensal do SPED Fiscal e Contribuições até o dia 15')
ON CONFLICT (id) DO NOTHING;

-- Habilitar Políticas de Acesso Público
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total a empresas" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a tarefas" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total a membros da equipe" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

-- Ativar Publicação em Tempo Real (Supabase Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
