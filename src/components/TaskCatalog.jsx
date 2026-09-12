import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Repeat, 
  User, 
  Calendar, 
  Layers, 
  FileText,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

export default function TaskCatalog({ 
  taskCatalog = [], 
  team = [], 
  onAddTaskToCatalog, 
  onUpdateCatalogTask, 
  onDeleteCatalogTask, 
  onNavigateToLinking 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [recurrenceFilter, setRecurrenceFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form State - ZERO campos de empresa/cliente
  const [formTitle, setFormTitle] = useState('');
  const [formAssignee, setFormAssignee] = useState(team[0]?.name || 'Alan Gomes');
  const [formPriority, setFormPriority] = useState('Média');
  const [formDesc, setFormDesc] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formRecurrenceFrequency, setFormRecurrenceFrequency] = useState('Mensal');
  const [formRecurrenceDay, setFormRecurrenceDay] = useState(10);
  const [formChecklist, setFormChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormAssignee(team[0]?.name || 'Alan Gomes');
    setFormPriority('Média');
    setFormDesc('');
    setFormIsRecurring(true);
    setFormRecurrenceFrequency('Mensal');
    setFormRecurrenceDay(10);
    setFormChecklist([]);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormAssignee(task.defaultAssignee || team[0]?.name || 'Alan Gomes');
    setFormPriority(task.priority || 'Média');
    setFormDesc(task.description || '');
    setFormIsRecurring(task.isRecurring !== false);
    setFormRecurrenceFrequency(task.recurrenceFrequency || 'Mensal');
    setFormRecurrenceDay(task.recurrenceDay || 10);
    setFormChecklist(task.checklist || []);
    setIsModalOpen(true);
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormChecklist([...formChecklist, { text: newChecklistItem.trim(), done: false }]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (idx) => {
    setFormChecklist(formChecklist.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, informe o título da tarefa/rotina.');
      return;
    }

    const taskData = {
      title: formTitle.trim(),
      defaultAssignee: formAssignee,
      priority: formPriority,
      description: formDesc.trim(),
      isRecurring: formIsRecurring,
      recurrenceFrequency: formIsRecurring ? formRecurrenceFrequency : null,
      recurrenceDay: formIsRecurring ? formRecurrenceDay : null,
      checklist: formChecklist
    };

    if (editingTask) {
      onUpdateCatalogTask(editingTask.id, taskData);
    } else {
      onAddTaskToCatalog(taskData);
    }

    setIsModalOpen(false);
  };

  // Filter tasks
  const filteredCatalog = taskCatalog.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'Todos' || task.priority === priorityFilter;
    
    let matchesRecurrence = true;
    if (recurrenceFilter === 'Recorrentes') {
      matchesRecurrence = Boolean(task.isRecurring);
    } else if (recurrenceFilter === 'Avulsas') {
      matchesRecurrence = !task.isRecurring;
    }

    return matchesSearch && matchesPriority && matchesRecurrence;
  });

  return (
    <div>
      {/* Header Info */}
      <div className="card-panel" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(15, 82, 158, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={20} style={{ color: '#a78bfa' }} />
              Cadastro de Tarefas & Rotinas Contábeis
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Cadastre e gerencie as rotinas do escritório (ex: Simples Nacional, SPED, Folha, Alvarás). O vínculo com as empresas é feito na tela <strong>"Atrelar às Empresas"</strong>.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> + Cadastrar Nova Tarefa
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <div className="filters-group">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nome da tarefa ou descrição..." 
              className="form-control search-input" 
              style={{ paddingLeft: '36px', minWidth: '280px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            
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
      </div>

      {/* Grid of Tasks */}
      {filteredCatalog.length === 0 ? (
        taskCatalog.length === 0 ? (
          <div 
            className="card-panel" 
            style={{ 
              textAlign: 'center', 
              padding: '64px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px',
              border: '1px dashed var(--border-color)'
            }}
          >
            <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: '20px', borderRadius: '50%', color: '#a78bfa' }}>
              <CheckSquare size={40} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>
                Nenhuma tarefa cadastrada no catálogo
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 auto' }}>
                Cadastre as tarefas e rotinas que seu escritório realiza (ex: <em>Simples Nacional vencendo todo dia 10</em>, <em>SPED Fiscal vencendo dia 15</em>). Depois, você poderá atrelar cada tarefa às empresas desejadas.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ marginTop: '8px' }}>
              <Plus size={16} /> Cadastrar Minha Primeira Tarefa
            </button>
          </div>
        ) : (
          <div className="card-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Nenhuma tarefa encontrada com os filtros selecionados.
          </div>
        )
      ) : (
        <div className="tasks-grid">
          {filteredCatalog.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {task.isRecurring ? (
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
                      >
                        <Repeat size={11} /> {task.recurrenceFrequency || 'Mensal'} • Vence todo dia {task.recurrenceDay || 10}
                      </span>
                    ) : (
                      <span className="badge pending" style={{ fontSize: '0.65rem' }}>
                        Tarefa Avulsa
                      </span>
                    )}
                  </div>

                  <h4 className="task-title" style={{ fontSize: '1.1rem' }}>{task.title}</h4>
                </div>
                <span className={`badge priority-${(task.priority || 'Média').toLowerCase()}`}>
                  {task.priority || 'Média'}
                </span>
              </div>

              {/* Description */}
              <p className="task-description">
                {task.description || 'Sem instruções adicionais cadastradas.'}
              </p>

              {/* Checklist Count */}
              {task.checklist && task.checklist.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.15)', padding: '8px 12px', borderRadius: '4px', margin: '10px 0' }}>
                  <strong>Checklist:</strong> {task.checklist.length} passo(s) cadastrado(s)
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {task.checklist.slice(0, 3).map((item, i) => (
                      <li key={i}>{item.text}</li>
                    ))}
                    {task.checklist.length > 3 && (
                      <li>...e mais {task.checklist.length - 3} passo(s)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="task-footer" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                <span className="task-assignee">
                  <User size={12} /> {task.defaultAssignee || 'Geral'}
                </span>

                <div className="task-actions">
                  {onNavigateToLinking && (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onNavigateToLinking(task.id)}
                      title="Atrelar esta tarefa às empresas clientes"
                    >
                      <Layers size={13} /> Atrelar a Empresas
                    </button>
                  )}

                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '4px 8px' }} 
                    onClick={() => openEditModal(task)}
                    title="Editar Definição da Tarefa"
                  >
                    <Edit size={12} />
                  </button>

                  <button 
                    className="btn btn-danger btn-sm" 
                    style={{ padding: '4px 8px' }} 
                    onClick={() => {
                      if (confirm(`Deseja excluir a rotina "${task.title}" do catálogo?`)) {
                        onDeleteCatalogTask(task.id);
                      }
                    }}
                    title="Excluir Tarefa do Catálogo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar / Editar Tarefa (SEM EMPRESA / CLIENTE) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} style={{ color: '#a78bfa' }} />
                <h3>{editingTask ? 'Editar Tarefa' : 'Cadastrar Nova Tarefa'}</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Título da Tarefa / Rotina *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Apuração Simples Nacional, SPED Fiscal, Alvará de Funcionamento..." 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Responsável Padrão no Escritório</label>
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

              {/* Recorrência Mensal */}
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
                    onChange={(e) => setFormIsRecurring(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Repeat size={16} /> Tarefa Recorrente (Repetir todo mês)
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
                            onChange={(e) => setFormRecurrenceDay(parseInt(e.target.value, 10) || 1)}
                            style={{ width: '80px', fontWeight: '700', textAlign: 'center' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Atalhos Rápidos */}
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
                            onClick={() => setFormRecurrenceDay(shortcut.day)}
                          >
                            {shortcut.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div className="form-group">
                <label>Descrição / Instruções da Tarefa</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  placeholder="Orientações e detalhes operacionais para a execução..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Checklist */}
              <div className="form-group" style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Passos de Execução (Checklist)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formChecklist.length} passo(s)</span>
                </label>

                {formChecklist.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '4px 0 10px 0', fontStyle: 'italic' }}>
                    Nenhum passo adicionado ainda (opcional). Adicione os passos específicos abaixo:
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', maxHeight: '120px', overflowY: 'auto' }}>
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
                    placeholder="Adicionar novo passo ao checklist..." 
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Salvar Alterações' : 'Salvar no Catálogo de Tarefas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
