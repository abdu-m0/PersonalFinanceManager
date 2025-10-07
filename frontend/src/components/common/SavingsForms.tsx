import React from 'react';

// Minimal placeholder for SavingsForms. The real implementation lives in separate files
// (SavingsGoalForm, ContributionForm) — this file exists so imports that reference
// it during the build won't fail when the full implementation isn't needed here.

export type SavingsGoalFormState = {
  label: string;
  targetAmount: string;
  targetDate: string;
  priority: string;
  description: string;
  currency?: string;
};

export type ContributionFormState = {
  amount: string;
  date: string;
  accountId: string;
  notes: string;
  currency?: string;
};

export default function SavingsForms(): JSX.Element | null {
  // This placeholder component is intentionally minimal. Use specific form components
  // (`SavingsGoalForm`, `ContributionForm`) instead of this when building UI.
  return null;
}
