import React, { useState } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  CalendarDays,
  ArrowRight, 
  UserCheck,
  Building2,
  Eye,
  X,
  Check,
  Repeat,
  FileCheck,
  Paperclip,
  Download,
  ExternalLink,
  Tag
} from 'lucide-react';

import { 
  getTaskCompetencia, 
  formatCompetenciaLabel, 
  getCompetenciaOptions 
} from '../utils/competence';

export default function Dashboard({ tasks = [], logs = [], onViewChange, onUpdateTask }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [dashboardCompetencia, setDashboardCompetencia] = useState('Todos');

  const competenciaOptions = getCompetenciaOptions(tasks);

  // Filtrar tarefas caso o usuário filtre por uma competência específica
  const displayedTasks = dashboardCompetencia === 'Todos'
    ? tasks
    : tasks.filter(t => getTaskCompetencia(t) === dashboardCompetencia);

  // Active selected task reactive to tasks prop
  const activeSelectedTask = selectedTask 
    ? (tasks.find(t => t.id === selectedTask.id) || selectedTask) 
    : null;

  // Calculate counts baseados em displayedTasks
  const pendingCount = displayedTasks.filter(t => t.status === 'Pendente').length;
  const inProgressCount = displayedTasks.filter(t => t.status === 'Em Andamento').length;
  const completedCount = displayedTasks.filter(t => t.status === 'Concluído').length;
  
  // Calculate critical/near-deadline tasks (due in less than 5 days and not completed)
  const criticalCount = displayedTasks.filter(t => {
    if (t.status === 'Concluído') return false;
    const today = new Date();
    const dueDate = new Date(t.dueDate);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5; // Due within 5 days (including past due)
  }).length;

  // Get next 5 upcoming tasks sorted by due date
  const upcomingTasks = [...displayedTasks]
    .filter(t => t.status !== 'Concluído')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Get last 5 activity logs
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper to determine delay days
  const getDaysLeft = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Atrasada há ${Math.abs(diffDays)} dia(s)`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: 'Vence hoje', isToday: true };
    } else {
      return { text: `${diffDays} dia(s) restante(s)`, isSafe: true };
    }
  };

  // Toggle checklist inside modal
  const handleToggleChecklist = (itemIdx) => {
    if (!activeSelectedTask || !onUpdateTask) return;
    const updatedChecklist = (activeSelectedTask.checklist || []).map((item, idx) =>
      idx === itemIdx ? { ...item, done: !item.done } : item
    );
    const completedItems = updatedChecklist.filter(i => i.done).length;
    let newStatus = activeSelectedTask.status;
    if (completedItems > 0 && activeSelectedTask.status === 'Pendente') {
      newStatus = 'Em Andamento';
    }
    onUpdateTask(activeSelectedTask.id, {
      ...activeSelectedTask,
      checklist: updatedChecklist,
      status: newStatus
    }, `Alterou checklist da tarefa "${activeSelectedTask.title}" pelo Dashboard`);
  };

  // Change task status inside modal
  const handleStatusChange = (newStatus) => {
    if (!activeSelectedTask || !onUpdateTask) return;
    let updatedChecklist = [...(activeSelectedTask.checklist || [])];
    if (newStatus === 'Concluído') {
      updatedChecklist = updatedChecklist.map(item => ({ ...item, done: true }));
    }
    onUpdateTask(activeSelectedTask.id, {
      ...activeSelectedTask,
      status: newStatus,
      checklist: updatedChecklist
    }, `Alterou status da tarefa "${activeSelectedTask.title}" para ${newStatus} pelo Dashboard`);
  };

  // Download receipt
  const handleDownloadReceipt = (task) => {
    if (!task.receiptFileData) {
      alert(`Protocolo do Recibo: ${task.receiptProtocol || 'N/A'}\nData de Entrega: ${task.receiptDate || 'N/A'}`);
      return;
    }
    const link = document.createElement('a');
    link.href = task.receiptFileData;
    link.download = task.receiptFileName || `recibo-${task.receiptProtocol || 'obrigacao'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Competência Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Painel de Controle Operacional
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Visão consolidada de prazos, conformidade fiscal e status das obrigações
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarDays size={15} style={{ color: 'var(--accent-cyan)' }} /> Filtrar por Competência:
          </span>
          <select 
            className="user-select"
            value={dashboardCompetencia}
            onChange={(e) => setDashboardCompetencia(e.target.value)}
            style={{ 
              fontWeight: '600',
              padding: '6px 12px',
              fontSize: '0.85rem',
              borderColor: dashboardCompetencia !== 'Todos' ? 'var(--accent-cyan)' : 'var(--border-color)',
              backgroundColor: dashboardCompetencia !== 'Todos' ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
            }}
          >
            <option value="Todos">📅 Todas as Competências</option>
            {competenciaOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                📅 {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs Section */}
      <div className="kpi-grid">
        <div className="kpi-card pending" onClick={() => onViewChange('tasks')} style={{ cursor: 'pointer' }}>
          <div className="kpi-info">
            <h3>Pendentes</h3>
            <div className="kpi-value">{pendingCount}</div>
          </div>
          <div className="kpi-icon">
            <ClipboardList size={24} />
          </div>
        </div>

        <div className="kpi-card inprogress" onClick={() => onViewChange('tasks')} style={{ cursor: 'pointer' }}>
          <div className="kpi-info">
            <h3>Em Andamento</h3>
            <div className="kpi-value">{inProgressCount}</div>
          </div>
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
        </div>

        <div className="kpi-card completed" onClick={() => onViewChange('tasks')} style={{ cursor: 'pointer' }}>
          <div className="kpi-info">
            <h3>Concluídas</h3>
            <div className="kpi-value">{completedCount}</div>
          </div>
          <div className="kpi-icon">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="kpi-card critical" onClick={() => onViewChange('tasks')} style={{ cursor: 'pointer' }}>
          <div className="kpi-info">
            <h3>Atenção Crítica</h3>
            <div className="kpi-value">{criticalCount}</div>
          </div>
          <div className="kpi-icon">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Dashboard Section */}
      <div className="dashboard-grid">
        {/* Left Column: Upcoming Deadlines */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-critical)' }} />
                Prazos Críticos e Entregas Próximas
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Clique em qualquer tarefa para abrir seus detalhes, checklist e recibos
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onViewChange('tasks')}>
              Ver Todas <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="table-container">
            {upcomingTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                Nenhuma tarefa ativa ou vencimento próximo cadastrado.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Obrigação / Cliente</th>
                    <th>Vencimento</th>
                    <th>Prazo</th>
                    <th>Responsável</th>
                    <th>Prioridade</th>
                    <th style={{ textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.map(task => {
                    const statusInfo = getDaysLeft(task.dueDate);
                    return (
                      <tr 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                        title="Clique para abrir e ver detalhes desta tarefa"
                      >
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {task.title}
                            <span 
                              style={{ 
                                marginLeft: '6px', 
                                fontSize: '0.65rem', 
                                color: 'var(--accent-cyan)', 
                                backgroundColor: 'rgba(6, 182, 212, 0.12)', 
                                padding: '1px 6px', 
                                borderRadius: '50px',
                                border: '1px solid rgba(6, 182, 212, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title={`Competência Contábil: ${formatCompetenciaLabel(getTaskCompetencia(task))}`}
                            >
                              <CalendarDays size={10} /> {getTaskCompetencia(task)}
                            </span>
                            {task.isRecurring && (
                              <span 
                                style={{ 
                                  marginLeft: '6px', 
                                  fontSize: '0.65rem', 
                                  color: '#a78bfa', 
                                  backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                                  padding: '1px 6px', 
                                  borderRadius: '50px' 
                                }}
                              >
                                🔁 Dia {task.recurrenceDay || 10}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={11} /> {task.client || 'Sem empresa vinculada'}
                          </div>
                        </td>
                        <td>{formatDate(task.dueDate)}</td>
                        <td>
                          <span 
                            style={{ 
                              color: statusInfo.isOverdue ? 'var(--color-critical)' : 
                                     statusInfo.isToday ? 'var(--color-pending)' : 'var(--text-secondary)',
                              fontWeight: (statusInfo.isOverdue || statusInfo.isToday) ? '600' : 'normal',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {statusInfo.isOverdue && '⚠️ '}
                            {statusInfo.text}
                          </span>
                        </td>
                        <td>
                          <span className="task-assignee" style={{ display: 'inline-flex', padding: '2px 8px', fontSize: '0.75rem' }}>
                            <UserCheck size={12} /> {task.assignee}
                          </span>
                        </td>
                        <td>
                          <span className={`badge priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            title="Abrir tarefa"
                          >
                            <Eye size={13} /> Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Logs */}
        <div className="card-panel">
          <div className="panel-header">
            <h3>🕒 Histórico Recente</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onViewChange('logs')}>
              Ver Tudo
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Nenhum registro de atividade ainda.
              </div>
            ) : (
              recentLogs.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--primary-light)' }}>{log.user}</strong>
                    <span className="log-meta">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{log.action}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: Detalhes & Execução da Tarefa (Abertura Direta pelo Dashboard) */}
      {/* ===================================================================== */}
      {activeSelectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="panel-header" style={{ marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    {activeSelectedTask.title}
                  </h3>
                  {activeSelectedTask.isRecurring && (
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 8px', 
                        borderRadius: '50px', 
                        backgroundColor: 'rgba(139, 92, 246, 0.2)', 
                        color: '#a78bfa',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Repeat size={12} /> {activeSelectedTask.recurrenceFrequency || 'Mensal'} • Dia {activeSelectedTask.recurrenceDay || 10}
                    </span>
                  )}
                  <span className={`badge priority-${activeSelectedTask.priority.toLowerCase()}`}>
                    {activeSelectedTask.priority}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <Building2 size={14} style={{ color: 'var(--primary-light)' }} />
                  <strong>Empresa:</strong> {activeSelectedTask.client || 'Sem empresa associada'}
                </div>
              </div>

              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTask(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Quick Metadata Bar */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '12px', 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '12px',
                marginBottom: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Competência
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }} title={formatCompetenciaLabel(getTaskCompetencia(activeSelectedTask))}>
                  <CalendarDays size={14} />
                  {getTaskCompetencia(activeSelectedTask)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Vencimento
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Calendar size={14} style={{ color: 'var(--primary-light)' }} />
                  {formatDate(activeSelectedTask.dueDate)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Status do Prazo
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  {(() => {
                    const statusInfo = getDaysLeft(activeSelectedTask.dueDate);
                    return (
                      <span 
                        style={{ 
                          color: statusInfo.isOverdue ? 'var(--color-critical)' : 
                                 statusInfo.isToday ? 'var(--color-pending)' : 'var(--color-completed)',
                          fontWeight: '600'
                        }}
                      >
                        {statusInfo.isOverdue && '⚠️ '}
                        {statusInfo.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Responsável
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <UserCheck size={14} style={{ color: 'var(--color-inprogress)' }} />
                  {activeSelectedTask.assignee}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Status da Tarefa
                </div>
                <div style={{ marginTop: '2px' }}>
                  <select
                    className="form-control"
                    value={activeSelectedTask.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '4px 8px', 
                      height: 'auto',
                      fontWeight: '600',
                      color: activeSelectedTask.status === 'Concluído' ? 'var(--color-completed)' :
                             activeSelectedTask.status === 'Em Andamento' ? 'var(--color-inprogress)' : 'var(--color-pending)',
                      borderColor: activeSelectedTask.status === 'Concluído' ? 'rgba(16, 185, 129, 0.4)' :
                                   activeSelectedTask.status === 'Em Andamento' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)'
                    }}
                  >
                    <option value="Pendente">🟡 Pendente</option>
                    <option value="Em Andamento">🔵 Em Andamento</option>
                    <option value="Concluído">🟢 Concluído</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description (if any) */}
            {activeSelectedTask.description && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Orientações da Rotina:
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', lineHeight: '1.4' }}>
                  {activeSelectedTask.description}
                </div>
              </div>
            )}

            {/* Operational Checklist */}
            <div style={{ marginBottom: '16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ClipboardList size={15} style={{ color: 'var(--primary-light)' }} />
                  Passo a Passo / Checklist ({activeSelectedTask.checklist ? activeSelectedTask.checklist.filter(i => i.done).length : 0}/{activeSelectedTask.checklist ? activeSelectedTask.checklist.length : 0})
                </div>

                {activeSelectedTask.checklist && activeSelectedTask.checklist.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {Math.round((activeSelectedTask.checklist.filter(i => i.done).length / activeSelectedTask.checklist.length) * 100)}% concluído
                  </span>
                )}
              </div>

              {(!activeSelectedTask.checklist || activeSelectedTask.checklist.length === 0) ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                  Esta tarefa não possui itens de checklist cadastrados.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeSelectedTask.checklist.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleToggleChecklist(idx)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '8px 12px', 
                        backgroundColor: item.done ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={item.done} 
                        onChange={() => {}} // handled by parent div
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span 
                        style={{ 
                          fontSize: '0.85rem', 
                          color: item.done ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: item.done ? 'line-through' : 'none'
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receipt Info (if attached) */}
            {activeSelectedTask.hasReceipt ? (
              <div 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-completed)' }}>
                    <FileCheck size={16} /> Recibo Oficial de Entrega Anexado
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Protocolo: <strong>{activeSelectedTask.receiptProtocol || 'Registrado'}</strong>
                    {activeSelectedTask.receiptDate && ` • Transmitido em: ${formatDate(activeSelectedTask.receiptDate)}`}
                  </div>
                </div>

                {activeSelectedTask.receiptFileData && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', gap: '6px', color: 'var(--color-completed)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                    onClick={() => handleDownloadReceipt(activeSelectedTask)}
                  >
                    <Download size={13} /> Baixar Comprovante
                  </button>
                )}
              </div>
            ) : (
              <div 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Sem recibo oficial anexado nesta competência.</span>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  onClick={() => {
                    setSelectedTask(null);
                    onViewChange('tasks');
                  }}
                >
                  + Anexar Recibo
                </button>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedTask(null);
                  onViewChange('tasks');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} /> Abrir na Central de Tarefas & Recibos
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {activeSelectedTask.status !== 'Concluído' && (
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStatusChange('Concluído')}
                    style={{ backgroundColor: 'var(--color-completed)', borderColor: 'var(--color-completed)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={14} /> Concluir Tarefa
                  </button>
                )}

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setSelectedTask(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

