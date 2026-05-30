import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  onClick,
  variant = 'primary', // primary | secondary | ghost | danger
  size = 'md', // sm | md | lg
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  // Styles based on CSS variables
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';
  
  const variants = {
    primary: {
      backgroundColor: 'var(--brand-green)',
      color: '#ffffff',
      '--tw-ring-color': 'var(--brand-green)',
      hoverBg: 'var(--brand-green-dark)',
      border: '1px solid transparent',
    },
    secondary: {
      backgroundColor: 'var(--surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      '--tw-ring-color': 'var(--border-strong)',
      hoverBg: 'var(--surface-alt)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      '--tw-ring-color': 'var(--border)',
      hoverBg: 'var(--surface-alt)',
    },
    danger: {
      backgroundColor: 'var(--rose)',
      color: '#ffffff',
      '--tw-ring-color': 'var(--rose)',
      hoverBg: '#be123c', // darker rose
      border: '1px solid transparent',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;

  const styleObj = {
    backgroundColor: currentVariant.backgroundColor,
    color: currentVariant.color,
    border: currentVariant.border,
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, backgroundColor: currentVariant.hoverBg } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.1 }}
      className={`${baseStyle} ${currentSize} ${className}`}
      style={styleObj}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: 'currentColor' }} />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
