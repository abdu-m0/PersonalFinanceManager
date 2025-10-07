import React from 'react';
import type { Loan, Contact, Account } from '../../types';
import { FormInput, FormSelect, CurrencyInput } from './FormComponents';
import { buttonClasses } from '../../styles/classes';
import { todayISO } from '../../utils/formatting';
import { useForm } from '../../hooks/useForm';

export type LoanFormState = {
  amount: string;
  currency: string;
  contactId: string;
  accountId: string;
  startDate: string;
  horizon: 'short-term' | 'long-term';
  interestRate: string;
  termMonths: string;
  direction: 'borrowed' | 'lent';
};

type LoanFormProps = {
  onSubmit: (loan: LoanFormState) => Promise<void>;
  loan?: LoanFormState | null;
  defaultCurrency: string;
  contacts: Contact[];
  accounts: Account[];
  status: string;
  submitText: string;
  direction: 'borrowed' | 'lent';
};

export function LoanForm({
  onSubmit,
  loan,
  defaultCurrency,
  contacts,
  accounts,
  status,
  submitText,
  direction
}: LoanFormProps) {
  const getInitialState = (): LoanFormState => loan ? { ...loan, direction } : {
    amount: "",
    currency: defaultCurrency,
    contactId: "",
    accountId: "",
    startDate: todayISO(),
    horizon: "short-term",
    interestRate: "",
    termMonths: "",
    direction,
  };

  const { formState, handleChange } = useForm<LoanFormState>(getInitialState, [loan, defaultCurrency]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="grid grid-cols-2 gap-4">
        <CurrencyInput
          label="Amount"
          value={formState.amount}
          onChange={(value) => handleChange('amount', value)}
        />
        <FormSelect
          label="Currency"
          value={formState.currency}
          onChange={(value) => handleChange('currency', value)}
          options={[{ value: defaultCurrency, label: defaultCurrency }]}
        />
        <FormSelect
          label={direction === 'borrowed' ? "Lender" : "Borrower"}
          value={formState.contactId}
          onChange={(value) => handleChange('contactId', value)}
          options={[
            { value: "", label: "Unspecified" },
            ...contacts.map((contact) => ({ value: contact.id, label: contact.name }))
          ]}
        />
        <FormSelect
          label={direction === 'borrowed' ? "Receiving Account" : "Source Account"}
          value={formState.accountId}
          onChange={(value) => handleChange('accountId', value)}
          options={[
            { value: "", label: "Select Account" },
            ...accounts.map(account => ({ value: account.id, label: account.name }))
          ]}
        />
        <FormInput
          label={direction === 'borrowed' ? "Start Date" : "Due Date"}
          type="date"
          value={formState.startDate}
          onChange={(value) => handleChange('startDate', value)}
        />
        <FormSelect
          label="Horizon"
          value={formState.horizon}
          onChange={(value) => handleChange('horizon', value as "short-term" | "long-term")}
          options={[
            { value: "short-term", label: "Short-term" },
            { value: "long-term", label: "Long-term" }
          ]}
        />
        {formState.horizon === "long-term" && (
          <>
            <FormInput
              label="Interest Rate %"
              type="number"
              value={formState.interestRate}
              onChange={(value) => handleChange('interestRate', value)}
            />
            <FormInput
              label="Term (months)"
              type="number"
              value={formState.termMonths}
              onChange={(value) => handleChange('termMonths', value)}
            />
          </>
        )}
      </div>
      <div className="flex justify-between items-center mt-4">
        <button className={buttonClasses.primary} type="submit">
          {submitText}
        </button>
        {status && <span className="text-sm text-slate-700">{status}</span>}
      </div>
    </form>
  );
}
