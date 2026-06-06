const variants = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  buy: 'bg-blue-50 text-blue-700 border-blue-200',
  sell: 'bg-green-50 text-green-700 border-green-200',
};

export default function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const sz = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center font-semibold uppercase tracking-wide border rounded-full ${variants[variant]} ${sz} ${className}`}>
      {children}
    </span>
  );
}
