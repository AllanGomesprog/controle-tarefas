import { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
export default function LoginScreen({ onLogin, theme, setTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await onLogin({ email, password }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="login-wrapper"><div className="login-container">
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><ThemeToggle theme={theme} setTheme={setTheme} size="sm" /></div>
    <div className="login-header"><Logo /><h1>Bem-vindo ao seu escritório</h1><p className="login-subtitle">Tarefas, prazos e equipe em um só lugar.</p></div>
    <form onSubmit={submit} className="login-form">
      {!isSupabaseConfigured && <p role="status" className="login-error-badge">O acesso da equipe ainda não foi configurado. Solicite a ativação ao administrador.</p>}
      {error && <p role="alert" className="login-error-badge">{error}</p>}
      <div className="form-group"><label htmlFor="login-email"><Mail size={14} /> E-mail</label>
        <input id="login-email" type="email" className="form-control" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="form-group"><label htmlFor="login-password"><Lock size={14} /> Senha</label>
        <input id="login-password" type="password" className="form-control" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      <button className="btn btn-primary" disabled={busy || !isSupabaseConfigured}>{busy ? 'Entrando…' : 'Acessar o sistema'} <ArrowRight size={16} /></button>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>Use a conta individual fornecida pelo gestor. Para recuperar o acesso, entre em contato com ele.</p>
    </form>
  </div></div>;
}
