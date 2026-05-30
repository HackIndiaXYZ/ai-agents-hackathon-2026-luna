import React from 'react';
import { motion } from 'motion/react';

export const Card = ({ children, hover = false, className = '', ...props }) => {
  const baseClass = 'rounded-xl border bg-white shadow-sm overflow-hidden';
  const inlineStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
  };

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`${baseClass} ${className}`}
        style={inlineStyle}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseClass} ${className}`} style={inlineStyle} {...props}>
      {children}
    </div>
  );
};

export default Card;
