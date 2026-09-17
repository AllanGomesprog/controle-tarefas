import { useState } from 'react';
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, ArrowRight, Search, FileText } from 'lucide-react';
import { parseLocalDate, localDateString } from '../utils/dates.js';
import { getTaskCompetencia, formatCompetenciaLabel, getCompetenciaOptions, getCurrentCompetencia } from '../utils/competence.js';
import TaskDrawer from './TaskDrawer.jsx';

const statusClass = status => status === 'Concluído' ? 'completed' : status === 'Em Andamento' ? 'inprogress' : 'pending';
const initials = name => (name || '?').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('');

export default function Dashboard({ tasks = [], logs = [], onViewChange, onUpdateTask, busy, error }) {
  const [selectedId, setSelectedId] = useState(null);
  const [competencia, setCompetencia] = useState('Todos');
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const today = localDateString(new Date());
  const displayed = competencia === 'Todos' ? tasks : tasks.filter(task => getTaskCompetencia(task) === competencia);
  const overdue = task => task.status !== 'Concluído' && task.dueDate && task.dueDate < today;
  const counts = {
    pending: displayed.filter(t => t.status === 'Pendente').length,
    working: displayed.filter(t => t.status === 'Em Andamento').length,
    done: displayed.filter(t => t.status === 'Concluído').length,
    late: displayed.filter(overdue).length,
  };
  const filtered = displayed.filter(task => {
    const text = `${task.title} ${task.client || ''} ${task.assignee || ''}`.toLocaleLowerCase('pt-BR');
    const matches = filter === 'all' || (filter === 'open' && task.status !== 'Concluído') ||
      (filter === 'today' && task.dueDate === today && task.status !== 'Concluído') ||
      (filter === 'late' && overdue(task));
    return matches && text.includes(search.toLocaleLowerCase('pt-BR'));
  }).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  const recentLogs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);
  const closingCompetencia = competencia === 'Todos' ? getCurrentCompetencia() : competencia;
  const closing = tasks.filter(t => getTaskCompetencia(t) === closingCompetencia);
  const finished = closing.filter(t => t.status === 'Concluído').length;
  const progress = closing.length ? Math.round(finished / closing.length * 100) : 0;
  const selectedTask = tasks.find(task => task.id === selectedId);
  const metrics = [
    ['Pendentes', counts.pending, ClipboardList, 'Aguardando início'],
    ['Em andamento', counts.working, Clock, 'Em execução pela equipe'],
    ['Concluídas', counts.done, CheckCircle2, 'Entregas finalizadas'],
    ['Em atraso', counts.late, AlertTriangle, 'Precisam de atenção'],
  ];

  return <div className="overview">
    <div className="overview-period"><label htmlFor="dashboard-period">Competência</label><select id="dashboard-period" className="user-select" value={competencia} onChange={e => setCompetencia(e.target.value)}>
      <option value="Todos">Todas as competências</option>{getCompetenciaOptions(tasks).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select></div>
    <div className="overview-stats">{metrics.map(([label, value, Icon, caption], index) => <div className={`overview-stat ${index === 3 ? 'stat-alert' : ''}`} key={label}>
      <div className="stat-heading"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><p>{caption}</p>
    </div>)}</div>
    <section className="priority-panel" aria-labelledby="priorities-title">
      <div className="priority-heading"><h2 id="priorities-title">Prioridades da equipe</h2><span className="muted">Organizadas por vencimento</span></div>
      <div className="priority-tools"><div className="filter-tabs" role="group" aria-label="Filtrar prioridades">
        {[['open','Em aberto'],['today','Para hoje'],['late','Em atraso'],['all','Todas']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
      </div><label className="priority-search"><Search size={16} /><input aria-label="Buscar prioridades" placeholder="Buscar tarefa…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      <table className="priority-table"><thead><tr><th scope="col">Tarefa / empresa</th><th scope="col" className="owner-column">Responsável</th><th scope="col">Vencimento</th><th scope="col" className="status-column">Status</th></tr></thead>
        <tbody>{filtered.slice(0, 6).map(task => <tr key={task.id}>
          <td><button className="task-open" onClick={() => setSelectedId(task.id)}><span className="task-document"><FileText size={17} /></span><span><strong>{task.title}</strong><small>{task.client || 'Sem empresa associada'}</small></span></button></td>
          <td className="owner-column"><span className="table-owner"><span className="avatar">{initials(task.assignee)}</span>{task.assignee || 'Não definido'}</span></td>
          <td><span className={`due-date ${overdue(task) ? 'overdue' : ''}`}>{task.dueDate ? parseLocalDate(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem prazo'}<small>{task.status === 'Concluído' ? 'Finalizada' : overdue(task) ? 'Em atraso' : task.dueDate === today ? 'Vence hoje' : 'No prazo'}</small></span></td>
          <td className="status-column"><span className={`status-chip ${statusClass(task.status)}`}>{task.status}</span></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="empty-state"><CheckCircle2 size={26} /><h3>{tasks.length ? 'Nenhuma tarefa neste filtro' : 'Seu escritório começa por aqui'}</h3><p>{tasks.length ? 'Experimente outra competência ou busca.' : 'Cadastre uma tarefa para acompanhar os prazos da equipe.'}</p></div>}
      <div className="priority-footer"><span>{Math.min(filtered.length, 6)} de {filtered.length} tarefas</span><button className="text-button" onClick={() => onViewChange('tasks')}>Ver todas as tarefas <ArrowRight size={14} /></button></div>
    </section>
    <div className="overview-bottom">
      <section className="summary-panel"><div className="section-heading"><h2>Fechamento da competência</h2><CheckCircle2 size={17} className="muted" /></div><p className="muted">{formatCompetenciaLabel(closingCompetencia)}</p>
        <div className="closing-progress"><strong>{progress}%</strong><span className="muted">{finished} de {closing.length} tarefas concluídas</span></div>
        <progress value={progress} max="100" aria-label="Progresso do fechamento" />
        <p className="closing-note">{closing.length ? `${closing.length - finished} tarefas restantes nesta competência.` : 'Nenhuma tarefa cadastrada nesta competência.'}</p>
        <button className="text-button" onClick={() => onViewChange('tasks')}>Acompanhar tarefas <ArrowRight size={14} /></button>
      </section>
      <section className="summary-panel"><div className="section-heading"><h2>Últimas movimentações</h2><button className="text-button" onClick={() => onViewChange('logs')}>Ver histórico <ArrowRight size={14} /></button></div>
        {!recentLogs.length && <p className="empty-activity muted">As atividades da equipe aparecerão aqui.</p>}
        <ul className="activity-list">{recentLogs.map(log => <li key={log.id}><span className="activity-dot" /><div><p><strong>{log.user}</strong> · {log.action}</p><p className="muted">{log.details}</p><time className="muted" dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</time></div></li>)}</ul>
      </section>
    </div>
    {selectedTask && <TaskDrawer task={selectedTask} busy={busy} error={error} onClose={() => setSelectedId(null)} onUpdateTask={onUpdateTask} onViewTasks={() => onViewChange('tasks')} />}
  </div>;
}
