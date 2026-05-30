import React from 'react';

export const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: {
      backgroundColor: 'var(--brand-green-light)',
      color: 'var(--brand-green)',
      border: '1px solid transparent',
    },
    warning: {
      backgroundColor: 'var(--amber-light)',
      color: 'var(--amber)',
      border: '1px solid transparent',
    },
    danger: {
      backgroundColor: 'var(--rose-light)',
      color: 'var(--rose)',
      border: '1px solid transparent',
    },
    info: {
      backgroundColor: 'var(--blue-light)',
      color: 'var(--blue)',
      border: '1px solid transparent',
    },
    neutral: {
      backgroundColor: 'var(--surface-alt)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
  };

  const style = variants[variant] || variants.neutral;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase select-none ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};

export default Badge;
