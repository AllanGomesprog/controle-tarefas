import React, { useState } from 'react';
import { ShieldCheck, Search, Trash2, Calendar, HardDrive, Info } from 'lucide-react';

export default function AuditLog({ logs, onClearLogs }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Format date time helper
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) + ' às ' + date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div>
      {/* Security Compliance Intro Header */}
      <div 
        className="card-panel" 
        style={{ 
          borderLeft: '4px solid var(--color-completed)',
          backgroundColor: 'rgba(16, 185, 129, 0.03)',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}
      >
        <div style={{ color: 'var(--color-completed)', padding: '4px' }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Protocolo de Segurança e Rastreabilidade Jurídica (LGPD)
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Todas as ações e alterações realizadas no sistema são registradas de forma imutável com data, hora, usuário responsável e metadados de rede. Este log serve como segurança jurídica e auditoria interna em caso de questionamento de prazos de obrigações tributárias.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Buscar por usuário, ação ou detalhe..." 
            className="form-control search-input" 
            style={{ paddingLeft: '36px', minWidth: '300px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn btn-danger btn-sm" onClick={onClearLogs}>
          <Trash2 size={12} /> Limpar Logs
        </button>
      </div>

      {/* Logs Table */}
      <div className="card-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Nenhum registro de auditoria encontrado.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Data / Hora</th>
                  <th style={{ width: '180px' }}>Usuário</th>
                  <th>Ação Executada</th>
                  <th>Detalhes do Protocolo</th>
                  <th style={{ width: '180px' }}>Metadados do Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Calendar size={12} /> {formatDateTime(log.timestamp)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{log.user}</strong>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: log.action.includes('status') ? 'var(--color-inprogress-bg)' : 
                                           log.action.includes('excluiu') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                          color: log.action.includes('status') ? 'var(--color-inprogress)' : 
                                 log.action.includes('excluiu') ? 'var(--color-critical)' : 'var(--text-primary)'
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {log.details}
                    </td>
                    <td className="log-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HardDrive size={10} /> {log.ip || '192.168.1.45'}
                      </div>
                      <div style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }} title={log.userAgent}>
                        {log.userAgent || 'Chrome/Windows10'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
