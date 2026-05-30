import React from 'react';
import { motion } from 'motion/react';

export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="pb-5 border-b mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </motion.div>
      {actions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 shrink-0"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
};

export default PageHeader;
