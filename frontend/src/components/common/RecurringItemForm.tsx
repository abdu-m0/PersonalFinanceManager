import React from 'react';
import { FormInput, FormSelect, CurrencyInput, CategorySelect } from './FormComponents';
import { Checkbox } from './FormComponents';
import { buttonClasses } from '../../styles/classes';
import type { RecurringItem, Account, Category, Contact, RecurrenceRule, RecurringItemType } from '../../types';
import { useForm } from '../../hooks/useForm';

const recurrenceCadenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
];

const recurringItemTypeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
];

export type RecurringItemFormState = {
    label: string;
    type: RecurringItemType;
    amount: string;
    currency: string;
    nextRunDate: string;
    recurrence: RecurrenceRule;
    accountId: string;
    toAccountId?: string;
    contactId?: string;
    category: string;
    notes: string;
    autoCreateTransaction: boolean;
};

type RecurringItemFormProps = {
    item: RecurringItem | null;
    accounts: Account[];
    categories: string[];
    contacts: Contact[];
    defaultCurrency: string;
    onSubmit: (formData: RecurringItemFormState) => Promise<void>;
    onCancel: () => void;
    status: string;
};

export function RecurringItemForm({
    item,
    accounts,
    categories,
    contacts,
    defaultCurrency,
    onSubmit,
    onCancel,
    status,
}: RecurringItemFormProps) {
    const getInitialState = (): RecurringItemFormState => {
        if (item) {
            return {
                label: item.label,
                type: item.type,
                amount: item.amount.toString(),
                currency: item.currency || defaultCurrency,
                nextRunDate: item.nextRunDate,
                recurrence: item.recurrence,
                accountId: item.accountId || '',
                toAccountId: item.toAccountId || '',
                contactId: item.contactId || '',
                category: item.category || '',
                notes: item.notes || '',
                autoCreateTransaction: item.autoCreateTransaction,
            };
        }
        return {
            label: '',
            type: 'expense',
            amount: '',
            currency: defaultCurrency,
            nextRunDate: new Date().toISOString().slice(0, 10),
            recurrence: { cadence: 'monthly', interval: 1 },
            accountId: '',
            toAccountId: '',
            contactId: '',
            category: '',
            notes: '',
            autoCreateTransaction: true,
        };
    };

    const { formState: formData, handleChange, setFormState: setFormData } = useForm(getInitialState, [item, defaultCurrency]);

    const handleRecurrenceChange = (field: keyof RecurrenceRule, value: any) => {
        setFormData(prev => ({ ...prev, recurrence: { ...prev.recurrence, [field]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <FormInput label="Label" value={formData.label} onChange={val => handleChange('label', val)} required />
            <FormSelect label="Type" value={formData.type} onChange={val => handleChange('type', val as RecurringItemType)} options={recurringItemTypeOptions} />
            <CurrencyInput label="Amount" value={formData.amount} onChange={val => handleChange('amount', val)} required />
            <FormInput label="Next Due Date" type="date" value={formData.nextRunDate} onChange={val => handleChange('nextRunDate', val)} required />
            <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Frequency" value={formData.recurrence.cadence} onChange={val => handleRecurrenceChange('cadence', val as RecurrenceRule['cadence'])} options={recurrenceCadenceOptions} />
                <FormInput label="Interval" type="number" value={formData.recurrence.interval?.toString() || '1'} onChange={val => handleRecurrenceChange('interval', parseInt(val, 10))} min="1" />
            </div>
            {formData.type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-4">
                    <FormSelect label="From Account" value={formData.accountId} onChange={val => handleChange('accountId', val)} options={accounts.map(a => ({ value: a.id, label: a.name }))} />
                    <FormSelect label="To Account" value={formData.toAccountId || ''} onChange={val => handleChange('toAccountId', val)} options={accounts.map(a => ({ value: a.id, label: a.name }))} />
                </div>
            ) : (
                <FormSelect label="Account" value={formData.accountId} onChange={val => handleChange('accountId', val)} options={accounts.map(a => ({ value: a.id, label: a.name }))} />
            )}
            <CategorySelect label="Category" value={formData.category} onChange={val => handleChange('category', val)} options={categories} />
            <FormSelect label="Contact (Optional)" value={formData.contactId || ''} onChange={val => handleChange('contactId', val)} options={[{ value: '', label: 'None' }, ...contacts.map(c => ({ value: c.id, label: c.name }))]} />
            <FormInput label="Notes" value={formData.notes} onChange={val => handleChange('notes', val)} />
            <div>
                <Checkbox label="Automatically create transaction" checked={formData.autoCreateTransaction} onChange={(v) => handleChange('autoCreateTransaction', v)} />
            </div>
            <div className="flex justify-end gap-2 items-center">
                {status && <span className="text-sm text-red-500">{status}</span>}
                <button type="button" onClick={onCancel} className={buttonClasses.secondary}>Cancel</button>
                <button type="submit" className={buttonClasses.primary}>Save</button>
            </div>
        </form>
    );
}
