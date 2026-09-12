import React, { useState } from 'react';
import { 
  UserCheck, 
  ShieldAlert, 
  Award, 
  TrendingUp, 
  Plus, 
  Search, 
  Building2, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Filter, 
  Users, 
  Layers, 
  Briefcase, 
  Mail, 
  X, 
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function TeamManagement({ 
  team = [], 
  tasks = [], 
  companies = [], 
  onAddTeamMember, 
  onUpdateTeamMember, 
  onDeleteTeamMember, 
  onAssignCompaniesToUser, 
  currentUser,
  userSession
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');

  // Modal 1: User Add / Edit State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Analista');
  const [formCustomRole, setFormCustomRole] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Modal 2: Assign Companies to User State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [companyRegimeFilter, setCompanyRegimeFilter] = useState('Todos');

  // --------------------------------------------------------------------------
  // User Modal Handlers
  // --------------------------------------------------------------------------
  const openCreateUserModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormRole('Analista');
    setFormCustomRole('');
    setFormEmail('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (member) => {
    setEditingUser(member);
    setFormName(member.name);
    const standardRoles = ['Gestor', 'Coordenador', 'Analista', 'Assistente'];
    if (standardRoles.includes(member.role)) {
      setFormRole(member.role);
      setFormCustomRole('');
    } else {
      setFormRole('Outro');
      setFormCustomRole(member.role);
    }
    setFormEmail(member.email || '');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    const finalName = formName.trim();
    if (!finalName) {
      alert('Por favor, informe o nome do usuário.');
      return;
    }

    const finalRole = formRole === 'Outro' 
      ? (formCustomRole.trim() || 'Colaborador') 
      : formRole;

    const userData = {
      name: finalName,
      role: finalRole,
      email: formEmail.trim() || `${finalName.toLowerCase().replace(/\s+/g, '.')}@gestaocontabil.com.br`
    };

    if (editingUser) {
      onUpdateTeamMember(editingUser.id, userData);
    } else {
      onAddTeamMember(userData);
    }

    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (member) => {
    if (userSession && (userSession.id === member.id || userSession.name === member.name)) {
      alert('Você não pode excluir o usuário conectado na sessão atual.');
      return;
    }

    if (team.length <= 1) {
      alert('O sistema não pode ficar sem nenhum usuário cadastrado.');
      return;
    }

    const assignedCount = companies.filter(c => c.defaultAssignee === member.name).length;
    let confirmMsg = `Deseja realmente excluir o usuário "${member.name}" (${member.role})?`;
    if (assignedCount > 0) {
      confirmMsg += `\n\nAtenção: Existem ${assignedCount} empresa(s) na carteira deste usuário. Elas ficarão sem responsável definido até serem reatribuídas.`;
    }

    if (window.confirm(confirmMsg)) {
      onDeleteTeamMember(member.id);
    }
  };

  // --------------------------------------------------------------------------
  // Company Assignment Modal Handlers
  // --------------------------------------------------------------------------
  const openAssignModal = (member) => {
    setTargetMember(member);
    // Pre-populate with companies currently assigned to this member
    const currentlyAssigned = companies
      .filter(c => c.defaultAssignee === member.name)
      .map(c => c.id);
    setSelectedCompanyIds(currentlyAssigned);
    setCompanySearchTerm('');
    setCompanyRegimeFilter('Todos');
    setIsAssignModalOpen(true);
  };

  const toggleSelectCompany = (companyId) => {
    setSelectedCompanyIds(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAllFilteredCompanies = (filteredList) => {
    const ids = filteredList.map(c => c.id);
    setSelectedCompanyIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAllFilteredCompanies = (filteredList) => {
    const idsToRemove = new Set(filteredList.map(c => c.id));
    setSelectedCompanyIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  const handleSaveCompanyAssignment = () => {
    if (!targetMember) return;
    onAssignCompaniesToUser(targetMember.name, selectedCompanyIds);
    setIsAssignModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // Statistics & Helpers
  // --------------------------------------------------------------------------
  const getMemberStats = (name) => {
    const memberTasks = tasks.filter(t => t.assignee === name);
    const total = memberTasks.length;
    const completed = memberTasks.filter(t => t.status === 'Concluído').length;
    const active = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, rate };
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'Gestor': return <ShieldAlert size={16} style={{ color: 'var(--accent-purple)' }} />;
      case 'Coordenador': return <Award size={16} style={{ color: 'var(--color-pending)' }} />;
      case 'Analista': return <UserCheck size={16} style={{ color: 'var(--color-inprogress)' }} />;
      case 'Assistente': return <UserCheck size={16} style={{ color: 'var(--color-completed)' }} />;
      default: return <UserCheck size={16} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  // Filtered members
  const filteredTeam = team.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'Todos' || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Filtered companies in assignment modal
  const filteredModalCompanies = companies.filter(c => {
    const matchesSearch = 
      (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(companySearchTerm.toLowerCase())) ||
      (c.razaoSocial && c.razaoSocial.toLowerCase().includes(companySearchTerm.toLowerCase())) ||
      (c.cnpj && c.cnpj.includes(companySearchTerm));
    
    const matchesRegime = companyRegimeFilter === 'Todos' || c.regime === companyRegimeFilter;

    return matchesSearch && matchesRegime;
  });

  // Total summary
  const totalAssignedCompanies = companies.filter(c => c.defaultAssignee).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Card */}
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ backgroundColor: 'rgba(15, 82, 158, 0.2)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary-light)' }}>
                <Users size={22} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  Gestão da Equipe & Carteira de Empresas
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Cadastre novos usuários, gerencie cargos, remova colaboradores e atrele as empresas clientes aos responsáveis.
                </p>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={openCreateUserModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Cadastrar Novo Usuário
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--color-inprogress)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Usuários na Equipe
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {team.length}
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--color-completed)' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Empresas Atreladas
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {totalAssignedCompanies} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>/ {companies.length} empresas</span>
            </div>
          </div>
        </div>

        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-purple)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
              Tarefas em Andamento
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {tasks.filter(t => t.status !== 'Concluído').length}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="tasks-toolbar" style={{ margin: 0 }}>
        <div className="filters-group" style={{ flex: 1 }}>
          <div className="search-input" style={{ minWidth: '240px', flex: 1, maxWidth: '360px' }}>
            <input 
              type="text" 
              placeholder="Buscar por nome, cargo ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="Todos">Todos os Cargos</option>
              <option value="Gestor">Gestor</option>
              <option value="Coordenador">Coordenador</option>
              <option value="Analista">Analista</option>
              <option value="Assistente">Assistente</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Exibindo <strong>{filteredTeam.length}</strong> de <strong>{team.length}</strong> colaboradores
        </div>
      </div>

      {/* Grid of Team Members */}
      {filteredTeam.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Nenhum colaborador encontrado com os filtros informados.
        </div>
      ) : (
        <div className="team-grid">
          {filteredTeam.map(member => {
            const stats = getMemberStats(member.name);
            const initials = member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            
            // Get companies assigned to this member
            const memberCompanies = companies.filter(c => c.defaultAssignee === member.name);

            // Check if this card represents the currently logged in user
            const isCurrentSessionUser = Boolean(
              userSession && (userSession.id === member.id || userSession.name === member.name)
            );

            return (
              <div 
                key={member.id} 
                className="member-card" 
                style={{ 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderColor: isCurrentSessionUser ? 'rgba(79, 70, 229, 0.4)' : 'var(--border-color)'
                }}
              >
                {/* Top Action Buttons (Edit & Delete) */}
                <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px', width: '28px', height: '28px' }}
                    onClick={() => openEditUserModal(member)}
                    title={`Editar dados de ${member.name}`}
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ 
                      padding: '5px', 
                      width: '28px', 
                      height: '28px',
                      opacity: isCurrentSessionUser ? 0.4 : 1,
                      cursor: isCurrentSessionUser ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => handleDeleteUser(member)}
                    title={isCurrentSessionUser ? "Você não pode excluir o usuário da sessão ativa" : `Excluir ${member.name}`}
                    disabled={isCurrentSessionUser}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Avatar & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginTop: '4px' }}>
                  <div className="member-avatar">
                    {initials}
                  </div>
                  
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <h4 className="member-name" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {member.name}
                      {isCurrentSessionUser && (
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            padding: '1px 6px', 
                            borderRadius: '50px', 
                            backgroundColor: 'rgba(79, 70, 229, 0.2)', 
                            color: 'var(--primary-light)',
                            fontWeight: '600'
                          }}
                        >
                          Você
                        </span>
                      )}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '4px 0' }}>
                      {getRoleIcon(member.role)}
                      <span className="member-role">{member.role}</span>
                    </div>

                    {member.email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <Mail size={12} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }}>
                          {member.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Companies Section */}
                <div 
                  style={{ 
                    width: '100%', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px',
                    margin: '12px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      <Building2 size={13} style={{ color: 'var(--primary-light)' }} />
                      <span>Empresas na Carteira ({memberCompanies.length})</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--primary-light)', borderColor: 'rgba(79, 70, 229, 0.3)' }}
                      onClick={() => openAssignModal(member)}
                      title={`Gerenciar empresas atreladas a ${member.name}`}
                    >
                      Gerenciar
                    </button>
                  </div>

                  {memberCompanies.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0', textAlign: 'center' }}>
                      Nenhuma empresa atrelada ainda.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '70px', overflowY: 'auto' }}>
                      {memberCompanies.map(c => (
                        <span 
                          key={c.id} 
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 8px', 
                            backgroundColor: 'rgba(15, 82, 158, 0.15)', 
                            color: 'var(--primary-light)', 
                            borderRadius: '4px',
                            border: '1px solid rgba(15, 82, 158, 0.3)',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={c.razaoSocial || c.nomeFantasia}
                        >
                          {c.nomeFantasia || c.razaoSocial}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => openAssignModal(member)}
                  >
                    <Layers size={13} /> Atrelar Empresas
                  </button>
                </div>

                {/* Workload Stats */}
                <div className="member-stats" style={{ margin: 0, padding: '10px 0 0 0' }}>
                  <div className="stat-item">
                    <div className="stat-val">{stats.active}</div>
                    <div className="stat-lbl">Ativas</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-val" style={{ color: 'var(--color-completed)' }}>{stats.completed}</div>
                    <div className="stat-lbl">Concluídas</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-val" style={{ color: 'var(--accent-cyan)' }}>{stats.rate}%</div>
                    <div className="stat-lbl">Eficácia</div>
                  </div>
                </div>

                {/* Performance Indicator Bar */}
                <div style={{ width: '100%', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    <span>Taxa de Entrega</span>
                    <span>{stats.completed}/{stats.total} Tarefas</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${stats.rate}%`, 
                        background: 'linear-gradient(to right, var(--primary), var(--accent-cyan))',
                        transition: 'width 0.5s ease' 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Productivity Insights Card */}
      <div className="card-panel" style={{ marginTop: '12px' }}>
        <div className="panel-header">
          <h3>📈 Regras de Distribuição & Carteira</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-completed)', flexShrink: 0 }} />
            <span>
              <strong>Atribuição Automática:</strong> As empresas atreladas a cada colaborador serão automaticamente sugeridas como responsável padrão ao disparar novas rotinas e tarefas contábeis.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Building2 size={16} style={{ color: 'var(--primary-light)', flexShrink: 0 }} />
            <span>
              <strong>Transferência de Carteira:</strong> Você pode transferir empresas de um colaborador para outro a qualquer momento abrindo o botão <em>"Atrelar Empresas"</em> do novo responsável e marcando as empresas desejadas.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Cadastrar / Editar Usuário                                      */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUserModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="panel-header">
              <h3>{editingUser ? `Editar Usuário: ${editingUser.name}` : 'Cadastrar Novo Usuário'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsUserModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Nome Completo do Colaborador *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Mariana Silva, Rodrigo Santos..." 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Cargo / Função na Contabilidade *</label>
                <select 
                  className="form-control" 
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  <option value="Gestor">Gestor / Sócio</option>
                  <option value="Coordenador">Coordenador Contábil/Fiscal</option>
                  <option value="Analista">Analista Contábil/Fiscal</option>
                  <option value="Assistente">Assistente Contábil</option>
                  <option value="Outro">Outro (Personalizado)</option>
                </select>
              </div>

              {formRole === 'Outro' && (
                <div className="form-group">
                  <label>Especifique o Cargo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Auditor Fiscal, Auxiliar de Departamento Pessoal..." 
                    value={formCustomRole}
                    onChange={(e) => setFormCustomRole(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>E-mail Corporativo</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="Ex: nome@gestaocontabil.com.br" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Este e-mail poderá ser utilizado para login e notificações do sistema.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUserModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Atrelar Empresas ao Colaborador                                 */}
      {/* ========================================================================= */}
      {isAssignModalOpen && targetMember && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} style={{ color: 'var(--primary-light)' }} />
                  <h3>Atrelar Empresas à Carteira</h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Colaborador: <strong style={{ color: 'var(--text-primary)' }}>{targetMember.name}</strong> ({targetMember.role})
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAssignModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
              Selecione as empresas clientes que ficarão sob a responsabilidade de <strong>{targetMember.name}</strong>. Ao atrelar, o colaborador passará a ser o responsável padrão da empresa no sistema.
            </div>

            {/* Filters and Search */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Filtrar por nome da empresa ou CNPJ..." 
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <select 
                className="form-control" 
                value={companyRegimeFilter}
                onChange={(e) => setCompanyRegimeFilter(e.target.value)}
                style={{ width: 'auto', fontSize: '0.85rem' }}
              >
                <option value="Todos">Todos os Regimes</option>
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
                <option value="MEI">MEI</option>
              </select>
            </div>

            {/* Batch actions & Counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selecionadas: </span>
                <strong style={{ color: selectedCompanyIds.length > 0 ? 'var(--primary-light)' : 'var(--text-primary)' }}>
                  {selectedCompanyIds.length} de {companies.length} empresas
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => handleSelectAllFilteredCompanies(filteredModalCompanies)}
                >
                  Marcar Filtradas
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => handleDeselectAllFilteredCompanies(filteredModalCompanies)}
                >
                  Desmarcar Filtradas
                </button>
              </div>
            </div>

            {/* Scrollable list of companies */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'rgba(0,0,0,0.15)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '360px'
              }}
            >
              {filteredModalCompanies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Nenhuma empresa encontrada com os filtros informados.
                </div>
              ) : (
                filteredModalCompanies.map(company => {
                  const isChecked = selectedCompanyIds.includes(company.id);
                  const isCurrentlyAssignedToThisUser = company.defaultAssignee === targetMember.name;
                  const isAssignedToOther = company.defaultAssignee && !isCurrentlyAssignedToThisUser;

                  return (
                    <div 
                      key={company.id}
                      onClick={() => toggleSelectCompany(company.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: isChecked ? 'rgba(15, 82, 158, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isChecked ? 'rgba(15, 82, 158, 0.4)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div onClick
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />

                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {company.nomeFantasia || company.razaoSocial}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>CNPJ: {company.cnpj}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--primary-light)' }}>{company.regime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Current Assignment Badge */}
                      <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                        {isCurrentlyAssignedToThisUser ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '50px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-completed)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            🟢 Na carteira atual
                          </span>
                        ) : isAssignedToOther ? (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '50px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-pending)', border: '1px solid rgba(245, 158, 11, 0.3)' }} title={`Atualmente com ${company.defaultAssignee}. Ao marcar, será transferida para ${targetMember.name}.`}>
                            🟠 Com: {company.defaultAssignee}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '50px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                            ⚪ Sem responsável
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {selectedCompanyIds.length} empresa(s) serão vinculadas a <strong>{targetMember.name}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSaveCompanyAssignment}
                >
                  <Check size={16} /> Salvar Carteira ({selectedCompanyIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
