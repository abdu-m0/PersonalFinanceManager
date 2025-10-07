import React, { useState } from 'react';
import { formatInputAmount, parseInputAmount } from '../../utils/formatting';
import { formClasses, buttonClasses } from '../../styles/classes';
import Switch from './Switch';

type FormGroupProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
};

function FormGroup({ label, error, children }: FormGroupProps) {
  return (
    <div className={formClasses.group}>
      <label className={formClasses.label}>{label}</label>
      {children}
      {error && <div className="text-xs text-rose-500">{error}</div>}
    </div>
  );
}

export type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  error?: string;
};

export function FormInput({ label, value, onChange, type = 'text', required, placeholder, min, max, error }: FormInputProps) {
  return (
    <FormGroup label={label} error={error}>
      <input
        className={`${formClasses.input} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </FormGroup>
  );
}

export type CurrencyInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
};

export function CurrencyInput({ label, value, onChange, required, error }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatInputAmount(e.target.value);
    setDisplayValue(formattedValue);
    onChange(String(parseInputAmount(formattedValue)));
  };

  React.useEffect(() => {
    setDisplayValue(formatInputAmount(value));
  }, [value]);

  return (
    <FormGroup label={label} error={error}>
      <input
        className={`${formClasses.input} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        required={required}
      />
    </FormGroup>
  );
}

export type FormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
};

export function FormSelect({ label, value, onChange, options, error }: FormSelectProps) {
  return (
    <FormGroup label={label} error={error}>
      <select
        className={`${formClasses.select} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormGroup>
  );
}

export type FormTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};

export function FormTextArea({ label, value, onChange, error, placeholder }: FormTextAreaProps) {
  return (
    <FormGroup label={label} error={error}>
      <textarea
        className={`${formClasses.textarea} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </FormGroup>
  );
}

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

export function Checkbox({ label, checked, onChange, description }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3">
      <div className="mt-0.5">
        <Switch checked={checked} onChange={(v) => onChange(v)} ariaLabel={label} />
      </div>
      <div>
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
    </label>
  );
}

export type CategorySelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onNewCategory?: (name: string) => Promise<void> | void;
};

export function CategorySelect({ label, value, options, onChange, onNewCategory }: CategorySelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  async function addNewCategory() {
    if (!onNewCategory) return;
    const normalized = newCategory.trim();
    if (!normalized) {
      setError('Enter a category name');
      return;
    }
    try {
      setError('');
      await onNewCategory(normalized);
      onChange(normalized);
      setNewCategory('');
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void addNewCategory();
    }
  }

  if (isAdding && onNewCategory) {
    return (
      <div className={formClasses.group}>
        <label className={formClasses.label}>New {label}</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${formClasses.input} flex-1 ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
            type="text"
            value={newCategory}
            onChange={(e) => {
              setNewCategory(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
          />
          <button type="button" onClick={() => void addNewCategory()} className={buttonClasses.primary}>
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewCategory('');
              setError('');
            }}
            className={buttonClasses.secondary}
          >
            Cancel
          </button>
        </div>
        {error && <div className="text-xs text-rose-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className={formClasses.group}>
      <label className={formClasses.label}>{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${formClasses.select} flex-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {onNewCategory && (
          <button type="button" onClick={() => setIsAdding(true)} className={buttonClasses.secondary}>
            New
          </button>
        )}
      </div>
    </div>
  );
}
