import React, { useState } from 'react';
import type { FinanceSettings } from '../types';
import { useForm } from '../hooks/useForm';
import { buttonClasses } from '../styles/classes';
import { PageHeader } from './common/PageHeader';
import { SettingsSection } from './common/SettingsSection';
import { FormInput, FormSelect, Checkbox } from './common/FormComponents';

type SettingsViewProps = {
  settings: FinanceSettings;
  onUpdateSettings: (settings: FinanceSettings) => Promise<void>;
};

const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" }
];

const budgetingPeriodOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" }
];

export default function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const { formState, handleChange, setFormState } = useForm(() => settings, [settings]);
  const [status, setStatus] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving changes...');
    try {
      await onUpdateSettings(formState);
      setStatus('Changes saved successfully.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setStatus(message);
    }
  }

  const handleRemindersChange = (field: keyof FinanceSettings['reminders'], value: boolean) => {
    setFormState(prev => ({
      ...prev,
      reminders: { ...prev.reminders, [field]: value }
    }));
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure your finance workspace"
      />

      <form onSubmit={handleSubmit}>
        <SettingsSection
          title="General"
          description="Configure basic currency and budgeting settings."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect
              label="Default Currency"
              value={formState.defaultCurrency}
              onChange={(value) => handleChange('defaultCurrency', value)}
              options={currencyOptions}
            />
            <FormSelect
              label="Budgeting Period"
              value={formState.budgetingPeriod}
              onChange={(value) => handleChange('budgetingPeriod', value as "monthly" | "weekly" | "custom")}
              options={budgetingPeriodOptions}
            />
            <FormInput
              label="Budget Start Day"
              type="number"
              value={formState.budgetingStartDay.toString()}
              onChange={(value) => handleChange('budgetingStartDay', parseInt(value) || 1)}
              min="1"
              max="31"
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Preferences"
          description="Customize your experience."
        >
          <Checkbox
            label="Allow backdated transaction edits"
            checked={formState.allowBackdatedEdits}
            onChange={(value) => handleChange('allowBackdatedEdits', value)}
            description="Enable this to allow editing transactions in the past."
          />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Manage what reminders you receive."
        >
          <div className="space-y-4">
            <Checkbox
              label="Credit card payment reminders"
              checked={formState.reminders.creditCardDue}
              onChange={(value) => handleRemindersChange('creditCardDue', value)}
            />
            <Checkbox
              label="Loan payment reminders"
              checked={formState.reminders.loanPayments}
              onChange={(value) => handleRemindersChange('loanPayments', value)}
            />
            <Checkbox
              label="Bill split reminders"
              checked={formState.reminders.billSplits}
              onChange={(value) => handleRemindersChange('billSplits', value)}
            />
          </div>
        </SettingsSection>

        <div className="flex justify-between items-center mt-8">
          <button type="submit" className={buttonClasses.primary}>Save Changes</button>
          {status && (
            <span className={`text-sm ${status.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {status}
            </span>
          )}
        </div>
      </form>
    </>
  );
}
