import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Settings, 
  Users, 
  History, 
  User, 
  Bell,
  Database,
  CloudCheck,
  AlertCircle,
  RefreshCw,
  Building2,
  LogOut,
  Layers,
  ClipboardList,
  Sun,
  Moon
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { createNextCycleTask } from './utils/recurrence';

// Components
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import TaskList from './components/TaskList';
import TaskCatalog from './components/TaskCatalog';
import AutomationTemplates from './components/AutomationTemplates';
import TeamManagement from './components/TeamManagement';
import AuditLog from './components/AuditLog';
import CompanyManagement from './components/CompanyManagement';
import LoginScreen from './components/LoginScreen';
import Logo from './components/Logo';
import ThemeToggle from './components/ThemeToggle';

// Initial Team Members
const INITIAL_TEAM = [
  { id: 'usr-1', name: 'Alan Gomes', role: 'Gestor', email: 'alan@gestaocontabil.com.br' },
  { id: 'usr-2', name: 'Lucas', role: 'Coordenador', email: 'lucas@gestaocontabil.com.br' },
  { id: 'usr-3', name: 'Fernanda', role: 'Analista', email: 'fernanda@gestaocontabil.com.br' },
  { id: 'usr-4', name: 'Gabriela', role: 'Assistente', email: 'gabriela@gestaocontabil.com.br' }
];

// Initial Client Companies
const INITIAL_COMPANIES = [
  {
    id: 'comp-1',
    name: 'Alpha Empreendimentos Ltda',
    razaoSocial: 'Alpha Empreendimentos e Participações Ltda',
    nomeFantasia: 'Alpha Empreendimentos',
    cnpj: '12.345.678/0001-90',
    regime: 'Simples Nacional',
    defaultAssignee: 'Fernanda',
    status: 'Ativa',
    notes: 'Cliente prioritário. Inscrição Estadual: 112.334.455.110'
  },
  {
    id: 'comp-2',
    name: 'Silva & Associados ME',
    razaoSocial: 'Silva e Associados Serviços Contábeis ME',
    nomeFantasia: 'Silva & Associados ME',
    cnpj: '23.456.789/0001-01',
    regime: 'Simples Nacional',
    defaultAssignee: 'Fernanda',
    status: 'Ativa',
    notes: 'Anexo III do Simples Nacional'
  },
  {
    id: 'comp-3',
    name: 'Metalúrgica Alfa S.A.',
    razaoSocial: 'Indústria Metalúrgica Alfa S.A.',
    nomeFantasia: 'Metalúrgica Alfa',
    cnpj: '34.567.890/0001-12',
    regime: 'Lucro Presumido',
    defaultAssignee: 'Lucas',
    status: 'Ativa',
    notes: 'Obrigação de entrega de SPED Fiscal até dia 15 de cada mês'
  },
  {
    id: 'comp-4',
    name: 'Comercial Norte Distribuidora Ltda',
    razaoSocial: 'Comercial Norte Atacadista e Distribuidora Ltda',
    nomeFantasia: 'Norte Distribuidora',
    cnpj: '45.678.901/0001-23',
    regime: 'Lucro Real',
    defaultAssignee: 'Lucas',
    status: 'Ativa',
    notes: 'Apuração trimestral de IRPJ/CSLL e mensal de PIS/COFINS e ICMS'
  },
  {
    id: 'comp-5',
    name: 'Barbearia Silva MEI',
    razaoSocial: 'Carlos Silva Serviços MEI',
    nomeFantasia: 'Barbearia Silva MEI',
    cnpj: '56.789.012/0001-34',
    regime: 'MEI',
    defaultAssignee: 'Gabriela',
    status: 'Ativa',
    notes: 'Guia DAS-MEI com emissão mensal fixa'
  }
];

// Initial Tasks (starts clean, user creates whatever tasks they want)
const INITIAL_TASKS = [];

const INITIAL_LOGS = [
  {
    id: 'log-1',
    timestamp: '2026-09-07T09:15:30.000Z',
    user: 'Alan Gomes (Gestor)',
    action: 'Criação de tarefa',
    details: 'Criou a rotina mensal para Metalúrgica Alfa',
    ip: '192.168.1.10',
    userAgent: 'Mozilla/5.0 Chrome/120.0'
  },
  {
    id: 'log-2',
    timestamp: '2026-09-07T09:45:12.000Z',
    user: 'Lucas (Coordenador)',
    action: 'Anexo de recibo',
    details: 'Anexou o recibo oficial do SPED Fiscal da Metalúrgica Alfa sob protocolo SPED-2026-BR-991823',
    ip: '192.168.1.11',
    userAgent: 'Mozilla/5.0 Chrome/120.0'
  }
];

// Helper to map DB row to Client Task
const mapDbTaskToClient = (row) => ({
  id: row.id,
  title: row.title,
  client: row.client,
  companyId: row.company_id || '',
  assignee: row.assignee,
  dueDate: row.due_date,
  competencia: row.competencia || '',
  competenciaLabel: row.competencia_label || '',
  priority: row.priority,
  description: row.description || '',
  status: row.status,
  checklist: Array.isArray(row.checklist) ? row.checklist : [],
  type: row.type || 'custom',
  receiptProtocol: row.receipt_protocol || '',
  receiptDate: row.receipt_date || '',
  receiptFileName: row.receipt_file_name || '',
  receiptFileData: row.receipt_file_data || '',
  hasReceipt: Boolean(row.receipt_protocol || row.receipt_file_name),
  isRecurring: Boolean(row.is_recurring),
  recurrenceFrequency: row.recurrence_frequency || 'Mensal',
  recurrenceDay: row.recurrence_day ? parseInt(row.recurrence_day, 10) : null
});

// Helper to map Client Task to DB row
const mapClientTaskToDb = (task) => ({
  id: task.id,
  title: task.title,
  client: task.client,
  company_id: task.companyId || null,
  assignee: task.assignee,
  due_date: task.dueDate,
  competencia: task.competencia || null,
  competencia_label: task.competenciaLabel || null,
  priority: task.priority,
  description: task.description,
  status: task.status,
  checklist: task.checklist || [],
  type: task.type || 'custom',
  receipt_protocol: task.receiptProtocol || null,
  receipt_date: task.receiptDate || null,
  receipt_file_name: task.receiptFileName || null,
  receipt_file_data: task.receiptFileData || null,
  is_recurring: Boolean(task.isRecurring),
  recurrence_frequency: task.recurrenceFrequency || 'Mensal',
  recurrence_day: task.recurrenceDay || null
});

// Utilitário para resgatar dados salvos em versões anteriores de forma compatível
const getStoredData = (key, suffix) => {
  const direct = localStorage.getItem(key);
  if (direct) return direct;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.endsWith(`_${suffix}`)) return localStorage.getItem(k);
    }
  } catch (e) {
    // ignore
  }
  return null;
};

export default function App() {
  // Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => {
    const saved = getStoredData('controle_theme', 'theme');
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('controle_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Authentication State
  const [userSession, setUserSession] = useState(() => {
    const saved = getStoredData('controle_session', 'session');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [dbStatus, setDbStatus] = useState(isSupabaseConfigured ? 'connecting' : 'local');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // App States
  const [tasks, setTasks] = useState(() => {
    const saved = getStoredData('controle_tasks', 'tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Se continha apenas as tarefas mock de demonstração antigas, inicia limpo
        const isLegacyMockOnly = Array.isArray(parsed) && parsed.length > 0 && parsed.every(t => ['tsk-1', 'tsk-2', 'tsk-3'].includes(t.id));
        if (isLegacyMockOnly) {
          localStorage.setItem('controle_tasks', JSON.stringify([]));
          return [];
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return INITIAL_TASKS;
  });
  
  const [logs, setLogs] = useState(() => {
    const saved = getStoredData('controle_logs', 'logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [companies, setCompanies] = useState(() => {
    const saved = getStoredData('controle_companies', 'companies');
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });

  const [taskCatalog, setTaskCatalog] = useState(() => {
    const saved = getStoredData('controle_task_catalog', 'task_catalog');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedCatalogTaskId, setSelectedCatalogTaskId] = useState(null);

  const [team, setTeam] = useState(() => {
    const saved = getStoredData('controle_team', 'team');
    return saved ? JSON.parse(saved) : INITIAL_TEAM;
  });

  // Active User representation
  const currentUser = userSession 
    ? `${userSession.name} (${userSession.role})` 
    : `${INITIAL_TEAM[0].name} (${INITIAL_TEAM[0].role})`;

  // Calendar click bridge state
  const [prefilledDate, setPrefilledDate] = useState(null);

  // LocalStorage Sync
  useEffect(() => {
    localStorage.setItem('controle_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('controle_task_catalog', JSON.stringify(taskCatalog));
  }, [taskCatalog]);

  useEffect(() => {
    localStorage.setItem('controle_team', JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    localStorage.setItem('controle_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('controle_companies', JSON.stringify(companies));
  }, [companies]);

  // Handle Login & Logout
  const handleLogin = (userData) => {
    setUserSession(userData);
    if (userData.remember) {
      localStorage.setItem('controle_session', JSON.stringify(userData));
    }
    addAuditLog('Login no sistema', `Usuário ${userData.name} (${userData.role}) iniciou sessão no sistema`);
  };

  const handleLogout = () => {
    addAuditLog('Logout do sistema', `Usuário ${currentUser} encerrou a sessão`);
    localStorage.removeItem('controle_session');
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.endsWith('_session')) localStorage.removeItem(k);
      }
    } catch (e) {
      // ignore
    }
    setUserSession(null);
  };

  // Fetch initial data from Supabase if configured
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setDbStatus('local');
      return;
    }

    try {
      setDbStatus('connecting');
      
      // Fetch Tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks.map(mapDbTaskToClient));
      }

      // Fetch Companies
      const { data: dbCompanies, error: compError } = await supabase
        .from('companies')
        .select('*');

      if (!compError && dbCompanies && dbCompanies.length > 0) {
        setCompanies(dbCompanies.map(c => ({
          id: c.id,
          name: c.name,
          razaoSocial: c.razao_social || c.name,
          nomeFantasia: c.nome_fantasia || c.name,
          cnpj: c.cnpj,
          regime: c.regime,
          defaultAssignee: c.default_assignee,
          status: c.status,
          notes: c.notes,
          obligations: Array.isArray(c.obligations) ? c.obligations : []
        })));
      }

      // Fetch Logs
      const { data: dbLogs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (dbLogs && dbLogs.length > 0) {
        setLogs(dbLogs.map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          user: l.user_name,
          action: l.action,
          details: l.details,
          ip: l.ip,
          userAgent: l.user_agent
        })));
      }

      // Fetch Team
      const { data: dbTeam } = await supabase.from('team_members').select('*');
      if (dbTeam && dbTeam.length > 0) {
        setTeam(dbTeam);
      }

      setDbStatus('connected');
    } catch (err) {
      console.warn('Supabase local fallback:', err.message);
      setDbStatus('error');
    }
  }, []);

  // Initialize and listen to Realtime updates
  useEffect(() => {
    fetchSupabaseData();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newTask = mapDbTaskToClient(payload.new);
              setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapDbTaskToClient(payload.new);
              setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.filter(t => t.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchSupabaseData]);

  // Log Generator Helper
  const addAuditLog = async (action, details) => {
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser,
      action: action,
      details: details,
      ip: '192.168.1.88',
      userAgent: navigator.userAgent
    };
    
    setLogs(prev => [newLog, ...prev]);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('audit_logs').insert([{
          id: newLog.id,
          timestamp: newLog.timestamp,
          user_name: newLog.user,
          action: newLog.action,
          details: newLog.details,
          ip: newLog.ip,
          user_agent: newLog.userAgent
        }]);
      } catch (e) {
        console.error('Erro log Supabase:', e);
      }
    }
  };

  // Task Operations
  const handleAddTask = async (taskData) => {
    const newTask = {
      ...taskData,
      id: `tsk-${Date.now()}`
    };
    
    setTasks(prev => [newTask, ...prev]);
    addAuditLog('Criação de tarefa', `Criou a tarefa "${newTask.title}" atribuída a ${newTask.assignee} para o cliente ${newTask.client}`);
    setPrefilledDate(null);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('tasks').insert([mapClientTaskToDb(newTask)]);
      } catch (e) {
        console.error('Erro criar tarefa no Supabase:', e);
      }
    }
  };

  const handleUpdateTask = async (id, updatedFields, customLogMsg = null) => {
    let updatedTask = null;
    let autoNextRecurringTask = null;
    
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      updatedTask = { ...target, ...updatedFields };

      // Se a tarefa foi marcada como Concluída e possui recorrência ativa
      if (
        updatedFields.status === 'Concluído' && 
        target.status !== 'Concluído' && 
        updatedTask.isRecurring
      ) {
        const nextCycle = createNextCycleTask(updatedTask);
        // Evita duplicar se já foi gerada para aquela data
        const alreadyExists = prev.some(t => 
          t.client === nextCycle.client && 
          t.title === nextCycle.title && 
          t.dueDate === nextCycle.dueDate
        );
        if (!alreadyExists) {
          autoNextRecurringTask = nextCycle;
        }
      }

      if (customLogMsg) {
        addAuditLog('Alteração de tarefa', customLogMsg);
      } else {
        addAuditLog('Atualização de dados', `Atualizou informações da tarefa "${target.title}"`);
      }

      const updatedList = prev.map(t => t.id === id ? updatedTask : t);
      if (autoNextRecurringTask) {
        return [autoNextRecurringTask, ...updatedList];
      }
      return updatedList;
    });

    if (autoNextRecurringTask) {
      addAuditLog(
        'Renovação de Recorrência', 
        `Gerou automaticamente a próxima competência de "${autoNextRecurringTask.title}" com vencimento em ${autoNextRecurringTask.dueDate}`
      );
      if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
        try {
          await supabase.from('tasks').insert([mapClientTaskToDb(autoNextRecurringTask)]);
        } catch (e) {
          console.error('Erro salvar recorrência Supabase:', e);
        }
      }
    }

    if (isSupabaseConfigured && supabase && dbStatus === 'connected' && updatedTask) {
      try {
        await supabase
          .from('tasks')
          .update(mapClientTaskToDb(updatedTask))
          .eq('id', id);
      } catch (e) {
        console.error('Erro atualizar tarefa Supabase:', e);
      }
    }
  };

  // Renovar competência de tarefa manualmente
  const handleRenewTask = async (task) => {
    const nextTask = createNextCycleTask(task);
    const exists = tasks.find(t => 
      t.client === nextTask.client && 
      t.title === nextTask.title && 
      t.dueDate === nextTask.dueDate
    );
    if (exists) {
      alert(`A tarefa da próxima competência ("${nextTask.title}") já está agendada para ${nextTask.dueDate}.`);
      return;
    }
    await handleAddTask(nextTask);
    alert(`Sucesso! A próxima competência da tarefa "${nextTask.title}" foi agendada para ${nextTask.dueDate}.`);
  };

  const handleDeleteTask = async (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    
    setTasks(prev => prev.filter(t => t.id !== id));
    addAuditLog('Remoção de tarefa', `Excluiu a tarefa "${taskToDelete.title}"`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('tasks').delete().eq('id', id);
      } catch (e) {
        console.error('Erro deletar tarefa Supabase:', e);
      }
    }
  };

  const handleClearAllTasks = async () => {
    if (window.confirm('Deseja realmente excluir todas as tarefas cadastradas? O painel ficará completamente limpo.')) {
      setTasks([]);
      localStorage.setItem('controle_tasks', JSON.stringify([]));
      addAuditLog('Limpeza de Tarefas', `Usuário ${currentUser} removeu todas as tarefas cadastradas`);

      if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
        try {
          await supabase.from('tasks').delete().neq('id', '0');
        } catch (e) {
          console.error('Erro limpar tarefas Supabase:', e);
        }
      }
    }
  };

  // Company Operations
  const handleAddCompany = async (companyData) => {
    const newCompany = {
      ...companyData,
      id: `comp-${Date.now()}`
    };
    setCompanies(prev => [newCompany, ...prev]);
    addAuditLog('Cadastro de Empresa', `Cadastrou nova empresa cliente "${newCompany.nomeFantasia || newCompany.razaoSocial}" (CNPJ: ${newCompany.cnpj})`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('companies').insert([{
          id: newCompany.id,
          name: newCompany.name,
          razao_social: newCompany.razaoSocial,
          nome_fantasia: newCompany.nomeFantasia,
          cnpj: newCompany.cnpj,
          regime: newCompany.regime,
          default_assignee: newCompany.defaultAssignee,
          status: newCompany.status,
          notes: newCompany.notes,
          obligations: newCompany.obligations
        }]);
      } catch (e) {
        console.error('Erro salvar empresa no Supabase:', e);
      }
    }
  };

  const handleUpdateCompany = async (id, updatedFields) => {
    let updated = null;
    setCompanies(prev => prev.map(c => {
      if (c.id === id) {
        updated = { ...c, ...updatedFields };
        return updated;
      }
      return c;
    }));

    addAuditLog('Alteração de Empresa', `Atualizou dados cadastrais da empresa "${updated?.nomeFantasia || updated?.razaoSocial}"`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected' && updated) {
      try {
        await supabase.from('companies').update({
          name: updated.name,
          razao_social: updated.razaoSocial,
          nome_fantasia: updated.nomeFantasia,
          cnpj: updated.cnpj,
          regime: updated.regime,
          default_assignee: updated.defaultAssignee,
          status: updated.status,
          notes: updated.notes,
          obligations: updated.obligations
        }).eq('id', id);
      } catch (e) {
        console.error('Erro atualizar empresa no Supabase:', e);
      }
    }
  };

  const handleDeleteCompany = async (id) => {
    const compToDelete = companies.find(c => c.id === id);
    if (!compToDelete) return;

    setCompanies(prev => prev.filter(c => c.id !== id));
    addAuditLog('Remoção de Empresa', `Removeu o cadastro da empresa "${compToDelete.nomeFantasia || compToDelete.razaoSocial}"`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('companies').delete().eq('id', id);
      } catch (e) {
        console.error('Erro deletar empresa no Supabase:', e);
      }
    }
  };

  // Trigger monthly automation routines
  const handleTriggerAutomation = async (newTasksList, monthName) => {
    setTasks(prev => [...newTasksList, ...prev]);
    addAuditLog('Disparo de automação', `Gerou e distribuiu automaticamente ${newTasksList.length} rotinas recorrentes de contabilidade para ${monthName}`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        const dbTasks = newTasksList.map(mapClientTaskToDb);
        await supabase.from('tasks').insert(dbTasks);
      } catch (e) {
        console.error('Erro gerar rotinas em lote no Supabase:', e);
      }
    }
  };

  // Clear Audit Logs
  const handleClearLogs = async () => {
    if (confirm('Atenção: Esta ação limpa o histórico de auditoria. Deseja continuar?')) {
      const clearLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentUser,
        action: 'Limpeza de logs',
        details: 'Limpou o histórico de auditoria de segurança do sistema.',
        ip: '192.168.1.88',
        userAgent: navigator.userAgent
      };
      setLogs([clearLog]);

      if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
        try {
          await supabase.from('audit_logs').delete().neq('id', '0');
          await supabase.from('audit_logs').insert([{
            id: clearLog.id,
            timestamp: clearLog.timestamp,
            user_name: clearLog.user,
            action: clearLog.action,
            details: clearLog.details,
            ip: clearLog.ip,
            user_agent: clearLog.userAgent
          }]);
        } catch (e) {
          console.error('Erro limpar logs Supabase:', e);
        }
      }
    }
  };

  // Task Catalog Operations (Rotinas e Modelos Livres)
  const handleAddTaskToCatalog = (taskData) => {
    const newCatalogTask = {
      ...taskData,
      id: `cat-${Date.now()}`
    };
    setTaskCatalog(prev => [newCatalogTask, ...prev]);
    addAuditLog('Cadastro de Tarefa / Rotina', `Cadastrou a rotina "${newCatalogTask.title}" no catálogo de tarefas`);
    return newCatalogTask;
  };

  const handleUpdateCatalogTask = (id, updatedFields) => {
    setTaskCatalog(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    addAuditLog('Atualização do Catálogo', `Atualizou a rotina "${updatedFields.title || id}" no catálogo`);
  };

  const handleDeleteCatalogTask = (id) => {
    const taskToDelete = taskCatalog.find(t => t.id === id);
    setTaskCatalog(prev => prev.filter(t => t.id !== id));
    addAuditLog('Remoção do Catálogo', `Removeu a rotina "${taskToDelete?.title || id}" do catálogo de tarefas`);
  };

  const handleNavigateToLinking = (catalogTaskId = null) => {
    setSelectedCatalogTaskId(catalogTaskId);
    setCurrentView('automation');
  };

  // Team Operations
  const handleAddTeamMember = async (memberData) => {
    const newMember = {
      ...memberData,
      id: `usr-${Date.now()}`
    };
    setTeam(prev => [...prev, newMember]);
    addAuditLog('Cadastro de Usuário', `Cadastrou o colaborador "${newMember.name}" (${newMember.role})`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('team_members').insert([{
          id: newMember.id,
          name: newMember.name,
          role: newMember.role,
          email: newMember.email || null
        }]);
      } catch (e) {
        console.error('Erro salvar usuário no Supabase:', e);
      }
    }
    return newMember;
  };

  const handleUpdateTeamMember = async (id, updatedFields) => {
    let updated = null;
    const oldMember = team.find(m => m.id === id);
    setTeam(prev => prev.map(m => {
      if (m.id === id) {
        updated = { ...m, ...updatedFields };
        return updated;
      }
      return m;
    }));

    // Se o nome do usuário mudou, reflete nas empresas e tarefas
    if (oldMember && updatedFields.name && oldMember.name !== updatedFields.name) {
      setCompanies(prev => prev.map(c => c.defaultAssignee === oldMember.name ? { ...c, defaultAssignee: updatedFields.name } : c));
      setTasks(prev => prev.map(t => t.assignee === oldMember.name ? { ...t, assignee: updatedFields.name } : t));
    }

    addAuditLog('Atualização de Usuário', `Atualizou dados do usuário "${updated?.name || id}" (${updated?.role})`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected' && updated) {
      try {
        await supabase.from('team_members').update({
          name: updated.name,
          role: updated.role,
          email: updated.email || null
        }).eq('id', id);
      } catch (e) {
        console.error('Erro atualizar membro no Supabase:', e);
      }
    }
  };

  const handleDeleteTeamMember = async (id) => {
    const memberToDelete = team.find(m => m.id === id);
    if (!memberToDelete) return;

    if (userSession && (userSession.id === id || userSession.name === memberToDelete.name)) {
      alert('Você não pode excluir o usuário conectado nesta sessão ativa.');
      return;
    }

    if (team.length <= 1) {
      alert('O sistema precisa de pelo menos 1 usuário cadastrado.');
      return;
    }

    // Desvincula o usuário excluído das empresas que estavam com ele
    setCompanies(prev => prev.map(c => c.defaultAssignee === memberToDelete.name ? { ...c, defaultAssignee: '' } : c));
    setTeam(prev => prev.filter(m => m.id !== id));
    addAuditLog('Exclusão de Usuário', `Removeu o usuário "${memberToDelete.name}" (${memberToDelete.role}) da equipe`);

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        await supabase.from('team_members').delete().eq('id', id);
        await supabase.from('companies').update({ default_assignee: null }).eq('default_assignee', memberToDelete.name);
      } catch (e) {
        console.error('Erro excluir membro no Supabase:', e);
      }
    }
  };

  const handleAssignCompaniesToUser = async (userName, companyIdsToAssign) => {
    setCompanies(prev => prev.map(c => {
      const isSelected = companyIdsToAssign.includes(c.id);
      const isCurrentlyAssignedToThisUser = c.defaultAssignee === userName;

      if (isSelected) {
        return { ...c, defaultAssignee: userName };
      } else if (isCurrentlyAssignedToThisUser) {
        return { ...c, defaultAssignee: '' };
      }
      return c;
    }));

    addAuditLog(
      'Atribuição de Carteira', 
      `Atrelou ${companyIdsToAssign.length} empresa(s) cliente(s) ao colaborador "${userName}"`
    );

    if (isSupabaseConfigured && supabase && dbStatus === 'connected') {
      try {
        for (const compId of companyIdsToAssign) {
          await supabase.from('companies').update({ default_assignee: userName }).eq('id', compId);
        }
        const unassigned = companies.filter(c => c.defaultAssignee === userName && !companyIdsToAssign.includes(c.id));
        for (const comp of unassigned) {
          await supabase.from('companies').update({ default_assignee: null }).eq('id', comp.id);
        }
      } catch (e) {
        console.error('Erro atualizar carteira no Supabase:', e);
      }
    }
  };

  const handleAddTaskFromCalendar = (dateStr) => {
    setPrefilledDate(dateStr);
    setCurrentView('tasks');
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Painel de Controle';
      case 'taskCatalog': return 'Cadastro de Tarefas & Rotinas (Definição Pura)';
      case 'tasks': return 'Gestão de Tarefas & Recibos';
      case 'companies': return 'Cadastro de Empresas & Clientes';
      case 'calendar': return 'Calendário Tributário';
      case 'automation': return 'Atrelar Tarefas às Empresas & Recorrência';
      case 'team': return 'Controle de Equipe';
      case 'logs': return 'Protocolo de Segurança & Logs';
      default: return 'Controle de Tarefas';
    }
  };

  // If user is not logged in, render the Login Screen
  if (!userSession) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        team={team} 
        theme={theme} 
        setTheme={setTheme}
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section" style={{ padding: '0 4px 18px 4px', display: 'flex', justifyContent: 'center' }}>
          <Logo />
        </div>

        <nav>
          <ul className="nav-links">
            <li className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('dashboard'); setPrefilledDate(null); }}>
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            </li>
            <li className={`nav-item ${currentView === 'taskCatalog' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('taskCatalog'); setPrefilledDate(null); }}>
                <ClipboardList size={18} />
                Cadastro de Tarefas
              </button>
            </li>
            <li className={`nav-item ${currentView === 'companies' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('companies'); setPrefilledDate(null); }}>
                <Building2 size={18} />
                Empresas & Clientes
              </button>
            </li>
            <li className={`nav-item ${currentView === 'automation' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('automation'); setPrefilledDate(null); }}>
                <Layers size={18} />
                Atrelar às Empresas
              </button>
            </li>
            <li className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('tasks'); setPrefilledDate(null); }}>
                <CheckSquare size={18} />
                Tarefas & Recibos
              </button>
            </li>
            <li className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('calendar'); setPrefilledDate(null); }}>
                <CalendarDays size={18} />
                Calendário Prazos
              </button>
            </li>
            <li className={`nav-item ${currentView === 'team' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('team'); setPrefilledDate(null); }}>
                <Users size={18} />
                Equipe
              </button>
            </li>
            <li className={`nav-item ${currentView === 'logs' ? 'active' : ''}`}>
              <button onClick={() => { setCurrentView('logs'); setPrefilledDate(null); }}>
                <History size={18} />
                Histórico & Auditoria
              </button>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer - Appearance & Current Logged User */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 12px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Aparência</span>
            <ThemeToggle theme={theme} setTheme={setTheme} size="sm" />
          </div>

          <div className="user-badge" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                {userSession.name[0]}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {userSession.name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--primary-light)' }}>
                  {userSession.role}
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="btn btn-secondary btn-sm" 
              style={{ padding: '6px', minWidth: '30px', height: '30px' }}
              title="Encerrar Sessão (Sair)"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="main-content">
        {/* Header Topbar */}
        <header className="topbar">
          <div className="page-title">
            <h2>{getViewTitle()}</h2>
          </div>

          <div className="topbar-actions">
            {/* Theme Toggle Segmented Switch */}
            <ThemeToggle theme={theme} setTheme={setTheme} />

            {/* Database Status Pill */}
            <div 
              onClick={() => setShowConfigModal(true)} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '0.75rem', 
                fontWeight: '600',
                padding: '6px 12px',
                borderRadius: '50px',
                cursor: 'pointer',
                backgroundColor: dbStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: dbStatus === 'connected' ? 'var(--color-completed)' : 'var(--color-pending)',
                border: `1px solid ${dbStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}
              title="Clique para ver instruções de conexão do banco de dados"
            >
              <Database size={14} />
              <span>
                {dbStatus === 'connected' ? '🟢 Supabase Nuvem Ativo' : 
                 dbStatus === 'connecting' ? '🔄 Conectando...' : 
                 '🟠 Modo Local (Clique para Conectar Supabase)'}
              </span>
            </div>

            {/* User Session Info Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <User size={14} style={{ color: 'var(--primary-light)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{userSession.name}</span>
              <span className="badge priority-low" style={{ fontSize: '0.65rem' }}>{userSession.role}</span>
              <button 
                onClick={handleLogout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                title="Sair do Sistema"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {currentView === 'dashboard' && (
            <Dashboard 
              tasks={tasks} 
              logs={logs} 
              onViewChange={setCurrentView} 
              onUpdateTask={handleUpdateTask}
            />
          )}

          {currentView === 'taskCatalog' && (
            <TaskCatalog 
              taskCatalog={taskCatalog}
              team={team}
              onAddTaskToCatalog={handleAddTaskToCatalog}
              onUpdateCatalogTask={handleUpdateCatalogTask}
              onDeleteCatalogTask={handleDeleteCatalogTask}
              onNavigateToLinking={handleNavigateToLinking}
            />
          )}

          {currentView === 'tasks' && (
            <TaskList 
              tasks={tasks} 
              team={team}
              companies={companies}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onClearAllTasks={handleClearAllTasks}
              onRenewTask={handleRenewTask}
              onNavigateView={setCurrentView}
              onAddTaskToCatalog={handleAddTaskToCatalog}
              currentUser={currentUser}
              prefilledDate={prefilledDate}
            />
          )}

          {currentView === 'companies' && (
            <CompanyManagement 
              companies={companies}
              team={team}
              onAddCompany={handleAddCompany}
              onUpdateCompany={handleUpdateCompany}
              onDeleteCompany={handleDeleteCompany}
              currentUser={currentUser}
            />
          )}

          {currentView === 'automation' && (
            <AutomationTemplates 
              team={team}
              companies={companies}
              tasks={tasks}
              taskCatalog={taskCatalog}
              selectedCatalogTaskId={selectedCatalogTaskId}
              onTriggerAutomation={handleTriggerAutomation}
              onNavigateToCatalog={() => setCurrentView('taskCatalog')}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView 
              tasks={tasks} 
              onAddTask={handleAddTaskFromCalendar} 
            />
          )}

          {currentView === 'team' && (
            <TeamManagement 
              team={team}
              tasks={tasks}
              companies={companies}
              onAddTeamMember={handleAddTeamMember}
              onUpdateTeamMember={handleUpdateTeamMember}
              onDeleteTeamMember={handleDeleteTeamMember}
              onAssignCompaniesToUser={handleAssignCompaniesToUser}
              currentUser={currentUser}
              userSession={userSession}
            />
          )}

          {currentView === 'logs' && (
            <AuditLog 
              logs={logs}
              onClearLogs={handleClearLogs}
            />
          )}
        </div>
      </main>

      {/* Supabase Connection Setup Modal */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} style={{ color: 'var(--primary-light)' }} />
                <h3>Configuração do Banco de Dados Supabase</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfigModal(false)}>Fechar</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div style={{ padding: '12px', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79, 70, 229, 0.2)', color: 'var(--text-primary)' }}>
                <strong>Status Atual:</strong> {dbStatus === 'connected' ? '✅ Conectado ao PostgreSQL (Nuvem) com Sincronização em Tempo Real.' : '🟠 Usando armazenamento local. Para compartilhar dados entre toda a equipe, conecte seu projeto Supabase.'}
              </div>

              <h4 style={{ color: 'var(--text-primary)', marginTop: '4px' }}>Passos Rápidos para Ativar:</h4>
              
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Acesse <strong>supabase.com</strong> e crie uma conta gratuita.</li>
                <li>Crie um novo projeto (ex: <em>controle-tarefas</em>).</li>
                <li>Vá na aba <strong>SQL Editor</strong> e execute o conteúdo do arquivo <code>supabase_schema.sql</code> (já criado no projeto).</li>
                <li>Vá em <strong>Project Settings &gt; API</strong> e copie a <strong>Project URL</strong> e a <strong>anon public key</strong>.</li>
                <li>Cole essas duas chaves no arquivo <code>.env</code> do projeto.</li>
              </ol>

              <button 
                className="btn btn-primary" 
                style={{ marginTop: '10px' }}
                onClick={() => {
                  fetchSupabaseData();
                  setShowConfigModal(false);
                }}
              >
                <RefreshCw size={14} /> Testar Conexão Novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
