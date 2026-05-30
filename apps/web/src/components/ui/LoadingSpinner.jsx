import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2
        className={`${currentSize} animate-spin`}
        style={{ color: 'var(--brand-green)' }}
      />
    </div>
  );
};

export default LoadingSpinner;
