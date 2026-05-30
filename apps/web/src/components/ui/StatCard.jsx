import React, { useEffect, useState, useRef } from 'react';
import Card from './Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({ label, value, delta, icon, color = 'green', className = '' }) => {
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    // Parse the numerical part of the value for animation
    const stringVal = String(value);
    const numericMatch = stringVal.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(stringVal);
      return;
    }

    const targetNum = parseFloat(numericMatch[0]);
    const prefix = stringVal.substring(0, numericMatch.index);
    const suffix = stringVal.substring(numericMatch.index + numericMatch[0].length);

    let start = 0;
    const duration = 1200; // 1.2s animation
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentNum = easedProgress * targetNum;
      
      let formattedNum = '';
      if (Number.isInteger(targetNum)) {
        formattedNum = Math.floor(currentNum).toLocaleString('en-IN');
      } else {
        formattedNum = currentNum.toFixed(1);
      }

      setDisplayValue(`${prefix}${formattedNum}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(stringVal); // Ensure exact final value
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  // Delta parsing to see if positive or negative
  const isPositive = delta ? !String(delta).includes('-') && !String(delta).includes('↓') : true;
  const deltaText = delta ? String(delta).replace(/[+\-↑↓]/g, '').trim() : '';

  const colorClasses = {
    green: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: 'text-emerald-500',
    },
    amber: {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      icon: 'text-amber-500',
    },
    rose: {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      icon: 'text-rose-500',
    },
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: 'text-blue-500',
    },
  };

  const currentColor = colorClasses[color] || colorClasses.green;

  return (
    <Card hover={true} className={`p-6 flex flex-col justify-between h-36 relative ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl ${currentColor.bg} ${currentColor.icon}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          {displayValue}
        </h4>
        
        {delta && (
          <div className="flex items-center gap-1 text-xs">
            {isPositive ? (
              <span className="inline-flex items-center text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                {deltaText}
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
                {deltaText}
              </span>
            )}
            <span className="text-slate-400 font-medium">vs baseline</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
