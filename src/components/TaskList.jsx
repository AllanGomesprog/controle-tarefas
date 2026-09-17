import { validateReceipt, downloadReceipt } from '../lib/workspaceApi.js';
import { parseLocalDate, localDateString } from '../utils/dates.js';
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  User, 
  Calendar, 
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Trash2, 
  Edit, 
  CheckSquare, 
  PlusCircle, 
  FileCheck, 
  Paperclip, 
  Download, 
  Building2,
  UploadCloud,
  Layers,
  Repeat
} from 'lucide-react';

import { 
  getTaskCompetencia, 
  formatCompetenciaLabel, 
  getCompetenciaOptions, 
  groupTasksByCompetencia, 
  getCurrentCompetencia 
} from '../utils/competence';

export default function TaskList({ 
  tasks, 
  team, 
  companies = [], 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  onClearAllTasks,
  onRenewTask,
  onNavigateView,
  canManage = false,
  prefilledDate 
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'competence'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [competenciaFilter, setCompetenciaFilter] = useState('Todos');
  const [assigneeFilter, setAssigneeFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todos');
  const [receiptFilter, setReceiptFilter] = useState('Todos');
  const [recurrenceFilter, setRecurrenceFilter] = useState('Todos');
  const [expandedCompetencias, setExpandedCompetencias] = useState({});
  
  // Modal State for Task
  const [isModalOpen, setIsModalOpen] = useState(prefilledDate !== null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formAssignee, setFormAssignee] = useState(team[0]?.name || '');
  const [formDueDate, setFormDueDate] = useState(prefilledDate || '');
  const [formCompetencia, setFormCompetencia] = useState(prefilledDate ? getTaskCompetencia({ dueDate: prefilledDate }) : getCurrentCompetencia());
  const [formCompetenciaManual, setFormCompetenciaManual] = useState(false);
  const [formPriority, setFormPriority] = useState('Média');
  const [formDesc, setFormDesc] = useState('');
  
  // Recurrence State
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formRecurrenceFrequency, setFormRecurrenceFrequency] = useState('Mensal');
  const [formRecurrenceDay, setFormRecurrenceDay] = useState(10);
  
  // Checklist State in Form
  const [formChecklist, setFormChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Receipt Modal State
  const [receiptModalTask, setReceiptModalTask] = useState(null);
  const [receiptProtocol, setReceiptProtocol] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptFileData, setReceiptFileData] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [autoCompleteWithReceipt, setAutoCompleteWithReceipt] = useState(true);

  // Handle open modal for create (starts completely clean)
  const openCreateModal = (targetComp = null) => {
    setEditingTask(null);
    setFormTitle('');
    setFormClient(companies[0]?.nomeFantasia || companies[0]?.razaoSocial || '');
    setFormCompanyId(companies[0]?.id || '');
    setFormAssignee(companies[0]?.defaultAssignee || team[0]?.name || '');

    // Default to day 10
    const today = new Date();
    let y = today.getFullYear();
    let m = today.getMonth() + 1;
    if (today.getDate() > 10) {
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    const defaultDate = `${y}-${String(m).padStart(2, '0')}-10`;
    setFormDueDate(prefilledDate || defaultDate);

    const initialComp = targetComp || (prefilledDate ? getTaskCompetencia({ dueDate: prefilledDate }) : getCurrentCompetencia());
    setFormCompetencia(initialComp);
    setFormCompetenciaManual(Boolean(targetComp));

    setFormPriority('Média');
    setFormDesc('');
    setFormChecklist([]);
    setFormIsRecurring(true);
    setFormRecurrenceFrequency('Mensal');
    setFormRecurrenceDay(10);
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormClient(task.client);
    setFormCompanyId(task.companyId || '');
    setFormAssignee(task.assignee);
    setFormDueDate(task.dueDate);
    setFormCompetencia(getTaskCompetencia(task));
    setFormCompetenciaManual(true);
    setFormPriority(task.priority);
    setFormDesc(task.description);
    setFormChecklist(task.checklist || []);
    setFormIsRecurring(Boolean(task.isRecurring));
    setFormRecurrenceFrequency(task.recurrenceFrequency || 'Mensal');
    setFormRecurrenceDay(task.recurrenceDay || 10);
    setIsModalOpen(true);
  };

  // Handle Company Selection in Form
  const handleSelectCompany = (companyId) => {
    setFormCompanyId(companyId);
    if (companyId === 'custom') {
      setFormClient('');
      return;
    }
    if (!companyId) { setFormClient(''); return; }
    const found = companies.find(c => c.id === companyId);
    if (found) {
      setFormClient(found.nomeFantasia || found.razaoSocial);
      if (found.defaultAssignee) {
        setFormAssignee(found.defaultAssignee);
      }
    }
  };

  // Add item to form checklist
  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormChecklist([...formChecklist, { text: newChecklistItem.trim(), done: false }]);
      setNewChecklistItem('');
    }
  };

  // Remove item from form checklist
  const handleRemoveChecklistItem = (index) => {
    setFormChecklist(formChecklist.filter((_, idx) => idx !== index));
  };

  // Submit form (sem exigir empresa, pois o vínculo é na tela dedicada)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, preencha o título da tarefa.');
      return;
    }

    const taskData = {
      title: formTitle.trim(),
      client: formClient,
      companyId: formCompanyId,
      assignee: formAssignee,
      dueDate: formDueDate,
      competencia: formCompetencia,
      competenciaLabel: formatCompetenciaLabel(formCompetencia),
      priority: formPriority,
      description: formDesc,
      checklist: formChecklist,
      isRecurring: formIsRecurring,
      recurrenceFrequency: formIsRecurring ? formRecurrenceFrequency : null,
      recurrenceDay: formIsRecurring ? formRecurrenceDay : null
    };

    const saved = editingTask
      ? await onUpdateTask(editingTask.id, { ...taskData, version: editingTask.version })
      : await onAddTask({ ...taskData, status: 'Pendente' });
    if (!saved) return;

    setIsModalOpen(false);
  };

  // Toggle checklist item done directly in card
  const handleToggleChecklistInCard = (taskId, itemIdx) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedChecklist = task.checklist.map((item, idx) => 
      idx === itemIdx ? { ...item, done: !item.done } : item
    );

    const completedItems = updatedChecklist.filter(item => item.done).length;
    let updatedStatus = task.status;
    
    if (completedItems > 0 && task.status === 'Pendente') {
      updatedStatus = 'Em Andamento';
    }
    
    onUpdateTask(taskId, {
      ...task,
      checklist: updatedChecklist,
      status: updatedStatus
    }, `Alterou checklist da tarefa "${task.title}"`);
  };

  // Cycle task status directly
  const handleCycleStatus = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let nextStatus = 'Pendente';
    if (task.status === 'Pendente') nextStatus = 'Em Andamento';
    else if (task.status === 'Em Andamento') nextStatus = 'Concluído';
    else nextStatus = 'Pendente';

    let updatedChecklist = [...(task.checklist || [])];
    if (nextStatus === 'Concluído') {
      updatedChecklist = updatedChecklist.map(item => ({ ...item, done: true }));
    }

    onUpdateTask(taskId, {
      ...task,
      status: nextStatus,
      checklist: updatedChecklist
    }, `Alterou o status da tarefa "${task.title}" de "${task.status}" para "${nextStatus}"`);
  };

  // Receipt Modal Handlers
  const openReceiptModal = (task) => {
    setReceiptModalTask(task);
    setReceiptProtocol(task.receiptProtocol || '');
    setReceiptDate(task.receiptDate || localDateString());
    setReceiptFileName(task.receiptFileName || '');
    setReceiptFileData(task.receiptFileData || '');
    setReceiptFile(null);
    setAutoCompleteWithReceipt(task.status !== 'Concluído');
  };

  const handleReceiptFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { validateReceipt(file); setReceiptFile(file); setReceiptFileName(file.name); }
    catch (error) { alert(error.message); event.target.value = ''; }
  };

  const handleSaveReceipt = async () => {
    if (!receiptModalTask) return;
    if (!receiptProtocol.trim() && !receiptFileName) {
      alert('Por favor, informe ao menos o Número do Protocolo ou anexe o arquivo do recibo.');
      return;
    }

    const updatedTask = {
      ...receiptModalTask,
      receiptProtocol: receiptProtocol.trim(),
      receiptDate: receiptDate || localDateString(),
      receiptFileName: receiptFileName,
      receiptFileData: receiptFileData,
      receiptFile,
      hasReceipt: true
    };

    if (autoCompleteWithReceipt) {
      updatedTask.status = 'Concluído';
      if (updatedTask.checklist) {
        updatedTask.checklist = updatedTask.checklist.map(step => ({ ...step, done: true }));
      }
    }

    const saved = await onUpdateTask(
      receiptModalTask.id, 
      updatedTask, 
      `Anexou recibo de entrega da obrigação "${receiptModalTask.title}" sob protocolo ${receiptProtocol || 'N/A'}`
    );

    if (saved) setReceiptModalTask(null);
  };

  const handleRemoveReceipt = async () => {
    if (!receiptModalTask) return;
    if (confirm('Deseja remover o recibo anexado desta tarefa?')) {
      const updatedTask = {
        ...receiptModalTask,
        receiptProtocol: '',
        receiptDate: '',
        receiptFileName: '',
        receiptFileData: '',
        receiptPath: '',
        receiptFile: null,
        hasReceipt: false
      };
      const saved = await onUpdateTask(receiptModalTask.id, updatedTask, `Removeu o recibo de entrega da tarefa "${receiptModalTask.title}"`);
      if (saved) setReceiptModalTask(null);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const taskComp = getTaskCompetencia(task);
    const matchesCompetencia = competenciaFilter === 'Todos' || taskComp === competenciaFilter;

    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      task.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.receiptProtocol || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      taskComp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatCompetenciaLabel(taskComp).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'Todos' || task.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'Todos' || task.assignee === assigneeFilter;
    const matchesPriority = priorityFilter === 'Todos' || task.priority === priorityFilter;

    let matchesReceipt = true;
    if (receiptFilter === 'Com Recibo') {
      matchesReceipt = Boolean(task.receiptProtocol || task.receiptFileName || task.hasReceipt);
    } else if (receiptFilter === 'Sem Recibo') {
      matchesReceipt = !task.receiptProtocol && !task.receiptFileName && !task.hasReceipt;
    }

    let matchesRecurrence = true;
    if (recurrenceFilter === 'Recorrentes') {
      matchesRecurrence = Boolean(task.isRecurring);
    } else if (recurrenceFilter === 'Avulsas') {
      matchesRecurrence = !task.isRecurring;
    }

    return matchesSearch && matchesStatus && matchesCompetencia && matchesAssignee && matchesPriority && matchesReceipt && matchesRecurrence;
  });

  const competenciaOptions = getCompetenciaOptions(tasks);
  const groupedByComp = groupTasksByCompetencia(filteredTasks);

  const toggleExpandCompetencia = (comp) => {
    setExpandedCompetencias(prev => ({
      ...prev,
      [comp]: prev[comp] === undefined ? false : !prev[comp]
    }));
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper para renderizar cartão individual de tarefa
  const renderTaskCard = (task) => {
    const totalItems = task.checklist ? task.checklist.length : 0;
    const completedItems = task.checklist ? task.checklist.filter(i => i.done).length : 0;
    const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const hasReceipt = Boolean(task.receiptProtocol || task.receiptFileName || task.hasReceipt);
    const taskComp = getTaskCompetencia(task);
    const taskCompLabel = formatCompetenciaLabel(taskComp);

    return (
      <div key={task.id} className="task-card">
        {/* Header */}
        <div className="task-header">
          <div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span 
                className={`badge ${task.status === 'Concluído' ? 'completed' : task.status === 'Em Andamento' ? 'inprogress' : 'pending'}`}
                style={{ cursor: 'pointer' }}
                title="Clique para alternar o status"
                onClick={() => handleCycleStatus(task.id)}
              >
                {task.status}
              </span>

              {/* Competência Badge */}
              <span 
                className="badge" 
                style={{ 
                  backgroundColor: 'rgba(6, 182, 212, 0.12)', 
                  color: 'var(--accent-cyan)', 
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.65rem',
                  fontWeight: '600'
                }}
                title={`Competência Contábil: ${taskCompLabel}`}
              >
                <CalendarDays size={11} /> Comp: {taskComp}
              </span>

              {/* Receipt Attached Badge */}
              {hasReceipt && (
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                    color: 'var(--color-completed)',
                    cursor: 'pointer',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                  onClick={() => openReceiptModal(task)}
                  title="Clique para ver ou baixar o recibo de entrega"
                >
                  <FileCheck size={12} /> Recibo: {task.receiptProtocol ? `#${task.receiptProtocol}` : 'Anexo OK'}
                </span>
              )}

              {/* Recurrence Badge */}
              {task.isRecurring && (
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                    color: '#a78bfa', 
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.65rem'
                  }}
                  title={`Tarefa Recorrente (${task.recurrenceFrequency || 'Mensal'}) com vencimento todo dia ${task.recurrenceDay || 10}`}
                >
                  <Repeat size={11} /> {task.recurrenceFrequency || 'Mensal'} • Dia {task.recurrenceDay || 10}
                </span>
              )}
            </div>

            <h4 className="task-title">{task.title}</h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={12} /> <strong>Empresa:</strong> {task.client}
            </div>
          </div>
          <span className={`badge priority-${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>

        {/* Body / Description */}
        <p className="task-description">{task.description || 'Sem descrição detalhada.'}</p>

        {/* Checklist Section */}
        {totalItems > 0 && (
          <div className="task-checklist-section">
            <div className="checklist-header">
              <span>Checklist de Controle</span>
              <span>{completedItems}/{totalItems} ({Math.round(progressPct)}%)</span>
            </div>
            
            <div className="checklist-progress-bar">
              <div className="checklist-progress-fill" style={{ width: `${progressPct}%` }}></div>
            </div>

            <div className="checklist-items">
              {task.checklist.map((item, idx) => (
                <label key={idx} className={`checklist-item ${item.done ? 'done' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={item.done} 
                    onChange={() => handleToggleChecklistInCard(task.id, idx)}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="task-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span className="task-assignee">
              <User size={12} /> {task.assignee}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              <Calendar size={12} /> Vence em {formatDate(task.dueDate)}
            </span>
          </div>

          <div className="task-actions">
            {/* Renew Next Month Button for Recurring Tasks */}
            {task.isRecurring && onRenewTask && (
              <button 
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.4)' }}
                onClick={() => onRenewTask(task)}
                title={`Gerar próxima competência da tarefa (Dia ${task.recurrenceDay || 10})`}
              >
                <Repeat size={12} /> Próximo ciclo
              </button>
            )}

            {/* Attach Receipt Button */}
            <button 
              className={`btn btn-sm ${hasReceipt ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
              onClick={() => openReceiptModal(task)}
              title={hasReceipt ? "Ver/Editar Recibo de Entrega" : "Anexar Recibo de Entrega (SPED/DAS)"}
            >
              <Paperclip size={12} /> {hasReceipt ? 'Recibo' : '+ Recibo'}
            </button>

            <button 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '4px 8px' }} 
              onClick={() => openEditModal(task)}
              title="Editar Tarefa"
            >
              <Edit size={12} />
            </button>
            <button 
              className="btn btn-danger btn-sm" 
              style={{ padding: '4px 8px' }} 
              onClick={() => {
                if (confirm(`Excluir a tarefa "${task.title}"?`)) {
                  onDeleteTask(task.id);
                }
              }}
              title="Excluir tarefa (somente gestor)" disabled={!canManage}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div className="tasks-toolbar">
        <div className="filters-group">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar por obrigação, cliente, competência ou protocolo..." 
              className="form-control search-input" 
              style={{ paddingLeft: '36px', minWidth: '280px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            
            {/* Filtro de Competência Contábil */}
            <select 
              className="user-select" 
              value={competenciaFilter}
              onChange={(e) => setCompetenciaFilter(e.target.value)}
              style={{ 
                fontWeight: '600', 
                borderColor: competenciaFilter !== 'Todos' ? 'var(--accent-cyan)' : 'var(--border-color)',
                backgroundColor: competenciaFilter !== 'Todos' ? 'rgba(6, 182, 212, 0.08)' : 'transparent'
              }}
            >
              <option value="Todos">📅 Todas as Competências</option>
              {competenciaOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  📅 {opt.label}
                </option>
              ))}
            </select>

            <select 
              className="user-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluídos</option>
            </select>

            <select 
              className="user-select" 
              value={recurrenceFilter}
              onChange={(e) => setRecurrenceFilter(e.target.value)}
            >
              <option value="Todos">Recorrência: Todas</option>
              <option value="Recorrentes">🔁 Apenas Recorrentes</option>
              <option value="Avulsas">Tarefas Avulsas</option>
            </select>

            <select 
              className="user-select" 
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value)}
            >
              <option value="Todos">Recibos: Todos</option>
              <option value="Com Recibo">Com Recibo Anexado</option>
              <option value="Sem Recibo">Sem Recibo Anexado</option>
            </select>

            <select 
              className="user-select" 
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="Todos">Todos os Responsáveis</option>
              {team.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>

            <select 
              className="user-select" 
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="Todos">Todas as Prioridades</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Alternador de Modo de Visualização: Lista Geral vs Por Competência */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setViewMode('list')}
              title="Visualização em Lista Geral"
            >
              <CheckSquare size={13} /> Lista Geral
            </button>
            <button 
              type="button"
              className={`btn btn-sm ${viewMode === 'competence' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setViewMode('competence')}
              title="Visualização Agrupada por Competência Contábil"
            >
              <CalendarDays size={13} /> Por Competência
            </button>
          </div>

          {tasks.length > 0 && onClearAllTasks && (
            <button 
              className="btn btn-secondary" 
              style={{ color: 'var(--color-critical)', borderColor: 'rgba(239, 68, 68, 0.3)' }} 
              onClick={onClearAllTasks}
              title="Limpar e excluir todas as tarefas cadastradas"
            >
              <Trash2 size={15} /> Limpar Todas
            </button>
          )}
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Exibição das Tarefas */}
      {filteredTasks.length === 0 ? (
        tasks.length === 0 ? (
          <div 
            className="card-panel" 
            style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border-color)'
            }}
          >
            <div style={{ backgroundColor: 'rgba(15, 82, 158, 0.15)', padding: '20px', borderRadius: '50%', color: 'var(--primary-light)' }}>
              <CheckSquare size={40} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Nenhuma tarefa cadastrada
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 auto' }}>
                O painel está limpo. Você tem total liberdade para cadastrar as tarefas individuais que quiser ou atrelar tarefas em lote às empresas clientes por competência.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={() => openCreateModal()}>
                <Plus size={16} /> Cadastrar Nova Tarefa
              </button>
              {onNavigateView && (
                <button className="btn btn-secondary" onClick={() => onNavigateView('automation')}>
                  <Layers size={16} /> Atrelar às Empresas em Lote
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Nenhuma tarefa encontrada com os filtros selecionados.
          </div>
        )
      ) : viewMode === 'competence' ? (
        /* Visualização Agrupada por Competência Contábil */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedByComp.map(grp => {
            const isExpanded = expandedCompetencias[grp.competencia] !== false;

            return (
              <div 
                key={grp.competencia}
                className="card-panel"
                style={{ 
                  padding: 0, 
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {/* Header da Competência */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                  onClick={() => toggleExpandCompetencia(grp.competencia)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(15, 82, 158, 0.2)',
                      color: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(15, 82, 158, 0.3)'
                    }}>
                      <CalendarDays size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '1.15rem', 
                          fontFamily: 'var(--font-title)', 
                          fontWeight: '700', 
                          color: 'var(--text-primary)' 
                        }}>
                          Competência: {grp.label}
                        </h3>
                        <span className="badge" style={{ 
                          backgroundColor: 'rgba(6, 182, 212, 0.15)', 
                          color: 'var(--accent-cyan)',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          {grp.competencia}
                        </span>
                      </div>

                      {/* Mini-Badges de Status da Competência */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>{grp.stats.total}</strong> tarefa(s)
                        </span>
                        <span style={{ color: 'var(--border-color)' }}>•</span>
                        <span className="badge completed" style={{ fontSize: '0.7rem' }}>
                          {grp.stats.completed} Concluída(s)
                        </span>
                        {grp.stats.inProgress > 0 && (
                          <span className="badge inprogress" style={{ fontSize: '0.7rem' }}>
                            {grp.stats.inProgress} Em Andamento
                          </span>
                        )}
                        {grp.stats.pending > 0 && (
                          <span className="badge pending" style={{ fontSize: '0.7rem' }}>
                            {grp.stats.pending} Pendente(s)
                          </span>
                        )}
                        {grp.stats.critical > 0 && (
                          <span className="badge" style={{ 
                            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                            color: '#ef4444', 
                            fontSize: '0.7rem',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            ⚠️ {grp.stats.critical} Crítica(s)
                          </span>
                        )}
                        {grp.stats.withReceipt > 0 && (
                          <span className="badge" style={{ 
                            backgroundColor: 'rgba(16, 185, 129, 0.12)', 
                            color: 'var(--color-completed)', 
                            fontSize: '0.7rem' 
                          }}>
                            📎 {grp.stats.withReceipt} Recibo(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Barra de Progresso e Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ minWidth: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        <span>Fechamento</span>
                        <strong style={{ color: grp.stats.percentage === 100 ? 'var(--color-completed)' : 'var(--text-primary)' }}>
                          {grp.stats.percentage}%
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${grp.stats.percentage}%`, 
                          height: '100%', 
                          backgroundColor: grp.stats.percentage === 100 ? 'var(--color-completed)' : 'var(--primary-light)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>

                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => openCreateModal(grp.competencia)}
                      title={`Cadastrar nova tarefa diretamente para a competência ${grp.competencia}`}
                    >
                      <Plus size={13} /> + Tarefa
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 8px' }}
                      onClick={() => toggleExpandCompetencia(grp.competencia)}
                      title={isExpanded ? 'Recolher tarefas desta competência' : 'Expandir tarefas desta competência'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Grid de Tarefas da Competência */}
                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    <div className="tasks-grid">
                      {grp.tasks.map(task => renderTaskCard(task))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Lista Geral Corrida */
        <div className="tasks-grid">
          {filteredTasks.map(task => renderTaskCard(task))}
        </div>
      )}

      {/* Create/Edit Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="panel-header">
              <h3>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group"><label>Empresa</label><select className="form-control" value={formCompanyId} onChange={e => handleSelectCompany(e.target.value)}><option value="">Sem empresa</option>{companies.map(c => <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>)}</select></div>
              <div className="form-group">
                <label>Título da Obrigação / Rotina *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Apuração Simples Nacional, SPED Fiscal, Fechamento de Folha..." 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              {editingTask && (editingTask.client) && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Building2 size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--primary-light)' }} />
                  <strong>Empresa Vinculada:</strong> {editingTask.client}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Responsável *</label>
                  <select 
                    className="form-control" 
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                  >
                    {team.map(m => (
                      <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Prioridade</label>
                  <select 
                    className="form-control" 
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                  >
                    <option value="Alta">Alta 🔴</option>
                    <option value="Média">Média 🟡</option>
                    <option value="Baixa">Baixa 🟢</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Data de Vencimento *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formDueDate}
                    onChange={(e) => {
                      setFormDueDate(e.target.value);
                      if (e.target.value && !formCompetenciaManual) {
                        const parts = e.target.value.split('-');
                        if (parts.length >= 2) {
                          setFormCompetencia(`${parts[1]}/${parts[0]}`);
                        }
                      }
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Competência de Referência *</label>
                  <select
                    className="form-control"
                    value={formCompetencia}
                    onChange={(e) => {
                      setFormCompetencia(e.target.value);
                      setFormCompetenciaManual(true);
                    }}
                  >
                    {competenciaOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        📅 {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Configuração de Recorrência Mensal */}
              <div 
                style={{ 
                  backgroundColor: formIsRecurring ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)', 
                  border: `1px solid ${formIsRecurring ? 'rgba(139, 92, 246, 0.35)' : 'var(--border-color)'}`, 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '12px 14px' 
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', color: formIsRecurring ? '#a78bfa' : 'var(--text-primary)', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={formIsRecurring} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormIsRecurring(checked);
                      if (checked && !formRecurrenceDay) {
                        setFormRecurrenceDay(10);
                      }
                    }} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Repeat size={16} /> Tarefa recorrente (repetir conforme a frequência)
                  </span>
                </label>

                {formIsRecurring && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                          Frequência
                        </label>
                        <select 
                          className="form-control" 
                          value={formRecurrenceFrequency}
                          onChange={(e) => setFormRecurrenceFrequency(e.target.value)}
                          style={{ fontSize: '0.85rem' }}
                        >
                          <option value="Mensal">Mensal (Padrão Contábil)</option>
                          <option value="Bimestral">Bimestral</option>
                          <option value="Trimestral">Trimestral</option>
                          <option value="Semestral">Semestral</option>
                          <option value="Anual">Anual</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                          Vencimento Fixo:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Todo dia</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="31" 
                            className="form-control" 
                            value={formRecurrenceDay}
                            onChange={(e) => {
                              const day = parseInt(e.target.value, 10) || 1;
                              setFormRecurrenceDay(day);
                              if (formDueDate) {
                                const parts = formDueDate.split('-');
                                if (parts.length === 3) {
                                  setFormDueDate(`${parts[0]}-${parts[1]}-${String(day).padStart(2, '0')}`);
                                }
                              }
                            }}
                            style={{ width: '80px', fontWeight: '700', textAlign: 'center' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick shortcuts for accounting due days */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Atalhos contábeis comuns: </span>
                      <div style={{ display: 'inline-flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Dia 07 (Folha/FGTS)', day: 7 },
                          { label: 'Dia 10 (Impostos/ISS)', day: 10 },
                          { label: 'Dia 15 (SPED/DCTF)', day: 15 },
                          { label: 'Dia 20 (Simples DAS)', day: 20 }
                        ].map(shortcut => (
                          <button
                            key={shortcut.day}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              padding: '2px 8px', 
                              fontSize: '0.7rem',
                              borderColor: formRecurrenceDay === shortcut.day ? '#a78bfa' : 'var(--border-color)',
                              backgroundColor: formRecurrenceDay === shortcut.day ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                              color: formRecurrenceDay === shortcut.day ? '#a78bfa' : 'var(--text-secondary)'
                            }}
                            onClick={() => {
                              setFormRecurrenceDay(shortcut.day);
                              const today = new Date();
                              let y = today.getFullYear();
                              let m = String(today.getMonth() + 1).padStart(2, '0');
                              if (formDueDate) {
                                const parts = formDueDate.split('-');
                                if (parts.length === 3) {
                                  y = parts[0];
                                  m = parts[1];
                                }
                              }
                              setFormDueDate(`${y}-${m}-${String(shortcut.day).padStart(2, '0')}`);
                            }}
                          >
                            {shortcut.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                      🔁 <strong>Automação Ativa:</strong> Ao concluir esta tarefa ou anexar o recibo, o sistema agenda automaticamente a próxima competência, conforme a frequência selecionada, para o <strong>dia {formRecurrenceDay}</strong> com checklist limpo.
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Descrição / Instruções</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Instruções específicas para a execução fiscal/contábil..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Checklist builder in form */}
              <div className="form-group" style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Passos de Execução (Checklist)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formChecklist.length} itens</span>
                </label>
                
                {formChecklist.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '6px 0 10px 0' }}>
                    Nenhum passo adicionado ainda (opcional). Adicione os passos específicos da sua rotina abaixo:
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '140px', overflowY: 'auto' }}>
                    {formChecklist.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.8rem' }}>{item.text}</span>
                        <button 
                          type="button" 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleRemoveChecklistItem(idx)}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Adicionar novo passo..." 
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0 12px' }}
                    onClick={handleAddChecklistItem}
                  >
                    <PlusCircle size={16} />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Recibo de Entrega / Comprovante Modal */}
      {receiptModalTask && (
        <div className="modal-overlay" onClick={() => setReceiptModalTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={20} style={{ color: 'var(--color-completed)' }} />
                <h3>Recibo de Entrega e Transmissão Oficial</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setReceiptModalTask(null)}>Fechar</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Obrigação / Cliente:</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{receiptModalTask.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>{receiptModalTask.client}</div>
              </div>

              <div className="form-group">
                <label>Número do Protocolo / Recibo de Entrega *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: SPED-2026-9812-7312 ou Recibo PGDAS-D..." 
                  value={receiptProtocol}
                  onChange={(e) => setReceiptProtocol(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Data de Transmissão à Receita / SEFAZ</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>

              {/* File Attachment Upload */}
              <div className="form-group">
                <label>Arquivo do Comprovante (PDF, JPG ou PNG)</label>
                <div style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '20px', 
                  textAlign: 'center',
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }}>
                  <UploadCloud size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                  <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                    {receiptFileName ? (
                      <span style={{ color: 'var(--color-completed)', fontWeight: '600' }}>
                        📎 Arquivo anexado: {receiptFileName}
                      </span>
                    ) : (
                      'Clique para selecionar o recibo do PVA ou e-CAC'
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="application/pdf,image/jpeg,image/png"
                    id="receiptFileInput"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFileUpload}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <label htmlFor="receiptFileInput" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                      Selecionar Arquivo
                    </label>
                    {(receiptFileData || receiptModalTask.receiptPath) && <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadReceipt(receiptModalTask)}><Download size={13} /> Baixar comprovante</button>}
                  </div>
                </div>
              </div>

              <label className="checklist-item" style={{ cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={autoCompleteWithReceipt}
                  onChange={(e) => setAutoCompleteWithReceipt(e.target.checked)}
                />
                <span style={{ fontSize: '0.85rem' }}>
                  Marcar automaticamente a tarefa como <strong>Concluída</strong> ao anexar este recibo
                </span>
              </label>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={handleSaveReceipt}
                >
                  <FileCheck size={16} /> Salvar e Validar Recibo
                </button>
                {(receiptModalTask.receiptProtocol || receiptModalTask.receiptFileName) && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleRemoveReceipt}
                    title="Remover Recibo Anexado"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
