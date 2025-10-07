import { useState } from 'react';
import type { TransactionStatus, TransactionType, LoanHorizon } from '../types';
import { todayISO } from '../utils/formatting';

export type QuickAddTab = 'transaction' | 'people' | 'loans' | 'receivables';

type QuickTransactionParticipant = {
  contactId: string;
  share: string;
};

type QuickTransactionState = {
  date: string;
  accountId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  notes: string;
  billSplitEnabled: boolean;
  billSplitMode: 'equal' | 'custom';
  participants: QuickTransactionParticipant[];
  equalSelection: string[];
  billSplitPayerId: string; // add payer id for bill splits; default to 'self' (represents the current user)
};

type QuickAutomationState = {
  csvDefaultAccountId: string;
  csvDefaultType: TransactionType;
  csvDelimiter: string;
  csvData: string;
  smsAccountId: string;
  smsMessage: string;
};

type QuickPersonState = {
  name: string;
  label: string;
  phone: string;
  email: string;
};

type QuickLoanState = {
  amount: string;
  currency: string;
  contactId: string;
  startDate: string;
  horizon: LoanHorizon;
  interestRate: string;
  termMonths: string;
};

type QuickReceivableState = {
  amount: string;
  currency: string;
  contactId: string;
  dueDate: string;
  horizon: LoanHorizon;
  interestRate: string;
  termMonths: string;
};

export function useQuickAdd() {
  const [currentTab, setCurrentTab] = useState<QuickAddTab>('transaction');

  const [transaction, setTransaction] = useState<QuickTransactionState>(() => ({
    date: todayISO(),
    accountId: '',
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    type: 'expense',
    status: 'posted',
    category: '',
    notes: '',
    billSplitEnabled: false,
    billSplitMode: 'equal',
    participants: [],
    equalSelection: []
  ,
  billSplitPayerId: 'self' // default to 'self'
  }));
  const [transactionStatus, setTransactionStatus] = useState('');
  const [billSplitError, setBillSplitError] = useState('');
  const [automation, setAutomation] = useState<QuickAutomationState>(() => ({
    csvDefaultAccountId: '',
    csvDefaultType: 'expense',
    csvDelimiter: ',',
    csvData: '',
    smsAccountId: '',
    smsMessage: ''
  }));
  const [automationStatus, setAutomationStatus] = useState('');
  const [person, setPerson] = useState<QuickPersonState>({
    name: '',
    label: '',
    phone: '',
    email: ''
  });
  const [personStatus, setPersonStatus] = useState('');

  const [loan, setLoan] = useState<QuickLoanState>(() => ({
    amount: '',
    currency: 'MVR',
    contactId: '',
    startDate: todayISO(),
    horizon: 'short-term',
    interestRate: '',
    termMonths: ''
  }));
  const [loanStatus, setLoanStatus] = useState('');

  const [receivable, setReceivable] = useState<QuickReceivableState>(() => ({
    amount: '',
    currency: 'MVR',
    contactId: '',
    dueDate: todayISO(),
    horizon: 'short-term',
    interestRate: '',
    termMonths: ''
  }));
  const [receivableStatus, setReceivableStatus] = useState('');

  const resetForms = () => {
    setTransaction({
      date: todayISO(),
      accountId: '',
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      type: 'expense',
      status: 'posted',
      category: '',
      notes: '',
      billSplitEnabled: false,
      billSplitMode: 'equal',
  participants: [],
  equalSelection: [],
  billSplitPayerId: 'self' // reset payer id to 'self'
    });
    setPerson({ name: '', label: '', phone: '', email: '' });
    setLoan({
      amount: '',
      currency: 'MVR',
      contactId: '',
      startDate: todayISO(),
      horizon: 'short-term',
      interestRate: '',
      termMonths: ''
    });
    setReceivable({
      amount: '',
      currency: 'MVR',
      contactId: '',
      dueDate: todayISO(),
      horizon: 'short-term',
      interestRate: '',
      termMonths: ''
    });
    setTransactionStatus('');
    setAutomationStatus('');
    setPersonStatus('');
    setLoanStatus('');
    setReceivableStatus('');
  };

  return {
    currentTab,
    setCurrentTab,
    transaction,
    setTransaction,
    transactionStatus,
    setTransactionStatus,
    billSplitError,
    setBillSplitError,
    automation,
    setAutomation,
    automationStatus,
    setAutomationStatus,
    person,
    setPerson,
    personStatus,
    setPersonStatus,
    loan,
    setLoan,
    loanStatus,
    setLoanStatus,
    receivable,
    setReceivable,
    receivableStatus,
    setReceivableStatus,
    resetForms
  };
}

export type QuickAddState = ReturnType<typeof useQuickAdd>;
