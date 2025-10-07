import React, { useState, useEffect } from 'react';
import type { SavingsGoal } from '../../types';
import { FormInput, FormTextArea, CurrencyInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';

export type SavingsGoalFormState = {
  label: string;
  targetAmount: string;
  targetDate: string;
  description: string;
  priority: string;
};

type SavingsGoalFormProps = {
  onSubmit: (goal: SavingsGoalFormState) => Promise<void>;
  onCancel: () => void;
  goal?: SavingsGoal | null;
  status: string;
  submitText: string;
  defaultCurrency: string;
};

export function SavingsGoalForm({
  onSubmit,
  onCancel,
  goal,
  status,
  submitText,
  defaultCurrency
}: SavingsGoalFormProps) {
  const [formState, setFormState] = useState<SavingsGoalFormState>({
    label: '',
    targetAmount: '',
    targetDate: '',
    description: '',
    priority: '3'
  });

  useEffect(() => {
    if (goal) {
      setFormState({
        label: goal.label,
        targetAmount: String(goal.targetAmount),
        targetDate: goal.targetDate ?? '',
        description: goal.description ?? '',
        priority: String(goal.priority)
      });
    }
  }, [goal]);

  const handleChange = (field: keyof SavingsGoalFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid gap-4">
        <FormInput
          label="Goal Name"
          value={formState.label}
          onChange={(value) => handleChange('label', value)}
          required
        />
        <CurrencyInput
          label="Target Amount"
          value={formState.targetAmount}
          onChange={(value) => handleChange('targetAmount', value)}
          required
        />
        <FormInput
          label="Target Date"
          type="date"
          value={formState.targetDate}
          onChange={(value) => handleChange('targetDate', value)}
        />
        <FormInput
          label="Priority"
          type="number"
          value={formState.priority}
          onChange={(value) => handleChange('priority', value)}
          min="1"
          max="5"
        />
        <FormTextArea
          label="Description"
          value={formState.description}
          onChange={(value) => handleChange('description', value)}
        />
      </div>
      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-4">
          <button type="submit" className={buttonClasses.primary}>
            {submitText}
          </button>
          <button type="button" className={buttonClasses.secondary} onClick={onCancel}>
            Cancel
          </button>
        </div>
        {status && <span className="text-sm text-slate-700">{status}</span>}
      </div>
    </form>
  );
}
