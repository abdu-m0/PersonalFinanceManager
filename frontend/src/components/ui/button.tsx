import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeCls = size === 'sm' ? 'px-2 py-1 text-sm' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-2 text-sm';
  const variantCls = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    : variant === 'secondary'
      ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-300'
      : 'bg-transparent text-slate-700 hover:bg-slate-50';

  return (
    <button className={`${base} ${sizeCls} ${variantCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default Button;
