import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migração, RLS, auditoria, recibos, concorrência e geração atômica', async () => {
  const db = new PGlite();
  const manager = '11111111-1111-4111-8111-111111111111';
  const analyst = '22222222-2222-4222-8222-222222222222';
  const outsider = '33333333-3333-4333-8333-333333333333';
  const schema = await readFile(new URL('../supabase_schema.sql',import.meta.url),'utf8');
  try {
    // Supabase-owned schemas are represented locally; application SQL runs unchanged.
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,is_anonymous BOOLEAN DEFAULT false);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;
      CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
      CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(),bucket_id TEXT,name TEXT);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT SELECT,INSERT ON storage.objects TO authenticated;
      CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql AS $$ SELECT string_to_array(name,'/') $$;
    `);
    // Simulate the old public policy before applying the migration.
    await db.exec(`CREATE TABLE public.team_members(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,email TEXT);
      ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.team_members TO anon;
      CREATE POLICY "Acesso total a membros da equipe" ON public.team_members FOR ALL USING(true) WITH CHECK(true);`);
    await db.exec(schema);
    await db.exec(schema); // Reapplying must not fail on policies/publications.
    await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ($1,$2,now()),($3,$4,now()),($5,$6,now())', [manager,'gestor@example.test',analyst,'analista@example.test',outsider,'fora@example.test']);
    await db.exec("INSERT INTO public.team_members(id,name,role,email) VALUES ('m1','Gestor','Gestor','gestor@example.test'),('m2','Analista','Analista','analista@example.test')");
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT * FROM public.tasks'), /permission denied/);
    await assert.rejects(db.query("SELECT public.save_task('{}',null)"), /permission denied/);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    const identity = id => db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);
    await identity(outsider);
    assert.equal((await db.query('SELECT * FROM public.team_members')).rows.length,0);
    await assert.rejects(db.query("SELECT public.save_task('{}',null)"), /não autorizado/);
    await identity(analyst);
    assert.equal((await db.query('SELECT * FROM public.team_members')).rows.length,2);
    await assert.rejects(db.query("INSERT INTO public.team_members VALUES ('hack','Hack','Gestor','hack@example.test')"), /row-level security/);
    await assert.rejects(db.query("SELECT public.insert_task_internal('{}',false)"), /permission denied/);
    // An existing allowlisted email still needs a confirmed, non-anonymous identity.
    await db.exec('RESET ROLE');
    await db.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1',[analyst]);
    await db.exec('SET ROLE authenticated');
    assert.equal((await db.query('SELECT * FROM public.team_members')).rows.length,0);
    await db.exec('RESET ROLE');
    await db.query('UPDATE auth.users SET email_confirmed_at=now(),is_anonymous=true WHERE id=$1',[analyst]);
    await db.exec('SET ROLE authenticated');
    assert.equal((await db.query('SELECT * FROM public.team_members')).rows.length,0);
    await db.exec('RESET ROLE');
    await db.query('UPDATE auth.users SET is_anonymous=false WHERE id=$1',[analyst]);
    await db.exec('SET ROLE authenticated');
    const task = { id:'t1',title:'Rotina - Setembro / 2026',client:'Cliente',assignee:'Analista',due_date:'2026-10-10',competencia:'09/2026',priority:'Média',status:'Pendente',checklist:[],type:'custom',is_recurring:true,recurrence_frequency:'Mensal',recurrence_day:10,version:0 };
    const save = (row,next=null) => db.query('SELECT public.save_task($1::jsonb,$2::jsonb)',[JSON.stringify(row),next ? JSON.stringify(next) : null]);
    await save(task);
    assert.equal((await db.query('SELECT version FROM public.tasks WHERE id=$1',['t1'])).rows[0].version,1);
    await assert.rejects(save({...task,id:'duplicate'}),/Já existe/);
    await assert.rejects(save({...task,version:99}),/outra pessoa/);
    await assert.rejects(db.query("UPDATE public.tasks SET title='bypass'"),/permission denied/);
    const next = {...task,id:'t2',title:'Rotina - Outubro / 2026',competencia:'10/2026',due_date:'2026-11-10'};
    await assert.rejects(save({...task,version:1,status:'Concluído'},{...next,due_date:'2026-02-31'}),/out of range/);
    assert.equal((await db.query('SELECT status FROM public.tasks WHERE id=$1',['t1'])).rows[0].status,'Pendente');
    await save({...task,version:1,status:'Concluído'},next);
    assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length,2);
    await db.query('SELECT public.create_task_batch($1::jsonb)',[JSON.stringify([{...next,id:'duplicate-batch'}])]);
    assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length,2);
    const logs=(await db.query("SELECT * FROM public.audit_logs WHERE action='tasks: INSERT'")).rows;
    assert.equal(logs.length,2); assert.equal(logs[0].user_name,'Analista (Analista)'); assert.equal(logs[0].ip,null);
    await assert.rejects(db.query('DELETE FROM public.audit_logs'),/permission denied/);
    assert.equal((await db.query('DELETE FROM public.tasks RETURNING id')).rows.length,0);
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['receipts',manager+'/t1/file']),/row-level security/);
    await db.query('INSERT INTO storage.objects(bucket_id,name) VALUES ($1,$2)',['receipts',analyst+'/t1/file']);
    await identity(outsider);
    assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0);
    await identity(manager);
    await db.exec("UPDATE public.team_members SET name='Novo Analista' WHERE id='m2'");
    assert.equal((await db.query("SELECT assignee FROM public.tasks WHERE id='t1'")).rows[0].assignee,'Novo Analista');
    await assert.rejects(db.query("DELETE FROM public.team_members WHERE id='m1'"),/pelo menos um gestor/);
    await db.exec("DELETE FROM public.team_members WHERE id='m2'");
    await identity(analyst);
    assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length,0);
    await assert.rejects(save({...task,id:'revoked'}),/não autorizado/);
    await db.exec('RESET ROLE');
    await db.exec(schema); // Existing real records also survive reapplication.
    assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length,2);
  } finally { await db.close(); }
});
