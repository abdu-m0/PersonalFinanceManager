import React, { useState } from 'react';
import type { Account } from '../../types';
import { FormInput, FormSelect, CurrencyInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';
import { todayISO } from '../../utils/formatting';

export type LoanPaymentState = {
  loanId: string;
  amount: string;
  date: string;
  accountId: string;
};

type LoanPaymentFormProps = {
  onSubmit: (payment: LoanPaymentState) => Promise<void>;
  onCancel: () => void;
  loanId: string;
  accounts: Account[];
  status: string;
  direction: 'payment' | 'collection';
};

export function LoanPaymentForm({ onSubmit, onCancel, loanId, accounts, status, direction }: LoanPaymentFormProps) {
  const [formState, setFormState] = useState<LoanPaymentState>({
    loanId,
    amount: "",
    date: todayISO(),
    accountId: ""
  });

  const handleChange = (field: keyof LoanPaymentState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-end gap-3">
        <CurrencyInput
          label="Amount"
          value={formState.amount}
          onChange={(value) => handleChange('amount', value)}
        />
        <FormInput
          label="Date"
          type="date"
          value={formState.date}
          onChange={(value) => handleChange('date', value)}
        />
        <FormSelect
          label={direction === 'payment' ? "From Account" : "To Account"}
          value={formState.accountId}
          onChange={(value) => handleChange('accountId', value)}
          options={[
            { value: "", label: "Select Account" },
            ...accounts.map(account => ({ value: account.id, label: account.name }))
          ]}
        />
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button type="submit" className={buttonClasses.primary}>
          {direction === 'payment' ? "Save Payment" : "Save Collection"}
        </button>
        <button
          type="button"
          className={buttonClasses.secondary}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      {status && (
        <div className="mt-2 text-sm text-slate-600">
          {status}
        </div>
      )}
    </form>
  );
}
