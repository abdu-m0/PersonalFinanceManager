import React, { useState } from 'react';
import { CurrencyInput, FormInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';

export type ContributionFormState = {
  amount: string;
  date: string;
};

type ContributionFormProps = {
  onSubmit: (contribution: ContributionFormState) => Promise<void>;
  onCancel: () => void;
  status: string;
};

export function ContributionForm({ onSubmit, onCancel, status }: ContributionFormProps) {
  const [formState, setFormState] = useState<ContributionFormState>({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (field: keyof ContributionFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.amount) return;
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid gap-4">
        <CurrencyInput
          label="Amount"
          value={formState.amount}
          onChange={(value) => handleChange('amount', value)}
          required
        />
        <FormInput
          label="Date"
          type="date"
          value={formState.date}
          onChange={(value) => handleChange('date', value)}
          required
        />
      </div>
      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className={buttonClasses.primary}
            disabled={!formState.amount}
          >
            Add Contribution
          </button>
          <button
            type="button"
            className={buttonClasses.secondary}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
        {status && <span className="text-sm text-slate-700">{status}</span>}
      </div>
    </form>
  );
}
