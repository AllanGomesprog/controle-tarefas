import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Hash, 
  Sparkles,
  Loader2,
  } from 'lucide-react';

export default function CompanyManagement({ canManage = false,
  companies, 
  team, 
  onAddCompany, 
  onUpdateCompany, 
  onDeleteCompany, 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [regimeFilter, setRegimeFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  // Receita Federal lookup state
  const [isSearchingReceita, setIsSearchingReceita] = useState(false);
  const [receitaMessage, setReceitaMessage] = useState(null);

  // Form states
  const [formRazao, setFormRazao] = useState('');
  const [formFantasia, setFormFantasia] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formRegime, setFormRegime] = useState('Simples Nacional');
  const [formAssignee, setFormAssignee] = useState(team[0]?.name || 'Fernanda');
  const [formStatus, setFormStatus] = useState('Ativa');
  const [formNotes, setFormNotes] = useState('');

  const openCreateModal = () => {
    setEditingCompany(null);
    setReceitaMessage(null);
    setFormRazao('');
    setFormFantasia('');
    setFormCnpj('');
    setFormRegime('Simples Nacional');
    setFormAssignee(team[0]?.name || 'Fernanda');
    setFormStatus('Ativa');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (comp) => {
    setEditingCompany(comp);
    setFormRazao(comp.razaoSocial || comp.name);
    setFormFantasia(comp.nomeFantasia || '');
    setFormCnpj(comp.cnpj || '');
    setFormRegime(comp.regime || 'Simples Nacional');
    setFormAssignee(comp.defaultAssignee || team[0]?.name || 'Fernanda');
    setFormStatus(comp.status || 'Ativa');
    setFormNotes(comp.notes || '');
    setIsModalOpen(true);
  };

  // Format CNPJ as 00.000.000/0000-00
  const handleCnpjChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 14) val = val.substring(0, 14);
    
    // Formatting mask
    if (val.length > 12) {
      val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    } else if (val.length > 8) {
      val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    } else if (val.length > 5) {
      val = val.replace(/^(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (val.length > 2) {
      val = val.replace(/^(\d{2})(\d{1,3})/, '$1.$2');
    }
    setFormCnpj(val);
    setReceitaMessage(null);
  };

  // Puxar dados da Receita Federal via CNPJ
  const fetchCnpjFromReceita = async (customCnpj = null) => {
    const rawCnpj = (customCnpj || formCnpj).replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      setReceitaMessage({
        type: 'error',
        text: 'Por favor informe um CNPJ completo com 14 dígitos para buscar na Receita Federal.'
      });
      return;
    }

    setIsSearchingReceita(true);
    setReceitaMessage(null);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`);
      if (!res.ok) {
        throw new Error('CNPJ não localizado na base da Receita.');
      }
      const data = await res.json();

      // 1. Razão Social & Fantasia
      if (data.razao_social) {
        setFormRazao(data.razao_social);
      }
      if (data.nome_fantasia) {
        setFormFantasia(data.nome_fantasia);
      } else if (data.razao_social) {
        setFormFantasia(data.razao_social);
      }

      // 2. Regime Tributário
      let regimeIdentificado = 'Simples Nacional';

      if (data.opcao_pelo_mei) {
        regimeIdentificado = 'MEI';
      } else if (data.opcao_pelo_simples) {
        regimeIdentificado = 'Simples Nacional';
      } else {
        regimeIdentificado = formRegime; // A consulta não determina o regime fora do Simples/MEI.
      }

      setFormRegime(regimeIdentificado);

      // 3. Status Cadastral
      if (data.descricao_situacao_cadastral) {
        setFormStatus(data.descricao_situacao_cadastral.toUpperCase() === 'ATIVA' ? 'Ativa' : 'Inativa');
      }

      // 4. Detalhes em Observações
      const notas = [];
      if (data.cnae_fiscal_descricao) {
        notas.push(`CNAE: ${data.cnae_fiscal_descricao}`);
      }
      if (data.municipio && data.uf) {
        notas.push(`Localização: ${data.municipio}/${data.uf}`);
      }
      if (data.natureza_juridica) {
        notas.push(`Natureza: ${data.natureza_juridica}`);
      }
      if (notas.length > 0) {
        setFormNotes(notas.join(' | '));
      }

      setReceitaMessage({
        type: 'success',
        text: `Dados de "${data.razao_social}" importados com sucesso! ${!data.opcao_pelo_mei && !data.opcao_pelo_simples ? 'Confirme o regime tributário manualmente.' : 'Regime: ' + regimeIdentificado} (Situação: ${data.descricao_situacao_cadastral || 'Ativa'}).`
      });
    } catch {
      setReceitaMessage({
        type: 'error',
        text: 'Não foi possível consultar a Receita Federal para este CNPJ. Verifique a numeração ou preencha os dados manualmente.'
      });
    } finally {
      setIsSearchingReceita(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRazao.trim() || !formCnpj.trim()) {
      alert('Por favor preencha a Razão Social e o CNPJ da empresa.');
      return;
    }

    const companyData = {
      name: formRazao.trim(),
      razaoSocial: formRazao.trim(),
      nomeFantasia: formFantasia.trim() || formRazao.trim(),
      cnpj: formCnpj.trim(),
      regime: formRegime,
      defaultAssignee: formAssignee,
      status: formStatus,
      notes: formNotes.trim()
    };

    if (editingCompany) {
      if (!await onUpdateCompany(editingCompany.id, companyData)) return;
    } else {
      if (!await onAddCompany(companyData)) return;
    }

    setIsModalOpen(false);
  };

  // Filter companies
  const filteredCompanies = companies.filter(c => {
    const searchMatch = 
      (c.razaoSocial || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cnpj || '').includes(searchTerm);
    
    const regimeMatch = regimeFilter === 'Todos' || c.regime === regimeFilter;
    const statusMatch = statusFilter === 'Todos' || c.status === statusFilter;

    return searchMatch && regimeMatch && statusMatch;
  });

  const getRegimeColor = (regime) => {
    switch (regime) {
      case 'Simples Nacional': return 'var(--color-pending)';
      case 'Lucro Presumido': return 'var(--primary-light)';
      case 'Lucro Real': return 'var(--accent-purple)';
      case 'MEI': return 'var(--color-completed)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div>
      {/* Header & Actions */}
      <div className="tasks-toolbar">
        <div className="filters-group">
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar por Razão Social, Fantasia ou CNPJ..." 
              className="form-control search-input" 
              style={{ paddingLeft: '36px', width: '320px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            
            <select 
              className="user-select" 
              value={regimeFilter}
              onChange={(e) => setRegimeFilter(e.target.value)}
            >
              <option value="Todos">Todos os Regimes</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
              <option value="MEI">MEI</option>
            </select>

            <select 
              className="user-select" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Ativa">Ativas</option>
              <option value="Inativa">Inativas</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Cadastrar Empresa
        </button>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--color-pending)' }}>
          <div className="kpi-info">
            <h3>Simples Nacional</h3>
            <div className="kpi-value">
              {companies.filter(c => c.regime === 'Simples Nacional').length}
            </div>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--color-pending-bg)', color: 'var(--color-pending)' }}>
            <Building2 size={24} />
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary-light)' }}>
          <div className="kpi-info">
            <h3>Lucro Presumido</h3>
            <div className="kpi-value">
              {companies.filter(c => c.regime === 'Lucro Presumido').length}
            </div>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--color-inprogress-bg)', color: 'var(--primary-light)' }}>
            <Building2 size={24} />
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div className="kpi-info">
            <h3>Lucro Real / Outros</h3>
            <div className="kpi-value">
              {companies.filter(c => c.regime === 'Lucro Real' || c.regime === 'MEI').length}
            </div>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)' }}>
            <Building2 size={24} />
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--color-completed)' }}>
          <div className="kpi-info">
            <h3>Total de Clientes Ativos</h3>
            <div className="kpi-value">
              {companies.filter(c => c.status === 'Ativa').length}
            </div>
          </div>
          <div className="kpi-icon" style={{ backgroundColor: 'var(--color-completed-bg)', color: 'var(--color-completed)' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Grid of Companies */}
      {filteredCompanies.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          Nenhuma empresa encontrada com os filtros informados.
        </div>
      ) : (
        <div className="tasks-grid">
          {filteredCompanies.map(company => (
            <div key={company.id} className="task-card" style={{ borderTop: `4px solid ${getRegimeColor(company.regime)}` }}>
              {/* Card Header */}
              <div className="task-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: company.status === 'Ativa' ? 'var(--color-completed-bg)' : 'rgba(239, 68, 68, 0.1)', 
                        color: company.status === 'Ativa' ? 'var(--color-completed)' : 'var(--color-critical)',
                        fontSize: '0.65rem'
                      }}
                    >
                      {company.status}
                    </span>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                        color: getRegimeColor(company.regime),
                        fontSize: '0.65rem',
                        border: `1px solid ${getRegimeColor(company.regime)}40`
                      }}
                    >
                      {company.regime}
                    </span>
                  </div>
                  <h4 className="task-title" style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {company.nomeFantasia || company.razaoSocial}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {company.razaoSocial}
                  </div>
                </div>
              </div>

              {/* CNPJ & Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={13} style={{ color: 'var(--text-muted)' }} />
                  <span><strong>CNPJ:</strong> {company.cnpj}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} style={{ color: 'var(--text-muted)' }} />
                  <span><strong>Responsável Padrão:</strong> {company.defaultAssignee || 'Não definido'}</span>
                </div>
              </div>

              {/* Company Notes / CNAE Details */}
              {company.notes && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{company.notes}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="task-footer">
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ID: {company.id}
                </span>

                <div className="task-actions">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => openEditModal(company)}
                    title="Editar Empresa"
                  >
                    <Edit size={13} />
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => {
                      if (confirm(`Deseja realmente remover a empresa "${company.nomeFantasia || company.razaoSocial}"?`)) {
                        onDeleteCompany(company.id);
                      }
                    }}
                    title="Excluir Empresa (somente gestor)" disabled={!canManage}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar / Editar Empresa */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} style={{ color: 'var(--primary-light)' }} />
                <h3>{editingCompany ? 'Editar Empresa Cliente' : 'Cadastrar Nova Empresa'}</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Seção CNPJ com Consulta na Receita Federal */}
              <div style={{ backgroundColor: 'rgba(15, 82, 158, 0.12)', border: '1px solid rgba(15, 82, 158, 0.3)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--primary-light)', marginBottom: '8px' }}>
                  <Sparkles size={16} /> Puxar Dados Direto da Receita Federal
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Digite o CNPJ (00.000.000/0000-00)" 
                    value={formCnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    required
                    style={{ fontSize: '0.95rem', fontWeight: '600', letterSpacing: '0.5px' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => fetchCnpjFromReceita()}
                    disabled={isSearchingReceita}
                  >
                    {isSearchingReceita ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Consultando...
                      </>
                    ) : (
                      <>
                        <Search size={16} /> Consultar CNPJ
                      </>
                    )}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Preenche automaticamente Razão Social, Fantasia, Regime (Simples/Presumido), CNAE e Situação Cadastral.
                </div>

                {receitaMessage && (
                  <div 
                    style={{ 
                      marginTop: '10px', 
                      padding: '8px 12px', 
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: receitaMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: receitaMessage.type === 'success' ? 'var(--color-completed)' : 'var(--color-critical)',
                      border: `1px solid ${receitaMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    {receitaMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{receitaMessage.text}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Razão Social *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Comercial Modelo & Filhos Ltda" 
                    value={formRazao}
                    onChange={(e) => setFormRazao(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nome Fantasia</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Modelo Store" 
                    value={formFantasia}
                    onChange={(e) => setFormFantasia(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Regime Tributário *</label>
                  <select 
                    className="form-control" 
                    value={formRegime}
                    onChange={(e) => setFormRegime(e.target.value)}
                  >
                    <option value="Simples Nacional">Simples Nacional (DAS)</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                    <option value="MEI">MEI (Microempreendedor)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Responsável Padrão</label>
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
                  <label>Status</label>
                  <select 
                    className="form-control" 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa / Suspensa</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Observações Internas</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  placeholder="Inscrição Estadual, detalhes de faturamento, anexos do simples..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                {editingCompany ? 'Salvar Alterações' : 'Concluir Cadastro da Empresa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
