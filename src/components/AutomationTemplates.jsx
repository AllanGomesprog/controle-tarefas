import { getCurrentCompetencia, formatCompetenciaLabel, getCompetenciaOptions } from '../utils/competence.js';
import { dateInMonth, newId } from '../utils/dates.js';
import { uniqueNewTasks } from '../utils/tasks.js';
import React, { useState } from 'react';
import { 
  Play, 
  CheckSquare, 
  Sparkles, 
  User, 
  CalendarDays, 
  Layers, 
  CheckCircle2, 
  Plus,
  } from 'lucide-react';

export default function AutomationTemplates({ 
  team, 
  companies = [], 
  tasks = [], 
  taskCatalog = [], 
  selectedCatalogTaskId = null, 
  onTriggerAutomation, 
  onNavigateToCatalog 
}) {
  const [activeTab, setActiveTab] = useState('recurrence'); // 'recurrence' or 'templates'
  const [selectedMonth, setSelectedMonth] = useState(formatCompetenciaLabel(getCurrentCompetencia()));
  const [selectedObligation, setSelectedObligation] = useState('simples');
  
  // Task source: 'catalog' (if user has tasks in catalog), 'custom', or 'template'
  const [taskSource, setTaskSource] = useState(
    selectedCatalogTaskId ? 'catalog' : (taskCatalog.length > 0 ? 'catalog' : 'custom')
  );
  const [selectedCatalogId, setSelectedCatalogId] = useState(
    selectedCatalogTaskId || (taskCatalog[0]?.id || '')
  );

  // Custom task creation state (starts free by default)
  const isCustomTask = taskSource === 'custom';
  const [customTitle, setCustomTitle] = useState('');
  const [customDueDay, setCustomDueDay] = useState(10);
  const customPriority = 'Média';
  const [customChecklist, setCustomChecklist] = useState([]);
  const [newChecklistStep, setNewChecklistStep] = useState('');

  // Target company filters & selection
  const [regimeFilter, setRegimeFilter] = useState('Todos');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Pre-configured templates
  const OBLIGATION_TYPES = {
    simples: {
      id: 'simples',
      name: 'Apuração do Simples Nacional (Guia DAS)',
      defaultDueDay: 20,
      priority: 'Média',
      type: 'das',
      suggestedRegime: 'Simples Nacional',
      checklist: [
        'Solicitar relatório de faturamento do mês anterior ao cliente',
        'Verificar notas fiscais de serviços e vendas no portal da prefeitura / SEFAZ',
        'Acessar o portal PGDAS-D e segregar as receitas por anexo',
        'Conferir alíquotas efetivas e gerar a Guia DAS para recolhimento',
        'Enviar a Guia DAS e o extrato de apuração para o cliente'
      ]
    },
    spedFiscal: {
      id: 'spedFiscal',
      name: 'SPED Fiscal (EFD ICMS/IPI)',
      defaultDueDay: 15,
      priority: 'Alta',
      type: 'custom',
      suggestedRegime: 'Lucro Presumido',
      checklist: [
        'Importar arquivos XML de notas fiscais de entrada, saída e CTE',
        'Auditar e conciliar créditos tributários de ICMS e IPI',
        'Gerar arquivo texto no ERP contábil e importar no PVA SPED Fiscal',
        'Verificar e corrigir advertências e erros de validação no PVA',
        'Assinar com certificado digital e transmitir via Receitanet',
        'Salvar o protocolo de entrega e anexar recibo oficial'
      ]
    },
    spedContribuicoes: {
      id: 'spedContribuicoes',
      name: 'SPED Contribuições (EFD PIS/COFINS)',
      defaultDueDay: 15,
      priority: 'Alta',
      type: 'custom',
      suggestedRegime: 'Lucro Presumido',
      checklist: [
        'Apurar faturamento bruto e receitas financeiras do período',
        'Verificar CST de PIS e COFINS dos produtos comercializados',
        'Calcular débitos e créditos com alíquotas corretas',
        'Validar arquivo no PVA SPED Contribuições',
        'Transmitir via Receitanet e anexar o recibo oficial de envio'
      ]
    },
    folha: {
      id: 'folha',
      name: 'Fechamento de Folha & e-Social / FGTS Digital',
      defaultDueDay: 7,
      priority: 'Alta',
      type: 'esocial',
      suggestedRegime: 'Todos',
      checklist: [
        'Importar cartões de ponto, atestados e horas extras',
        'Calcular folha no sistema ERP de contabilidade',
        'Transmitir eventos periódicos de pagamento para o e-Social',
        'Emitir guia do FGTS Digital na plataforma da Caixa/Gov',
        'Emitir holerites e enviar guia para o cliente com recibo'
      ]
    },
    dctfWeb: {
      id: 'dctfWeb',
      name: 'DCTFWeb & EFD-Reinf',
      defaultDueDay: 15,
      priority: 'Alta',
      type: 'custom',
      suggestedRegime: 'Lucro Presumido',
      checklist: [
        'Transmitir eventos da EFD-Reinf (retenções na fonte)',
        'Acessar o portal e-CAC e vincular débitos com a folha e-Social',
        'Emitir o DARF numerado da DCTFWeb',
        'Transmitir declaração e salvar recibo'
      ]
    }
  };

  const currentTemplate = OBLIGATION_TYPES[selectedObligation];
  const selectedCatalogTask = taskCatalog.find(t => t.id === selectedCatalogId) || taskCatalog[0];

  // Active task settings (from catalog, custom, or template)
  const taskTitle = taskSource === 'catalog'
    ? (selectedCatalogTask?.title || 'Tarefa Cadastrada')
    : isCustomTask 
      ? (customTitle.trim() || 'Tarefa Personalizada') 
      : currentTemplate.name;

  const taskDueDay = taskSource === 'catalog'
    ? (selectedCatalogTask?.recurrenceDay || 10)
    : isCustomTask 
      ? customDueDay 
      : currentTemplate.defaultDueDay;

  const taskPriority = taskSource === 'catalog'
    ? (selectedCatalogTask?.priority || 'Média')
    : isCustomTask 
      ? customPriority 
      : currentTemplate.priority;

  const taskChecklist = taskSource === 'catalog'
    ? (selectedCatalogTask?.checklist || [])
    : isCustomTask 
      ? customChecklist 
      : currentTemplate.checklist.map(text => ({ text, done: false }));

  // Filter target companies
  const targetCompanies = companies.filter(c => {
    if (c.status !== 'Ativa') return false;
    if (regimeFilter !== 'Todos' && c.regime !== regimeFilter) return false;
    return true;
  });

  // Check which companies already have this task generated for this month
  const getCompanyMonthStatus = (company) => {
    const [monthName, year] = selectedMonth.split(' / ');
    const monthMap = {
      'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
      'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
      'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    };
    const monthNum = monthMap[monthName] || '09';
    const compCode = `${monthNum}/${year}`;

    const existing = tasks.find(t => 
      t.client === (company.nomeFantasia || company.razaoSocial) &&
      t.title.includes(taskTitle) &&
      (t.competencia === compCode || t.title.includes(selectedMonth) || t.title.includes(compCode))
    );
    return existing;
  };

  // Toggle selection of companies
  const handleToggleCompany = (compId) => {
    if (selectedCompanyIds.includes(compId)) {
      setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== compId));
    } else {
      setSelectedCompanyIds([...selectedCompanyIds, compId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCompanyIds.length === targetCompanies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(targetCompanies.map(c => c.id));
    }
  };

  // Add item to custom checklist
  const handleAddCustomStep = () => {
    if (newChecklistStep.trim()) {
      setCustomChecklist([...customChecklist, { text: newChecklistStep.trim(), done: false }]);
      setNewChecklistStep('');
    }
  };

  const handleRemoveCustomStep = (idx) => {
    setCustomChecklist(customChecklist.filter((_, i) => i !== idx));
  };

  // Run Generation
  const handleGenerateTasks = async () => {
    const companiesToLink = targetCompanies.filter(c => 
      selectedCompanyIds.length === 0 || selectedCompanyIds.includes(c.id)
    );

    if (companiesToLink.length === 0) {
      alert('Selecione ao menos uma empresa para atrelar esta tarefa.');
      return;
    }

    if (isCustomTask && !customTitle.trim()) {
      alert('Por favor, informe o título da tarefa personalizada.');
      return;
    }

    // Calculate due date (YYYY-MM-DD)
    const [monthName, year] = selectedMonth.split(' / ');
    const monthMap = {
      'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
      'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
      'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    };
    const monthNum = monthMap[monthName] || '09';

    const formattedDate = dateInMonth(year, monthNum, taskDueDay);
    const compCode = `${monthNum}/${year}`;

    const newTasks = companiesToLink.map(c => ({
      id: newId(),
      title: `${taskTitle} - ${selectedMonth}`,
      client: c.nomeFantasia || c.razaoSocial,
      companyId: c.id,
      assignee: c.defaultAssignee || team[0]?.name || 'Fernanda',
      dueDate: formattedDate,
      competencia: compCode,
      competenciaLabel: selectedMonth,
      priority: taskPriority,
      description: `Obrigação/tarefa vinculada à empresa ${c.razaoSocial} (CNPJ: ${c.cnpj}) para a competência de ${selectedMonth}.`,
      status: 'Pendente',
      checklist: taskChecklist.map(step => ({ text: step.text, done: false })),
      type: taskSource === 'template' ? currentTemplate.type : 'custom',
      isRecurring: taskSource === 'catalog' ? Boolean(selectedCatalogTask?.isRecurring) : true,
      recurrenceFrequency: taskSource === 'catalog' ? selectedCatalogTask?.recurrenceFrequency || 'Mensal' : 'Mensal',
      recurrenceDay: taskDueDay
    }));

    const pending = uniqueNewTasks(newTasks, tasks);
    if (!pending.length) { alert('As tarefas desta competência já foram criadas.'); return; }
    const saved = await onTriggerAutomation(pending, selectedMonth);
    if (saved) alert('Geração concluída. As tarefas existentes foram preservadas.');
  };

  return (
    <div className="automation-view">
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <button 
          className={`btn ${activeTab === 'recurrence' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recurrence')}
        >
          <Layers size={16} /> Atrelar & Gerar Tarefas por Empresa
        </button>
        <button 
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('templates')}
        >
          <CheckSquare size={16} /> Modelos Prontos de Rotinas
        </button>
      </div>

      {activeTab === 'recurrence' && (
        <div>
          {/* Main Config Panel */}
          <div 
            className="card-panel" 
            style={{ 
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ backgroundColor: 'var(--primary)', padding: '10px', borderRadius: '50%', color: 'white', display: 'flex' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: '500' }}>
                    Vincular rotinas às empresas
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Crie a tarefa que desejar (ou use um modelo pronto) e atrele às empresas que precisar com 1 clique.
                  </p>
                </div>
              </div>

              {/* Toggle Task Source */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {taskCatalog.length > 0 && (
                  <button 
                    className={`btn btn-sm ${taskSource === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTaskSource('catalog')}
                  >
                    <CheckSquare size={14} /> Minhas Tarefas Cadastradas ({taskCatalog.length})
                  </button>
                )}
                <button 
                  className={`btn btn-sm ${taskSource === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTaskSource('custom')}
                >
                  <Plus size={14} /> Criar Nova Tarefa Aqui
                </button>
                <button 
                  className={`btn btn-sm ${taskSource === 'template' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTaskSource('template')}
                >
                  Modelos Prontos
                </button>
              </div>
            </div>

            {/* Task Definition Section */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              {taskSource === 'catalog' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>1. Selecione a Tarefa Cadastrada:</label>
                      <select 
                        className="user-select" 
                        value={selectedCatalogId}
                        onChange={(e) => setSelectedCatalogId(e.target.value)}
                        style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                      >
                        {taskCatalog.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.title} (Todo dia {t.recurrenceDay || 10} • {t.recurrenceFrequency || 'Mensal'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>2. Mês de Competência:</label>
                      <select 
                        className="user-select" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                      >
{getCompetenciaOptions(tasks).map(option => <option key={option.value} value={formatCompetenciaLabel(option.value)}>{option.label}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>3. Filtrar Empresas por Regime:</label>
                      <select 
                        className="user-select" 
                        value={regimeFilter}
                        onChange={(e) => {
                          setRegimeFilter(e.target.value);
                          setSelectedCompanyIds([]);
                        }}
                        style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                      >
                        <option value="Todos">Todas as Empresas Ativas</option>
                        <option value="Simples Nacional">Apenas Simples Nacional</option>
                        <option value="Lucro Presumido">Apenas Lucro Presumido</option>
                        <option value="Lucro Real">Apenas Lucro Real</option>
                        <option value="MEI">Apenas MEI</option>
                      </select>
                    </div>
                  </div>

                  {selectedCatalogTask && (
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong>Detalhes:</strong> Responsável: {selectedCatalogTask.defaultAssignee || 'Geral'} | Prioridade: {selectedCatalogTask.priority || 'Média'} | Checklist: {selectedCatalogTask.checklist?.length || 0} passos | Vencimento todo dia {selectedCatalogTask.recurrenceDay || 10}
                      </div>
                      {onNavigateToCatalog && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => onNavigateToCatalog()}
                          style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                        >
                          Editar no Catálogo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : taskSource === 'template' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: '600' }}>1. Escolha o Modelo da Tarefa:</label>
                    <select 
                      className="user-select" 
                      value={selectedObligation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedObligation(val);
                        const templ = OBLIGATION_TYPES[val];
                        if (templ && templ.suggestedRegime && templ.suggestedRegime !== 'Todos') {
                          setRegimeFilter(templ.suggestedRegime);
                        } else {
                          setRegimeFilter('Todos');
                        }
                        setSelectedCompanyIds([]);
                      }}
                      style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                    >
                      <option value="simples">Apuração do Simples Nacional (Guia DAS)</option>
                      <option value="spedFiscal">SPED Fiscal (EFD ICMS/IPI)</option>
                      <option value="spedContribuicoes">SPED Contribuições (PIS/COFINS)</option>
                      <option value="folha">Fechamento de Folha & e-Social / FGTS</option>
                      <option value="dctfWeb">DCTFWeb & EFD-Reinf</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: '600' }}>2. Mês de Competência:</label>
                    <select 
                      className="user-select" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                    >
{getCompetenciaOptions(tasks).map(option => <option key={option.value} value={formatCompetenciaLabel(option.value)}>{option.label}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: '600' }}>3. Filtrar Empresas por Regime:</label>
                    <select 
                      className="user-select" 
                      value={regimeFilter}
                      onChange={(e) => {
                        setRegimeFilter(e.target.value);
                        setSelectedCompanyIds([]);
                      }}
                      style={{ width: '100%', fontSize: '0.9rem', padding: '9px 12px' }}
                    >
                      <option value="Todos">Todas as Empresas Ativas</option>
                      <option value="Simples Nacional">Apenas Simples Nacional</option>
                      <option value="Lucro Presumido">Apenas Lucro Presumido</option>
                      <option value="Lucro Real">Apenas Lucro Real</option>
                      <option value="MEI">Apenas MEI</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Custom Free Task Creator */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="automation-task-fields">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>Título da Tarefa que Deseja Criar *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ex: Emissão de Balancete, Alvará Sanitário, Apuração de ISS..." 
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>Dia de Vencimento</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        className="form-control" 
                        value={customDueDay}
                        onChange={(e) => setCustomDueDay(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>Competência</label>
                      <select 
                        className="form-control" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      >
{getCompetenciaOptions(tasks).map(option => <option key={option.value} value={formatCompetenciaLabel(option.value)}>{option.label}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600' }}>Filtrar Empresas</label>
                      <select 
                        className="form-control" 
                        value={regimeFilter}
                        onChange={(e) => {
                          setRegimeFilter(e.target.value);
                          setSelectedCompanyIds([]);
                        }}
                      >
                        <option value="Todos">Todas as Empresas</option>
                        <option value="Simples Nacional">Simples Nacional</option>
                        <option value="Lucro Presumido">Lucro Presumido</option>
                        <option value="Lucro Real">Lucro Real</option>
                        <option value="MEI">MEI</option>
                      </select>
                    </div>
                  </div>

                  {/* Checklist editor for custom task */}
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Passos de Checklist da Tarefa ({customChecklist.length}):
                    </label>
                    {customChecklist.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontStyle: 'italic' }}>
                        Nenhum passo adicionado ainda (opcional). Adicione os passos que desejar abaixo:
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        {customChecklist.map((step, i) => (
                          <span 
                            key={i} 
                            style={{ 
                              fontSize: '0.75rem', 
                              backgroundColor: 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--border-color)', 
                              padding: '4px 10px', 
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {step.text}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCustomStep(i)} 
                              style={{ background: 'none', border: 'none', color: 'var(--color-critical)', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Adicionar passo ao checklist..."
                        value={newChecklistStep}
                        onChange={(e) => setNewChecklistStep(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomStep();
                          }
                        }}
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomStep}>
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tarefa a ser gerada: <strong style={{ color: 'var(--text-primary)' }}>{taskTitle}</strong> | Vencimento: <strong style={{ color: 'var(--accent-cyan)' }}>Todo dia {taskDueDay}</strong>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleGenerateTasks} 
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                disabled={targetCompanies.length === 0}
              >
                <Play size={16} /> Atrelar e Criar Tarefa para {selectedCompanyIds.length > 0 ? `${selectedCompanyIds.length} Empresas Selecionadas` : `Todas as ${targetCompanies.length} Empresas`}
              </button>
            </div>
          </div>

          {/* Companies Selection Table */}
          <div className="card-panel">
            <div className="panel-header">
              <div>
                <h3>
                  🏢 Selecione as Empresas para Atrelar a Tarefa
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Marque as empresas que devem receber essa tarefa na competência de <strong>{selectedMonth}</strong>.
                </div>
              </div>

              {targetCompanies.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleSelectAll}>
                    {selectedCompanyIds.length === targetCompanies.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>
                </div>
              )}
            </div>

            {targetCompanies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Nenhuma empresa encontrada com o filtro de regime atual.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedCompanyIds.length === targetCompanies.length && targetCompanies.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Empresa / Razão Social</th>
                      <th>CNPJ</th>
                      <th>Regime Tributário</th>
                      <th>Responsável Padrão</th>
                      <th>Status da Tarefa nesta Competência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetCompanies.map(comp => {
                      const isSelected = selectedCompanyIds.includes(comp.id);
                      const existingTask = getCompanyMonthStatus(comp);

                      return (
                        <tr key={comp.id}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleToggleCompany(comp.id)}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {comp.nomeFantasia || comp.razaoSocial}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {comp.razaoSocial}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {comp.cnpj}
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--primary-light)', fontSize: '0.7rem' }}>
                              {comp.regime}
                            </span>
                          </td>
                          <td>
                            <span className="task-assignee" style={{ fontSize: '0.75rem' }}>
                              <User size={12} /> {comp.defaultAssignee || 'Equipe'}
                            </span>
                          </td>
                          <td>
                            {existingTask ? (
                              <span 
                                className="badge" 
                                style={{ 
                                  backgroundColor: existingTask.status === 'Concluído' ? 'var(--color-completed-bg)' : 'var(--color-inprogress-bg)', 
                                  color: existingTask.status === 'Concluído' ? 'var(--color-completed)' : 'var(--color-inprogress)',
                                  fontSize: '0.75rem'
                                }}
                              >
                                <CheckCircle2 size={12} /> {existingTask.status === 'Concluído' ? 'Concluída' : 'Já Criada (Em Aberto)'}
                              </span>
                            ) : (
                              <span 
                                className="badge" 
                                style={{ 
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                                  color: 'var(--color-pending)',
                                  fontSize: '0.75rem'
                                }}
                              >
                                🟡 Não Criada para este Mês
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="routine-grid">
          {Object.values(OBLIGATION_TYPES).map(temp => (
            <div key={temp.id} className="routine-card">
              <div className="routine-title-bar">
                <div>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {temp.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span><strong>Regime Sugerido:</strong> {temp.suggestedRegime}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CalendarDays size={12} /> <strong>Vencimento:</strong> Todo dia {temp.defaultDueDay}
                    </span>
                  </div>
                </div>
                <span className={`badge priority-${temp.priority.toLowerCase()}`}>
                  {temp.priority}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={14} /> Passos Padronizados ({temp.checklist.length} passos):
                </div>
                <ul className="routine-steps-list">
                  {temp.checklist.map((step, idx) => (
                    <li key={idx} className="routine-step">
                      <span className="routine-step-num">{idx + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
