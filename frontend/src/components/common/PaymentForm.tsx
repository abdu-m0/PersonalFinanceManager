import React, { useState } from 'react';
import type { Account } from '../../types';
import { FormInput, FormSelect, CurrencyInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';
import { todayISO } from '../../utils/formatting';

export type PaymentFormState = {
  amount: string;
  currency: string;
  accountId: string;
  date: string;
};

type PaymentFormProps = {
  onSubmit: (payment: PaymentFormState) => Promise<void>;
  onCancel: () => void;
  accounts: Account[];
  defaultCurrency: string;
  status: string;
};

export function PaymentForm({
  onSubmit,
  onCancel,
  accounts,
  defaultCurrency,
  status,
}: PaymentFormProps) {
  const [formState, setFormState] = useState<PaymentFormState>({
    amount: '',
    currency: defaultCurrency,
    accountId: '',
    date: todayISO(),
  });

  const handleChange = (field: keyof PaymentFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <CurrencyInput
        label="Amount"
        value={formState.amount}
        onChange={(value) => handleChange('amount', value)}
        required
      />
      <FormSelect
        label="Account"
        value={formState.accountId}
        onChange={(value) => handleChange('accountId', value)}
        options={accounts.map(a => ({ value: a.id, label: a.name }))}
      />
      <FormInput
        label="Payment Date"
        type="date"
        value={formState.date}
        onChange={(value) => handleChange('date', value)}
        required
      />
      <div className="flex justify-end gap-2 items-center">
        {status && <span className="text-sm text-red-500">{status}</span>}
        <button type="button" onClick={onCancel} className={buttonClasses.secondary}>Cancel</button>
        <button type="submit" className={buttonClasses.primary}>Save Payment</button>
      </div>
    </form>
  );
}
