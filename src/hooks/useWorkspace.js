import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { checked, loadWorkspace, companyToDb, saveTask, taskToDb } from '../lib/workspaceApi.js';
import { createNextCycleTask } from '../utils/recurrence.js';
import { newId } from '../utils/dates.js';
import { uniqueNewTasks } from '../utils/tasks.js';

const empty = () => ({ tasks: [], companies: [], team: [], taskCatalog: [], logs: [] });

export function useWorkspace() {
  const [data, setData] = useState(empty);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [dbStatus, setDbStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const fetchSequence = useRef(0);
  const authId = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (authId.current !== session?.user?.id) {
        generation.current++;
        authId.current = session?.user?.id || null;
        setData(empty());
        setDbStatus('connecting');
      }
      setAuthUser(session?.user || null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!authUser) return;
    const currentGeneration = generation.current;
    const sequence = ++fetchSequence.current;
    try {
      const next = await loadWorkspace();
      if (currentGeneration !== generation.current || sequence !== fetchSequence.current) return;
      const member = next.team.find(m => m.email?.toLowerCase() === authUser.email?.toLowerCase());
      if (!member) throw new Error('Seu acesso não está autorizado. Solicite o cadastro ao gestor.');
      setData(next);
      setDbStatus('connected');
    } catch (err) {
      if (currentGeneration === generation.current && sequence === fetchSequence.current) {
        setDbStatus('error');
        setError(err.message);
        if (err.message.includes('não está autorizado')) setData(empty());
      }
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !supabase) return;
    refresh();
    let timer;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 250); };
    const channel = supabase.channel(`workspace-${authUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, schedule).subscribe();
    window.addEventListener('focus', schedule);
    const poll = setInterval(schedule, 30000);
    return () => {
      clearTimeout(timer); clearInterval(poll);
      window.removeEventListener('focus', schedule);
      supabase.removeChannel(channel);
    };
  }, [authUser, refresh]);

  const userSession = authUser && data.team.find(m => m.email?.toLowerCase() === authUser.email?.toLowerCase());
  const canManage = userSession?.role === 'Gestor';

  async function mutate(operation, managerOnly = false) {
    if (lock.current) { setError('Aguarde a gravação em andamento.'); return false; }
    if (!authUser || dbStatus !== 'connected') { setError('Conecte-se ao servidor antes de alterar os dados.'); return false; }
    if (managerOnly && !canManage) { setError('Esta ação é permitida somente ao gestor.'); return false; }
    lock.current = true; setBusy(true); setError('');
    try { await operation(); await refresh(); return true; }
    catch (err) { setError(`Não foi possível concluir: ${err.message}`); return false; }
    finally { lock.current = false; setBusy(false); }
  }

  const actions = {
    handleAddTask: task => mutate(() => saveTask({ ...task, id: newId(), version: 0 })),
    handleUpdateTask: (id, fields) => mutate(async () => {
      const old = data.tasks.find(t => t.id === id);
      if (!old) throw new Error('Tarefa não encontrada. Atualize a página.');
      const task = { ...old, ...fields, id, version: fields.version ?? old.version };
      const next = task.status === 'Concluído' && old.status !== 'Concluído' && task.isRecurring ? createNextCycleTask(task) : null;
      await saveTask(task, next);
    }),
    handleRenewTask: task => mutate(async () => {
      const next = createNextCycleTask(task);
      if (!uniqueNewTasks([next], data.tasks).length) throw new Error('A próxima competência já existe.');
      await saveTask(next);
    }),
    handleDeleteTask: id => mutate(() => checked(supabase.from('tasks').delete().eq('id', id).select('id').single()), true),
    handleClearAllTasks: () => window.confirm('Excluir todas as tarefas?') ? mutate(() => checked(supabase.from('tasks').delete().neq('id', '')), true) : false,
    handleTriggerAutomation: tasks => mutate(async () => {
      const pending = uniqueNewTasks(tasks, data.tasks);
      if (!pending.length) throw new Error('As tarefas desta competência já foram criadas.');
      await checked(supabase.rpc('create_task_batch', { p_tasks: pending.map(taskToDb) }));
    }),
    handleAddCompany: c => mutate(() => checked(supabase.from('companies').insert(companyToDb({ ...c, id: newId() })))),
    handleUpdateCompany: (id, fields) => mutate(() => checked(supabase.from('companies').update(companyToDb({ ...data.companies.find(c => c.id === id), ...fields, id })).eq('id', id).select('id').single())),
    handleDeleteCompany: id => mutate(() => checked(supabase.from('companies').delete().eq('id', id).select('id').single()), true),
    handleAddTaskToCatalog: task => mutate(() => checked(supabase.from('task_catalog').insert({ id: newId(), data: task }))),
    handleUpdateCatalogTask: (id, fields) => mutate(() => checked(supabase.from('task_catalog').update({ data: { ...data.taskCatalog.find(t => t.id === id), ...fields } }).eq('id', id).select('id').single())),
    handleDeleteCatalogTask: id => mutate(() => checked(supabase.from('task_catalog').delete().eq('id', id).select('id').single()), true),
    handleAddTeamMember: m => mutate(() => checked(supabase.from('team_members').insert({ ...m, email: m.email.toLowerCase().trim(), id: newId() })), true),
    handleUpdateTeamMember: (id, m) => mutate(() => checked(supabase.from('team_members').update({ name: m.name, role: m.role, email: m.email.toLowerCase().trim() }).eq('id', id).select('id').single()), true),
    handleDeleteTeamMember: id => mutate(async () => {
      if (id === userSession.id) throw new Error('Você não pode remover seu próprio acesso.');
      await checked(supabase.from('team_members').delete().eq('id', id).select('id').single());
    }, true),
    handleAssignCompaniesToUser: (name, ids) => mutate(() => checked(supabase.rpc('assign_companies', { p_name: name, p_ids: ids })), true),
  };

  async function handleLogin({ email, password }) {
    if (!supabase) throw new Error('O administrador ainda precisa configurar o serviço de acesso.');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) throw new Error('E-mail ou senha inválidos, ou acesso indisponível.');
  }

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' });
    if (logoutError) { setError(logoutError.message); return; }
    setError('');
  }

  return { ...data, ...actions, userSession, authUser, authReady, dbStatus, error, busy, canManage,
    handleLogin, handleLogout, fetchSupabaseData: refresh, dismissError: () => setError('') };
}
