import React from 'react';

export default function Logo({ variant = 'sidebar', className = "" }) {
  if (variant === 'login') {
    return (
      <div 
        className={`brand-logo-login ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: '#0f529e',
          borderRadius: '14px',
          padding: '12px 22px',
          boxShadow: '0 8px 28px rgba(15, 82, 158, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          userSelect: 'none'
        }}
      >
        <svg width="46" height="46" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="22" fill="#1e40af" />
          <rect x="24" y="24" width="52" height="58" rx="8" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 38 24 V 18 C 38 16 40 14 42 14 H 58 C 60 14 62 16 62 18 V 24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 36 54 L 46 64 L 66 42" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ 
            color: '#ffffff', 
            fontSize: '1.45rem', 
            fontWeight: 800, 
            letterSpacing: '0.04em',
            lineHeight: 1.1,
            fontFamily: "'Outfit', 'Inter', sans-serif"
          }}>
            CONTROLE
          </span>
          <span style={{ 
            color: '#93c5fd', 
            fontSize: '0.78rem', 
            fontWeight: 600, 
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginTop: '2px',
            fontFamily: "'Inter', sans-serif"
          }}>
            DE TAREFAS
          </span>
        </div>
      </div>
    );
  }

  // Default: Sidebar variant
  return (
    <div 
      className={`brand-logo-card ${className}`} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        gap: '12px',
        width: '100%',
        backgroundColor: '#0f529e',
        borderRadius: '12px',
        padding: '8px 14px',
        boxShadow: '0 4px 16px rgba(15, 82, 158, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect width="100" height="100" rx="22" fill="#1e40af" />
        <rect x="24" y="24" width="52" height="58" rx="8" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 38 24 V 18 C 38 16 40 14 42 14 H 58 C 60 14 62 16 62 18 V 24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 36 54 L 46 64 L 66 42" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
        <span style={{ 
          color: '#ffffff', 
          fontSize: '1.15rem', 
          fontWeight: 800, 
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          whiteSpace: 'nowrap'
        }}>
          CONTROLE
        </span>
        <span style={{ 
          color: '#93c5fd', 
          fontSize: '0.68rem', 
          fontWeight: 600, 
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginTop: '1px',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap'
        }}>
          DE TAREFAS
        </span>
      </div>
    </div>
  );
}
