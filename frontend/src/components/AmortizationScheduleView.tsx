import React from 'react';
import type { Loan, Account } from '../types';
import { AmortizationSchedule } from './common/AmortizationSchedule';

type AmortizationScheduleViewProps = {
  loan: Loan;
  accounts: Account[];
  onPay: (payment: { amount: number; date: string; currency: string; accountId: string }) => Promise<void>;
};

export default function AmortizationScheduleView({ loan, accounts, onPay }: AmortizationScheduleViewProps) {
  return <AmortizationSchedule loan={loan} accounts={accounts} onPay={onPay} />;
}

