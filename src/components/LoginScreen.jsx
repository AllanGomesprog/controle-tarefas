import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, ArrowRight, KeyRound, Sparkles, Sun, Moon } from 'lucide-react';
import Logo from './Logo';

export default function LoginScreen({ onLogin, team, theme, toggleTheme }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!usernameOrEmail.trim()) {
      setErrorMessage('Por favor, informe seu usuário ou e-mail.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, informe sua senha de acesso.');
      return;
    }

    // Find member by name, username or default
    const matched = team.find(m => 
      m.name.toLowerCase().includes(usernameOrEmail.trim().toLowerCase()) ||
      (m.email && m.email.toLowerCase() === usernameOrEmail.trim().toLowerCase())
    );

    if (matched) {
      onLogin({
        id: matched.id,
        name: matched.name,
        role: matched.role,
        remember: rememberMe
      });
    } else {
      // Allow custom user login
      onLogin({
        id: `usr-${Date.now()}`,
        name: usernameOrEmail.trim(),
        role: 'Colaborador',
        remember: rememberMe
      });
    }
  };

  // Quick select login for team members
  const handleQuickLogin = (member) => {
    onLogin({
      id: member.id,
      name: member.name,
      role: member.role,
      remember: true
    });
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Theme Toggle Button */}
        {toggleTheme && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-8px' }}>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-secondary btn-sm"
              style={{ 
                padding: '4px 10px', 
                fontSize: '0.75rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                borderRadius: '50px',
                cursor: 'pointer'
              }}
              title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={13} style={{ color: '#fbbf24' }} />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon size={13} style={{ color: '#6366f1' }} />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Logo and Header */}
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <Logo variant="login" />
          </div>
          <p className="login-subtitle">
            Sistema de Gestão Contábil, Prazos & Obrigações
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleFormSubmit} className="login-form">
          {errorMessage && (
            <div className="login-error-badge">
              {errorMessage}
            </div>
          )}

          <div className="form-group">
            <label>Usuário ou E-mail</label>
            <div style={{ position: 'relative' }}>
              <User size={16} className="login-input-icon" />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ex: Alan Gomes ou alan@gestaocontabil.com.br"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Senha de Acesso</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} className="login-input-icon" />
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <label className="checklist-item" style={{ cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              />
              <span>Lembrar meu acesso</span>
            </label>
            <span style={{ color: 'var(--text-muted)' }}>Acesso Seguro SSL</span>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px', padding: '12px' }}>
            Acessar o Sistema <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Access for Team */}
        <div className="quick-access-section">
          <div className="quick-access-title">
            <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Acesso Rápido da Equipe (Demonstração):</span>
          </div>
          <div className="quick-access-grid">
            {team.map(m => (
              <button 
                key={m.id} 
                type="button"
                className="quick-user-btn"
                onClick={() => handleQuickLogin(m)}
                title={`Entrar como ${m.name} (${m.role})`}
              >
                <span className="quick-user-avatar">{m.name[0]}</span>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--primary-light)' }}>
                    {m.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="login-footer">
          <ShieldCheck size={14} style={{ color: 'var(--color-completed)' }} />
          <span>Protocolo com Rastreabilidade Jurídica & LGPD</span>
        </div>
      </div>
    </div>
  );
}
