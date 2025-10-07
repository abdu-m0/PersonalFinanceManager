import React from 'react';

type FancyRadioProps = {
  name: string;
  value: string;
  checked: boolean;
  label: React.ReactNode;
  onChange: () => void;
};

export default function FancyRadio({ name, checked, label, onChange }: FancyRadioProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="hidden" />
      <span className={`h-4 w-4 rounded-full border ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`} />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}
