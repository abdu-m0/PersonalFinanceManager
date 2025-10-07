import React from 'react';
import type { Account } from '../../types';
import { FormInput, FormSelect, CurrencyInput } from './FormComponents';
import { buttonClasses, formClasses } from '../../styles/classes';
import { useForm } from '../../hooks/useForm';

export type AccountFormState = {
  name: string;
  type: Account['type'];
  institution?: string;
  currency: string;
  balance: string;
  color?: string;
};

type AccountFormProps = {
  onSubmit: (account: AccountFormState) => Promise<void>;
  onCancel?: () => void;
  account?: Account | null;
  defaultCurrency: string;
  status: string;
  submitText: string;
};

const accountTypeOptions = [
  { value: 'bank', label: 'Bank account' },
  { value: 'cash', label: 'Cash' },
  { value: 'mobile-wallet', label: 'Mobile wallet' },
  { value: 'credit-card', label: 'Credit card' }
];

const currencyOptions = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' }
];

export function AccountForm({ onSubmit, onCancel, account, defaultCurrency, status, submitText }: AccountFormProps) {
  const getInitialState = () => ({
    name: account?.name || '',
    type: account?.type || 'bank',
    institution: account?.institution || '',
    currency: account?.currency || defaultCurrency,
    balance: account?.balance.toString() || '0',
    color: account?.color || '',
  });

  const { formState, handleChange } = useForm(getInitialState, [account, defaultCurrency]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
      <div className={formClasses.gridTwo}>
        <FormInput
          label="Account name"
          value={formState.name}
          onChange={(value) => handleChange('name', value)}
          required
        />
        <FormSelect
          label="Type"
          value={formState.type}
          onChange={(value) => handleChange('type', value as Account['type'])}
          options={accountTypeOptions}
        />
        <FormInput
          label="Institution"
          value={formState.institution || ''}
          onChange={(value) => handleChange('institution', value)}
          placeholder="Optional"
        />
        <FormSelect
          label="Currency"
          value={formState.currency}
          onChange={(value) => handleChange('currency', value)}
          options={currencyOptions}
        />
        {!account && (
          <CurrencyInput
            label="Opening balance"
            value={formState.balance}
            onChange={(value) => handleChange('balance', value)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="submit" className={buttonClasses.primary}>
            {submitText}
          </button>
          {onCancel && (
            <button type="button" className={buttonClasses.secondary} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
        {status && <span className="text-sm text-slat-500">{status}</span>}
      </div>
    </form>
  );
}
