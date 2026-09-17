import { useEffect, useRef } from 'react';
import { X, Check, Download, Paperclip, ExternalLink, Repeat } from 'lucide-react';
import { downloadReceipt } from '../lib/workspaceApi.js';
import { parseLocalDate } from '../utils/dates.js';
import { getTaskCompetencia, formatCompetenciaLabel } from '../utils/competence.js';

export default function TaskDrawer({ task, onClose, onUpdateTask, onViewTasks, busy, error }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  function changeStatus(status) {
    onUpdateTask(task.id, { ...task, status, checklist: (task.checklist || []).map(item => status === 'Concluído' ? { ...item, done: true } : item) });
  }
  function toggleItem(index) {
    const checklist = task.checklist.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    const status = task.status === 'Pendente' && checklist.some(item => item.done) ? 'Em Andamento' : task.status;
    onUpdateTask(task.id, { ...task, checklist, status });
  }
  const completed = (task.checklist || []).filter(item => item.done).length;
  return <dialog ref={dialog} className="task-drawer" aria-labelledby="drawer-title" onCancel={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="drawer-inner">
      <div className="drawer-eyebrow"><span>DETALHES DA TAREFA</span><button autoFocus className="icon-button" aria-label="Fechar detalhes" onClick={onClose}><X size={20} /></button></div>
      <h2 id="drawer-title">{task.title}</h2>
      <p className="muted">{task.client || 'Sem empresa associada'}</p>
      {task.isRecurring && <p className="drawer-recurrence"><Repeat size={14} /> Recorrência {task.recurrenceFrequency || 'Mensal'} · dia {task.recurrenceDay || 10}</p>}
      {error && <p className="login-error-badge" role="alert">{error}</p>}
      {busy && <p role="status" className="muted">Salvando no servidor…</p>}
      <fieldset disabled={busy} className="drawer-fields">
        <dl className="drawer-meta">
          <div><dt>Responsável</dt><dd>{task.assignee || 'Não definido'}</dd></div>
          <div><dt>Vencimento</dt><dd>{parseLocalDate(task.dueDate).toLocaleDateString('pt-BR')}</dd></div>
          <div><dt>Competência</dt><dd>{formatCompetenciaLabel(getTaskCompetencia(task))}</dd></div>
          <div><dt>Prioridade</dt><dd>{task.priority || 'Média'}</dd></div>
        </dl>
        <label className="drawer-label" htmlFor="drawer-status">Status da tarefa</label>
        <select id="drawer-status" className="form-control" value={task.status} onChange={event => changeStatus(event.target.value)}>
          <option>Pendente</option><option>Em Andamento</option><option>Concluído</option>
        </select>
        {task.description && <section className="drawer-section"><h3>Orientações</h3><p className="muted preserve-lines">{task.description}</p></section>}
        <section className="drawer-section">
          <div className="section-heading"><h3>Checklist</h3><span className="muted">{completed}/{task.checklist?.length || 0}</span></div>
          {!task.checklist?.length && <p className="muted">Nenhuma etapa cadastrada.</p>}
          {(task.checklist || []).map((item, index) => <label className={`drawer-check ${item.done ? 'done' : ''}`} key={index}>
            <input type="checkbox" checked={item.done} onChange={() => toggleItem(index)} /><span>{item.text}</span>
          </label>)}
        </section>
        <section className="drawer-section receipt-summary">
          <h3><Paperclip size={16} /> Recibo de entrega</h3>
          {task.hasReceipt ? <><p className="muted">Protocolo: {task.receiptProtocol || 'Registrado'}</p>
            {task.receiptDate && <p className="muted">Transmitido em {parseLocalDate(task.receiptDate).toLocaleDateString('pt-BR')}</p>}
            {(task.receiptPath || task.receiptFileData) && <button className="btn btn-secondary" onClick={() => downloadReceipt(task)}><Download size={15} /> Baixar comprovante</button>}
          </> : <><p className="muted">Nenhum recibo anexado.</p><button className="text-button" onClick={onViewTasks}>Anexar na central de tarefas <ExternalLink size={14} /></button></>}
        </section>
        <div className="drawer-actions">
          <button className="btn btn-secondary" onClick={onViewTasks}><ExternalLink size={15} /> Central de tarefas</button>
          {task.status !== 'Concluído' && <button className="btn btn-primary" onClick={() => changeStatus('Concluído')}><Check size={16} /> Concluir tarefa</button>}
        </div>
      </fieldset>
    </div>
  </dialog>;
}
