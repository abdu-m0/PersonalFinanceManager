import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className = '', ...rest }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm text-slate-700 mb-1">{label}</label>}
      <input className={`w-full border rounded px-2 py-1 text-sm ${className}`} {...rest} />
    </div>
  );
}

export default Input;
