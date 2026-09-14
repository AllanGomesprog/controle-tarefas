import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, setTheme, size = 'normal' }) {
  return (
    <div className={`theme-toggle-segmented size-${size}`} role="radiogroup" aria-label="Seletor de tema claro e escuro">
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Ativar Modo Claro"
      >
        <Sun size={size === 'sm' ? 12 : 14} className="theme-icon sun" />
        <span>Claro</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Ativar Modo Escuro"
      >
        <Moon size={size === 'sm' ? 12 : 14} className="theme-icon moon" />
        <span>Escuro</span>
      </button>
    </div>
  );
}
