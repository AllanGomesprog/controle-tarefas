import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  History,
  Plus,
  ChevronRight,
  X,
  Database,
  RefreshCw,
  Building2,
  LogOut,
  Layers,
  ClipboardList,
  } from 'lucide-react';

import { localDateString } from './utils/dates.js';
import { useWorkspace } from './hooks/useWorkspace.js';


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

export default function App() {
  const workspace = useWorkspace();
  return <WorkspaceApp workspace={workspace} />;
}

export function WorkspaceApp({ workspace, demoMode = false }) {
  const { tasks, logs, companies, team, taskCatalog, userSession, authUser, authReady, dbStatus, error, busy, canManage, handleLogin, handleLogout, fetchSupabaseData, dismissError, handleAddTask, handleUpdateTask, handleDeleteTask, handleClearAllTasks, handleRenewTask, handleAddCompany, handleUpdateCompany, handleDeleteCompany, handleTriggerAutomation, handleAddTaskToCatalog, handleUpdateCatalogTask, handleDeleteCatalogTask, handleAddTeamMember, handleUpdateTeamMember, handleDeleteTeamMember, handleAssignCompaniesToUser } = workspace;
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('controle_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } });
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); try { localStorage.setItem('controle_theme', theme); } catch { /* Theme remains usable without storage. */ } }, [theme]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState(null);
  const [selectedCatalogTaskId, setSelectedCatalogTaskId] = useState(null);
  const currentUser = userSession ? userSession.name + ' (' + userSession.role + ')' : '';
  const handleNavigateToLinking = (id = null) => { setSelectedCatalogTaskId(id); setCurrentView('automation'); };
  const handleAddTaskFromCalendar = date => { setPrefilledDate(date); setCurrentView('tasks'); };
  const getViewTitle = () => ({ dashboard:'Visão geral', taskCatalog:'Catálogo de Rotinas', tasks:'Tarefas e Recibos', companies:'Empresas e Clientes', calendar:'Calendário de Prazos', automation:'Atrelar Tarefas às Empresas', team:'Equipe', logs:'Histórico de Alterações' }[currentView]);
  // If user is not logged in, render the Login Screen
  if (!authReady) return <div className="login-wrapper">Verificando acesso…</div>;
  if (authUser && !userSession) return <div className="login-wrapper"><div className="card-panel"><p role="status">{error || 'Carregando sua equipe…'}</p><button className="btn btn-primary" onClick={fetchSupabaseData}>Tentar novamente</button> <button className="btn btn-secondary" onClick={handleLogout}>Sair</button></div></div>;
  if (!userSession) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        team={team}
        theme={theme}
        setTheme={setTheme}

      />
    );
  }

  return (
    <div className="app-container">
      <a className="skip-link" href="#workspace-content">Pular para o conteúdo</a>
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">Meu escritório<small>Gestão de tarefas</small></div>
        <nav aria-label="Navegação principal">
          <p className="nav-caption">ESPAÇO DE TRABALHO</p>
          <ul className="nav-links">
            {[
              ['dashboard', 'Visão geral', LayoutDashboard],
              ['tasks', 'Tarefas & Recibos', CheckSquare],
              ['calendar', 'Calendário', CalendarDays],
              ['companies', 'Empresas & Clientes', Building2],
              ['taskCatalog', 'Catálogo de rotinas', ClipboardList],
              ['automation', 'Atrelar às Empresas', Layers],
              ...(canManage ? [['team', 'Equipe', Users]] : []),
              ['logs', 'Histórico & Auditoria', History],
            ].map(([view, label, Icon]) => <li key={view} className={`nav-item ${currentView === view ? 'active' : ''}`}>
              <button title={label} aria-label={label} aria-current={currentView === view ? 'page' : undefined} onClick={() => { setCurrentView(view); setPrefilledDate(null); }}>
                <Icon size={18} /><span className="nav-label">{label}</span>
              </button>
            </li>)}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-account"><span className="avatar">{userSession.name[0]}</span><div className="account-name">{userSession.name}<small>{userSession.role}</small></div>
            <button onClick={handleLogout} className="icon-button" aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Meu escritório</span><ChevronRight size={13} /><span>{getViewTitle()}</span></div>
          <div className="topbar-actions">
            <button className={`connection-status ${dbStatus === 'connected' ? 'connected' : ''}`} onClick={() => { if (!demoMode) setShowConfigModal(true); }} aria-label={demoMode ? "Modo demonstração" : "Status da conexão"}>
              <span className="connection-dot" /><span>{demoMode ? 'Demonstração' : dbStatus === 'connected' ? 'Conectado' : dbStatus === 'connecting' ? 'Conectando…' : 'Sem conexão'}</span>
            </button>
            <ThemeToggle theme={theme} setTheme={setTheme} size="sm" />
          </div>
        </header>
        {/* Content Body */}
        <div className="content-body" id="workspace-content" tabIndex={-1}>
          {demoMode && <div className="demo-banner" role="status"><div><strong>Demonstração visual</strong><p>Dados fictícios. As alterações são descartadas ao recarregar. Não use dados reais.</p></div><button className="btn btn-secondary" onClick={() => window.location.reload()}>Reiniciar demo</button></div>}
          <div className="workspace-heading"><div><h1>{getViewTitle()}</h1><p>{currentView === 'dashboard' ? new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) + ' · Acompanhe o dia da sua equipe.' : 'Organize as rotinas e acompanhe as entregas do escritório.'}</p></div>
            {currentView === 'dashboard' && <button className="btn btn-primary" disabled={busy || dbStatus !== 'connected'} onClick={() => handleAddTaskFromCalendar(localDateString(new Date()))}><Plus size={16} /> Nova tarefa</button>}
          </div>
          {error && <div className="login-error-badge" role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={dismissError}>Fechar</button></div>}
          {busy && <p role="status">Salvando no servidor…</p>}
          <fieldset disabled={busy || dbStatus !== 'connected'} style={{ border: 0, padding: 0, minWidth: 0 }}>
          {currentView === 'dashboard' && (
            <Dashboard busy={busy} error={error}
              tasks={tasks}
              logs={logs}
              onViewChange={setCurrentView}
              onUpdateTask={handleUpdateTask}
            />
          )}

          {currentView === 'taskCatalog' && (
            <TaskCatalog canManage={canManage}
              taskCatalog={taskCatalog}
              team={team}
              onAddTaskToCatalog={handleAddTaskToCatalog}
              onUpdateCatalogTask={handleUpdateCatalogTask}
              onDeleteCatalogTask={handleDeleteCatalogTask}
              onNavigateToLinking={handleNavigateToLinking}
            />
          )}

          {currentView === 'tasks' && (
            <TaskList canManage={canManage}
              tasks={tasks}
              team={team}
              companies={companies}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onClearAllTasks={canManage ? handleClearAllTasks : null}
              onRenewTask={handleRenewTask}
              onNavigateView={setCurrentView}
              onAddTaskToCatalog={handleAddTaskToCatalog}
              currentUser={currentUser}
              prefilledDate={prefilledDate}
            />
          )}

          {currentView === 'companies' && (
            <CompanyManagement canManage={canManage}
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

          {currentView === 'team' && canManage && (
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

            />
          )}
          </fieldset>
        </div>
      </main>

      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onClick={e => e.stopPropagation()}>
            <div className="panel-header"><h2 id="connection-title"><Database size={18} /> Conexão da equipe</h2><button className="icon-button" aria-label="Fechar conexão" onClick={() => setShowConfigModal(false)}><X size={18} /></button></div>
            <p className="muted">{dbStatus === 'connected' ? 'O sistema está conectado. As alterações são salvas no servidor e compartilhadas com a equipe.' : 'Não foi possível conectar ao servidor. Verifique sua conexão ou entre em contato com o administrador.'}</p>
            <button className="btn btn-primary" onClick={() => { fetchSupabaseData(); setShowConfigModal(false); }}><RefreshCw size={14} /> Atualizar conexão</button>
          </div>
        </div>
      )}
    </div>
  );
}
