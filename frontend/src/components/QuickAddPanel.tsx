import React, { useEffect, useMemo, useState } from 'react';
import { getTopContacts, incrementContactCounts, getFavourites, setFavourite } from '../utils/favorites';
import { FormInput, FormSelect, FormTextArea, CurrencyInput, CategorySelect } from "./common/FormComponents";
import { buttonClasses } from '../styles/classes';
import { Modal } from './common/Modal';
import ParticipantEditor from './common/ParticipantEditor';
import Button from './ui/button';
import { parseInputAmount, formatAmount } from '../utils/formatting';
// Switch removed: bill-split is initiated via the "Add participants" button in the action row
import FancyRadio from './common/FancyRadio';
import type { Account, Category, Contact, TransactionStatus, TransactionType } from '../types';
import type { NotificationType } from '../hooks/useNotification';
import type { QuickAddTab, QuickAddState } from '../hooks/useQuickAdd';
import {
  createTransaction as createTransactionApi,
  importTransactionsFromCsv,
  importTransactionFromSms,
  createContact as createContactApi,
  createLoan as createLoanApi
} from '../utils/api';

const tabLabels: Array<{ id: QuickAddTab; label: string; helper: string }> = [
  { id: 'transaction', label: 'Transaction', helper: 'Add a quick income, expense, or transfer' },
  { id: 'people', label: 'People', helper: 'Capture a new contact for future splits' },
  { id: 'loans', label: 'Loans', helper: 'Track borrowed money with a shortcut' },
  { id: 'receivables', label: 'Receivables', helper: 'Track money others owe you' }
];

const horizonOptions = [
  { value: 'short-term', label: 'Short Term' },
  { value: 'long-term', label: 'Long Term' }
];

const transactionTypeOptions: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' }
];

const transactionStatusOptions: Array<{ value: TransactionStatus; label: string }> = [
  { value: 'posted', label: 'Posted' },
  { value: 'pending', label: 'Pending' }
];

type QuickAddPanelProps = {
  quickAdd: QuickAddState;
  accounts: Account[];
  contacts: Contact[];
  categories: Category[];
  defaultCurrency: string;
  onNotify: (type: NotificationType, message: string) => void;
  onRefreshSnapshot: () => Promise<void>;
};

export default function QuickAddPanel({
  quickAdd,
  accounts,
  contacts,
  categories,
  defaultCurrency,
  onNotify,
  onRefreshSnapshot
}: QuickAddPanelProps) {
  const {
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
  } = quickAdd;

  const [automationMode, setAutomationMode] = useState<'csv' | 'sms' | null>(null);
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  // buffer selections while modal is open so Cancel reverts changes
  const [bufferSelectedContactIds, setBufferSelectedContactIds] = useState<string[]>([]);
  const [bufferPayerId, setBufferPayerId] = useState<string | undefined>(undefined);
  const [bufferModalError, setBufferModalError] = useState<string | null>(null);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [autoAddedPayerId, setAutoAddedPayerId] = useState<string | null>(null);
  const autoAddedPayerRef = React.useRef<string | null>(null);
  const [payerBadgeAnimateId, setPayerBadgeAnimateId] = useState<string | null>(null);
  const [frequentContacts, setFrequentContacts] = useState<Contact[]>([]);
  const [favouritesMap, setFavouritesMap] = useState<Record<string, boolean>>({});
  // store both applied and previous participants so Undo can revert replaces
  const [lastAppliedParticipants, setLastAppliedParticipants] = useState<{
    applied: { contactId: string; share: string }[];
    previous: { contactId: string; share: string }[];
  } | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [newParticipant, setNewParticipant] = useState<{ contactId: string; share: string }>({ contactId: '', share: '' });
  // popover state moved into ParticipantEditor component

  const accountOptions = useMemo(
    () => [
      { value: '', label: 'Select account' },
      ...accounts.map((account) => ({ value: account.id, label: `${account.name}` }))
    ],
    [accounts]
  );

  const categoryNames = useMemo(() => {
    const seen = new Set<string>();
    categories.forEach((category) => {
      const name = category.name.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
      }
    });
    if (seen.size === 0) {
      seen.add('General');
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [categories]);

  const contactOptions = useMemo(
    () => [
      { value: '', label: 'Select contact' },
      ...contacts.map((contact) => ({ value: contact.id, label: contact.name }))
    ],
    [contacts]
  );

  const renderStatus = (status: string) => (
    status ? <span className="text-sm text-slate-700">{status}</span> : null
  );

  // Styled toggle classes (simple)
  const toggleClasses = (on: boolean) =>
    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300'}`;

  const knobClasses = (on: boolean) =>
    `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-1'}`;

  const handleResetAll = () => {
    resetForms();
    setTransactionStatus('');
    setAutomationStatus('');
    setPersonStatus('');
    setLoanStatus('');
    setReceivableStatus('');
    setBillSplitError('');
    setAutomationMode(null);
    onNotify('info', 'Quick add forms cleared.');
  };

  const handleTransactionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBillSplitError('');

    const baseAccountId = transaction.type === 'transfer' ? (transaction.fromAccountId || transaction.accountId) : transaction.accountId;
    if (!baseAccountId) {
      const message = 'Select an account before saving.';
      setTransactionStatus(message);
      onNotify('error', message);
      return;
    }

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'Enter an amount greater than zero.';
      setTransactionStatus(message);
      onNotify('error', message);
      return;
    }

    if (transaction.type === 'transfer' && !transaction.toAccountId) {
      const message = 'Select a destination account for transfers.';
      setTransactionStatus(message);
      onNotify('error', message);
      return;
    }

  let billSplitPeople: string[] | undefined;
  let billSplitPayerId: string | undefined;
    if (transaction.billSplitEnabled) {
      // participants array is the single source of truth; equal mode will split among participants equally
      // if custom mode, validate shares sum
      if (transaction.billSplitMode === 'custom') {
        const total = parseInputAmount(transaction.amount || '0');
        const shares = (transaction.participants || []).map((p) => parseShareValue(p.share || '', total));
        const sum = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100;
        if (Math.abs(sum - total) > 0.01) {
          const message = `Shares total ${formatAmount(sum, accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency)} does not match transaction amount ${formatAmount(total, accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency)}.`;
          setBillSplitError(message + ' Adjust shares or click Normalize.');
          setTransactionStatus('');
          return;
        }
      }

      billSplitPeople = (transaction.participants || []).map((participant) => participant.contactId).filter(Boolean);
      billSplitPayerId = transaction.billSplitPayerId || 'self';

      // ensure payer is included in the participants for display and to keep server-side logic consistent
      if (!billSplitPeople.includes(billSplitPayerId)) {
        billSplitPeople = [billSplitPayerId, ...billSplitPeople];
      }

      if (!billSplitPeople.length) {
        const message = 'Select at least one participant for the bill split.';
        setBillSplitError(message);
        setTransactionStatus('');
        return;
      }
    }

    const accountCurrency = accounts.find((account) => account.id === baseAccountId)?.currency ?? defaultCurrency;
    const payload = {
      type: transaction.type,
      date: transaction.date || new Date().toISOString().slice(0, 10),
      amount,
      currency: accountCurrency,
      status: transaction.status,
      accountId: baseAccountId,
      fromAccountId: transaction.type === 'transfer' ? baseAccountId : undefined,
      toAccountId: transaction.type === 'transfer' ? transaction.toAccountId || undefined : undefined,
      description: transaction.notes?.trim() || transaction.category || 'Quick add transaction',
      category: transaction.category || undefined,
      notes: transaction.notes || undefined,
      metadata: transaction.billSplitEnabled
        ? {
            quickAdd: true,
            billSplitMode: transaction.billSplitMode
          }
        : undefined,
      billSplit: billSplitPeople ? { people: Array.from(new Set(billSplitPeople)), payerContactId: billSplitPayerId } : undefined
    };

    try {
      setTransactionStatus('Saving...');
      const resp = await createTransactionApi(payload);
      // resp may be the raw Transaction (legacy) or an object { transaction, createdLoans }
      const createdLoans = (resp && typeof resp === 'object' && 'createdLoans' in resp) ? (resp as any).createdLoans : undefined;

      await onRefreshSnapshot();

      setTransaction((prev) => ({
        ...prev,
        amount: '',
        notes: '',
        category: '',
        participants: [],
        equalSelection: [],
        billSplitEnabled: false
      }));
      // clear undo state
      setLastAppliedParticipants(null);
      setUndoVisible(false);
      setTransactionStatus('Transaction added.');
      onNotify('success', 'Transaction recorded successfully.');
      if (createdLoans && createdLoans.length > 0) {
        // summarize created loans
        const receivables = createdLoans.filter((l: any) => l.direction === 'lent');
        const borroweds = createdLoans.filter((l: any) => l.direction === 'borrowed');
        if (receivables.length > 0) {
          onNotify('info', `Created ${receivables.length} receivable${receivables.length > 1 ? 's' : ''}.`);
        }
        if (borroweds.length > 0) {
          onNotify('info', `Created ${borroweds.length} short-term loan${borroweds.length > 1 ? 's' : ''}.`);
        }
      }
      setTimeout(() => setTransactionStatus(''), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save transaction.';
      setTransactionStatus(message);
      onNotify('error', message);
    }
  };

  const handleAutomationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setAutomationStatus('Processing...');

      if (automationMode === 'csv') {
        if (!automation.csvData.trim()) {
          throw new Error('Paste CSV data to continue.');
        }

        const result = await importTransactionsFromCsv({
          csv: automation.csvData,
          defaultAccountId: automation.csvDefaultAccountId || undefined,
          defaultType: automation.csvDefaultType,
          delimiter: automation.csvDelimiter || ','
        });

        await onRefreshSnapshot();

        const summaryParts = [] as string[];
        summaryParts.push(`${result.imported.length} transaction${result.imported.length === 1 ? '' : 's'} imported`);
        if (result.errors.length) {
          summaryParts.push(`${result.errors.length} issue${result.errors.length === 1 ? '' : 's'} skipped`);
        }
        const summary = summaryParts.join(', ');

        setAutomationStatus(summary);
        onNotify(result.errors.length ? 'info' : 'success', summary);
      } else {
        if (!automation.smsAccountId) {
          throw new Error('Select an account to parse the SMS.');
        }
        if (!automation.smsMessage.trim()) {
          throw new Error('Paste an SMS message to parse.');
        }

        await importTransactionFromSms({
          accountId: automation.smsAccountId,
          message: automation.smsMessage,
          notes: automation.smsMessage.slice(0, 120)
        });

        await onRefreshSnapshot();
        setAutomationStatus('SMS parsed and queued as a transaction.');
        onNotify('success', 'SMS parsed into a transaction.');
      }

      setTimeout(() => setAutomationStatus(''), 6000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process automation data.';
      setAutomationStatus(message);
      onNotify('error', message);
    }
  };

  const handlePersonSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!person.name.trim()) {
      const message = 'Enter a name to add the contact.';
      setPersonStatus(message);
      onNotify('error', message);
      return;
    }

    try {
      setPersonStatus('Saving...');
      await createContactApi({
        name: person.name,
        label: person.label || undefined,
        phone: person.phone || undefined,
        email: person.email || undefined
      });
      await onRefreshSnapshot();

      setPerson({ name: '', label: '', phone: '', email: '' });
      setPersonStatus('Contact added.');
      onNotify('success', 'Contact saved successfully.');
      setTimeout(() => setPersonStatus(''), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add contact.';
      setPersonStatus(message);
      onNotify('error', message);
    }
  };

  const handleLoanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(loan.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'Enter an amount greater than zero.';
      setLoanStatus(message);
      onNotify('error', message);
      return;
    }

    if (!loan.contactId) {
      const message = 'Select who issued the loan.';
      setLoanStatus(message);
      onNotify('error', message);
      return;
    }

    const horizonTerm = loan.horizon === 'long-term' ? Number(loan.termMonths || '0') : 1;
    if (!Number.isFinite(horizonTerm) || horizonTerm <= 0) {
      const message = 'Provide a valid term in months.';
      setLoanStatus(message);
      onNotify('error', message);
      return;
    }

    const interestRate = Number(loan.interestRate || '0');
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      const message = 'Interest rate must be zero or higher.';
      setLoanStatus(message);
      onNotify('error', message);
      return;
    }

    const contactName = contacts.find((contact) => contact.id === loan.contactId)?.name ?? 'Loan';

    try {
      setLoanStatus('Saving...');
      await createLoanApi({
        label: loan.horizon === 'short-term' ? `Quick loan - ${contactName}` : `Loan (${contactName})`,
        contactId: loan.contactId,
        direction: 'borrowed',
        horizon: loan.horizon,
        principal: amount,
        currency: loan.currency || defaultCurrency,
        interestRate,
        termMonths: horizonTerm,
        startDate: loan.startDate || new Date().toISOString().slice(0, 10)
      });
      await onRefreshSnapshot();

      setLoan((prev) => ({
        ...prev,
        amount: '',
        contactId: '',
        interestRate: '',
        termMonths: ''
      }));
      setLoanStatus('Loan recorded.');
      onNotify('success', 'Loan saved successfully.');
      setTimeout(() => setLoanStatus(''), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save loan.';
      setLoanStatus(message);
      onNotify('error', message);
    }
  };

  const handleReceivableSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(receivable.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'Enter an amount greater than zero.';
      setReceivableStatus(message);
      onNotify('error', message);
      return;
    }

    if (!receivable.contactId) {
      const message = 'Select who owes you.';
      setReceivableStatus(message);
      onNotify('error', message);
      return;
    }

    const horizonTerm = receivable.horizon === 'long-term' ? Number(receivable.termMonths || '0') : 1;
    if (!Number.isFinite(horizonTerm) || horizonTerm <= 0) {
      const message = 'Provide a valid term in months.';
      setReceivableStatus(message);
      onNotify('error', message);
      return;
    }

    const interestRate = Number(receivable.interestRate || '0');
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      const message = 'Interest rate must be zero or higher.';
      setReceivableStatus(message);
      onNotify('error', message);
      return;
    }

    const contactName = contacts.find((contact) => contact.id === receivable.contactId)?.name ?? 'Receivable';

    try {
      setReceivableStatus('Saving...');
      await createLoanApi({
        label: receivable.horizon === 'short-term' ? `Receivable - ${contactName}` : `Receivable (${contactName})`,
        contactId: receivable.contactId,
        direction: 'lent',
        horizon: receivable.horizon,
        principal: amount,
        currency: receivable.currency || defaultCurrency,
        interestRate,
        termMonths: horizonTerm,
        startDate: receivable.dueDate || new Date().toISOString().slice(0, 10)
      });
      await onRefreshSnapshot();

      setReceivable((prev) => ({
        ...prev,
        amount: '',
        contactId: '',
        interestRate: '',
        termMonths: ''
      }));
      setReceivableStatus('Receivable recorded.');
      onNotify('success', 'Receivable saved successfully.');
      setTimeout(() => setReceivableStatus(''), 4000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save receivable.';
      setReceivableStatus(message);
      onNotify('error', message);
    }
  };

  const renderTransactionTab = () => {
    if (automationMode) {
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {automationMode === 'csv' ? 'CSV Import' : 'SMS Parser'}
            </h3>
            <button
              type="button"
              onClick={() => setAutomationMode(null)}
              className={buttonClasses.secondary}
            >
              Back to Transaction
            </button>
          </div>
          <form onSubmit={handleAutomationSubmit} className="space-y-4">
            {automationMode === 'csv' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Bulk add transactions by pasting data from a spreadsheet. Ensure the columns match the expected format.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormSelect
                    label="Default Account"
                    value={automation.csvDefaultAccountId}
                    onChange={(value) => setAutomation((prev) => ({ ...prev, csvDefaultAccountId: value }))}
                    options={accountOptions}
                  />
                  <FormSelect
                    label="Transaction Type"
                    value={automation.csvDefaultType}
                    onChange={(value) => setAutomation((prev) => ({ ...prev, csvDefaultType: value as TransactionType }))}
                    options={transactionTypeOptions}
                  />
                  <FormInput
                    label="Delimiter"
                    value={automation.csvDelimiter}
                    onChange={(value) => setAutomation((prev) => ({ ...prev, csvDelimiter: value }))}
                    placeholder=","
                  />
                </div>
                <FormTextArea
                  label="CSV Data"
                  value={automation.csvData}
                  onChange={(value) => setAutomation((prev) => ({ ...prev, csvData: value }))}
                  placeholder="Paste your CSV data here..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                 <p className="text-sm text-slate-600">
                  Paste a single SMS message to automatically create a transaction.
                </p>
                <div className="grid grid-cols-1">
                  <FormSelect
                    label="Account"
                    value={automation.smsAccountId}
                    onChange={(value) => setAutomation((prev) => ({ ...prev, smsAccountId: value }))}
                    options={accountOptions}
                  />
                </div>
                <FormTextArea
                  label="SMS Message"
                  value={automation.smsMessage}
                  onChange={(value) => setAutomation((prev) => ({ ...prev, smsMessage: value }))}
                  placeholder="Paste your SMS message here..."
                />
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button type="submit" className={buttonClasses.primary}>
                {automationMode === 'csv' ? 'Import Transactions' : 'Parse SMS'}
              </button>
              {renderStatus(automationStatus)}
            </div>
          </form>
        </div>
      );
    }

    return (
      <form onSubmit={handleTransactionSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Date"
            type="date"
            value={transaction.date}
            onChange={(value) => setTransaction((prev) => ({ ...prev, date: value }))}
          />
          <FormSelect
            label="Type"
            value={transaction.type}
            onChange={(value) => setTransaction((prev) => ({ ...prev, type: value as TransactionType }))}
            options={transactionTypeOptions}
          />
          <FormSelect
            label="Account"
            value={transaction.accountId}
            onChange={(value) => setTransaction((prev) => ({ ...prev, accountId: value }))}
            options={accountOptions}
          />
          <CategorySelect
            label="Category"
            value={transaction.category}
            options={categoryNames}
            onChange={(value) => setTransaction((prev) => ({ ...prev, category: value }))}
          />
          <CurrencyInput
            label="Amount"
            value={transaction.amount}
            onChange={(value) => setTransaction((prev) => ({ ...prev, amount: value }))}
            required
          />
          <FormInput
            label="Transaction name"
            value={transaction.notes}
            onChange={(value) => setTransaction((prev) => ({ ...prev, notes: value }))}
            placeholder="Optional"
          />
          <div className="flex flex-col md:col-span-2 gap-2">
            {/* Bill split is enabled via the Add participants button in the action row */}

            {transaction.billSplitEnabled && (
              <div className="p-3 border border-slate-100 rounded-md bg-slate-50">
                {(transaction.equalSelection?.length || transaction.participants?.length) === 0 && (
                  <div className="text-sm text-yellow-700 mb-2">Select participants to enable splitting this transaction.</div>
                )}
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-4 mb-2">
                    <FancyRadio
                      name="billSplitMode"
                      value="equal"
                      checked={transaction.billSplitMode === 'equal'}
                      label="Equal split"
                      onChange={() => setTransaction((prev) => ({ ...prev, billSplitMode: 'equal' }))}
                    />
                    <FancyRadio
                      name="billSplitMode"
                      value="custom"
                      checked={transaction.billSplitMode === 'custom'}
                      label="Custom split"
                      onChange={() => setTransaction((prev) => ({ ...prev, billSplitMode: 'custom' }))}
                    />
                  </div>
                </div>

                {transaction.billSplitMode === 'equal' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Participants (equal)</div>
                      <button
                        type="button"
                        className={buttonClasses.secondary}
                        onClick={() => {
                          setBufferSelectedContactIds((transaction.participants || []).map((p) => p.contactId).filter(Boolean));
                          setBufferPayerId(transaction.billSplitPayerId || 'self');
                          setParticipantModalOpen(true);
                        }}
                      >
                        Edit participants
                      </button>
                    </div>
                    {(!transaction.participants || transaction.participants.length === 0) ? (
                      <p className="text-sm text-slate-500">No participants yet. Click Edit participants to add people to the split.</p>
                    ) : (
                      <div className="mt-1 text-sm text-slate-700">
                        <div className="font-medium mb-1">Per-person (equal)</div>
                        <ParticipantEditor
                          participants={transaction.participants || []}
                          contacts={contacts}
                          accountCurrency={accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency}
                          billSplitMode={transaction.billSplitMode}
                          amount={transaction.amount || '0'}
                          payerId={transaction.billSplitPayerId || 'self'}
                          onSetPayer={(id) => handleSetPayer(id)}
                          onRemove={(id) => handleRemoveParticipant(id)}
                          onUpdateShare={(id, share) => setTransaction((prev) => ({ ...prev, participants: (prev.participants || []).map(p => p.contactId === id ? { ...p, share } : p) }))}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Participants (custom)</div>
                      <button
                        type="button"
                        className={buttonClasses.secondary}
                        onClick={() => {
                          setBufferSelectedContactIds((transaction.participants || []).map((p) => p.contactId).filter(Boolean));
                          setBufferPayerId(transaction.billSplitPayerId || 'self');
                          setParticipantModalOpen(true);
                        }}
                      >
                        Edit participants
                      </button>
                    </div>
                    {(!transaction.participants || transaction.participants.length === 0) ? (
                      <p className="text-sm text-slate-500">No participants yet. Click Edit participants to add people to the split.</p>
                    ) : (
                      <div className="mt-1 text-sm text-slate-700 space-y-1">
                        <ParticipantEditor
                          participants={transaction.participants || []}
                          contacts={contacts}
                          accountCurrency={accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency}
                          billSplitMode={transaction.billSplitMode}
                          amount={transaction.amount || '0'}
                          payerId={transaction.billSplitPayerId || 'self'}
                          onSetPayer={(id) => handleSetPayer(id)}
                          onRemove={(id) => handleRemoveParticipant(id)}
                          onUpdateShare={(id, share) => setTransaction((prev) => ({ ...prev, participants: (prev.participants || []).map(p => p.contactId === id ? { ...p, share } : p) }))}
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* internal Add participant removed — use the Add participants button in the top action row */}
                {/* Custom share sum validation */}
                {transaction.billSplitMode === 'custom' && (transaction.participants || []).length > 0 && (
                  (() => {
                    const total = parseInputAmount(transaction.amount || '0');
                    const shares = (transaction.participants || []).map((p) => parseInputAmount(p.share || '0'));
                    const sum = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100;
                    const ok = Math.abs(sum - total) < 0.01;
                    return (
                      <div className={`mt-2 text-sm ${ok ? 'text-slate-600' : 'text-red-600'}`}>
                        {ok ? (
                          `Shares total ${formatAmount(sum, accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency)}`
                        ) : (
                          `Shares sum ${formatAmount(sum, accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency)} does not match transaction amount ${formatAmount(total, accounts.find(a => a.id === transaction.accountId)?.currency || defaultCurrency)}`
                        )}
                      </div>
                    );
                  })()
                  )}
                  </div>
              )}
            </div>
          </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button type="submit">Quick Add Transaction</Button>
              <Button
                variant="secondary"
              onClick={() => {
                // enable bill split and open participant modal
                setTransaction((prev) => ({ ...prev, billSplitEnabled: true }));
                setBufferSelectedContactIds((transaction.participants || []).map((p) => p.contactId).filter(Boolean));
                setBufferPayerId(transaction.billSplitPayerId || 'self');
                setParticipantModalOpen(true);
              }}
            >
              Add participants
            </Button>
            <Button variant="secondary" onClick={() => setAutomationMode('csv')}>Bulk Add</Button>
            <Button variant="secondary" onClick={() => setAutomationMode('sms')}>SMS Parser</Button>
            {renderStatus(transactionStatus)}
          </div>
          <Modal isOpen={participantModalOpen} onClose={() => setParticipantModalOpen(false)} title="Add participants">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Payer</h4>
                <FormSelect
                  label="Who paid?"
                  value={bufferPayerId || 'self'}
                  onChange={(value) => setBufferPayerId(value)}
                  options={[{ value: 'self', label: 'You' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
                />
                {(bufferPayerId && bufferPayerId !== 'self') && (
                  <div className="mt-1 text-sm text-slate-600">If someone else is the payer, the app will create a short-term loan for your share owed to them.</div>
                )}
              </div>
              <p className="text-sm text-slate-600">Select one or more people to add to this split.</p>
              <div>
                <h4 className="text-sm font-medium mb-2">Favourites</h4>
                <div className="grid grid-cols-2 gap-3">
                  {favouritePreview.filter(c => favouritesMap[c.id] || true).map((c) => {
                    const selected = bufferSelectedContactIds.includes(c.id);
                    const isPayer = (bufferPayerId || transaction.billSplitPayerId || 'self') === c.id;
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => setBufferSelectedContactIds((prev) => (prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBufferSelectedContactIds((prev) => (prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])); } }}
                        onContextMenu={(e) => { e.preventDefault(); setBufferPayerId(c.id); }}
                        onMouseDown={() => startLongPress(c.id)}
                        onMouseUp={() => cancelLongPress()}
                        onMouseLeave={() => cancelLongPress()}
                        onTouchStart={() => startLongPress(c.id)}
                        onTouchEnd={() => cancelLongPress()}
                        className={`relative p-3 rounded-md cursor-pointer transition-colors border ${selected ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className="text-sm font-medium text-slate-800">{c.name} {isPayer && <span className="text-xs text-blue-600">(Payer)</span>}</div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            title={favouritesMap[c.id] ? 'Unfavorite' : 'Favorite'}
                            onClick={(e) => { e.stopPropagation(); const val = !favouritesMap[c.id]; setFavouritesMap((prev) => ({ ...prev, [c.id]: val })); setFavourite(c.id, val); }}
                            className="text-yellow-500 text-xs"
                          >{favouritesMap[c.id] ? '★' : '☆'}</button>
                          {selected && (
                            <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">All contacts</h4>
                <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                  {contacts.map((c) => {
                    const selected = bufferSelectedContactIds.includes(c.id);
                    const isPayer = (bufferPayerId || transaction.billSplitPayerId || 'self') === c.id;
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => setBufferSelectedContactIds((prev) => (prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBufferSelectedContactIds((prev) => (prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])); } }}
                        onContextMenu={(e) => { e.preventDefault(); setBufferPayerId(c.id); }}
                        onMouseDown={() => startLongPress(c.id)}
                        onMouseUp={() => cancelLongPress()}
                        onMouseLeave={() => cancelLongPress()}
                        onTouchStart={() => startLongPress(c.id)}
                        onTouchEnd={() => cancelLongPress()}
                        className={`relative p-3 rounded-md cursor-pointer transition-colors border ${selected ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        <div className="text-sm font-medium text-slate-800">{c.name} {isPayer && <span className="text-xs text-blue-600">(Payer)</span>}</div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            title={favouritesMap[c.id] ? 'Unfavorite' : 'Favorite'}
                            onClick={(e) => { e.stopPropagation(); const val = !favouritesMap[c.id]; setFavouritesMap((prev) => ({ ...prev, [c.id]: val })); setFavourite(c.id, val); }}
                            className="text-yellow-500 text-xs"
                          >{favouritesMap[c.id] ? '★' : '☆'}</button>
                          {selected && (
                            <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                {bufferModalError && (
                  <div className="text-sm text-red-600 mb-2">{bufferModalError}</div>
                )}
                <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={buttonClasses.primary}
                  onClick={() => {
                      // Apply buffered selections to transaction.participants
                      const selected = bufferSelectedContactIds.filter(Boolean);
                      const payerId = bufferPayerId || transaction.billSplitPayerId || 'self';

                      // If payer is not 'self', require that the payer be among selected contacts
                      if (payerId !== 'self' && !selected.includes(payerId)) {
                        setBufferModalError('Include the payer among participants before applying.');
                        return;
                      }

                      // clear any previous modal error
                      setBufferModalError(null);

                      setTransaction((prev) => {
                        const existing = prev.participants || [];
                        // combine existing and selected. If payer is 'self' and not selected, we'll include it below.
                        const combined = Array.from(new Set([...existing.map(p => p.contactId), ...selected]));
                        if (!combined.includes(payerId)) combined.unshift(payerId);
                        const applied = Array.from(new Set(combined))
                          .filter(Boolean)
                          .map((id) => existing.find((p) => p.contactId === id) || { contactId: id, share: '' });

                        // For equal mode: compute equal shares
                          if (prev.billSplitMode === 'equal') {
                          const total = parseInputAmount(prev.amount || '0');
                          const count = applied.length;
                          const share = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
                          const filled = applied.map((p) => ({ ...p, share: String(share) }));
                        // if payer was not previously in participants, mark as auto-added
                        if (!existing.some(e => e.contactId === payerId)) setAutoAdded(payerId);
                        return { ...prev, participants: filled, billSplitPayerId: payerId };
                        }
                        if (!existing.some(e => e.contactId === payerId)) setAutoAdded(payerId);
                        return { ...prev, participants: applied, billSplitPayerId: payerId };
                      });

                      // increment favorites counts for newly selected contacts only (those not already in participants)
                      (async () => {
                        try {
                          const existingIds = (transaction.participants || []).map(p => p.contactId).filter(Boolean);
                          const newly = bufferSelectedContactIds.filter(id => !existingIds.includes(id));
                          if (newly.length) await incrementContactCounts(newly);
                          // store last applied and previous participants for undo
                          const applied = bufferSelectedContactIds.filter(Boolean).map(id => ({ contactId: id, share: '' }));
                          setLastAppliedParticipants({ applied, previous: (transaction.participants || []).slice() });
                          setUndoVisible(true);
                          setTimeout(() => setUndoVisible(false), 7000);
                        } catch (e) {
                          // ignore
                        }
                      })();

                      setParticipantModalOpen(false);
                  }}
                >
                  Done
                </button>
                <button
                  type="button"
                  className={buttonClasses.secondary}
                  onClick={() => {
                    // revert buffer and close modal
                    setBufferSelectedContactIds([]);
                    setParticipantModalOpen(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
              {transaction.billSplitEnabled && (
                <div className="mt-3 p-2 text-sm text-slate-600">Set the payer by clicking a person in the participant list (or use long-press / right-click in the Add participants modal).</div>
              )}
    {participantError && (
          <div className="text-sm text-red-600 mt-2">{participantError}</div>
        )}
        {billSplitError && (
          <div className="text-sm text-red-600 mt-2">{billSplitError}</div>
        )}
      </form>
    );
  };

  const renderPersonTab = () => (
    <form onSubmit={handlePersonSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Name"
          value={person.name}
          onChange={(value) => setPerson((prev) => ({ ...prev, name: value }))}
        />
        <FormInput
          label="Label"
          value={person.label}
          onChange={(value) => setPerson((prev) => ({ ...prev, label: value }))}
          placeholder="Friend, family, coworker..."
        />
        <FormInput
          label="Phone"
          value={person.phone}
          onChange={(value) => setPerson((prev) => ({ ...prev, phone: value }))}
          placeholder="Optional"
        />
        <FormInput
          label="Email"
          value={person.email}
          onChange={(value) => setPerson((prev) => ({ ...prev, email: value }))}
          placeholder="Optional"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" className={buttonClasses.primary}>Quick Add Contact</button>
        {renderStatus(personStatus)}
      </div>
    </form>
  );

  const renderLoanTab = () => (
    <form onSubmit={handleLoanSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyInput
          label="Amount"
          value={loan.amount}
          onChange={(value) => setLoan((prev) => ({ ...prev, amount: value }))}
          required
        />
        <FormInput
          label="Currency"
          value={loan.currency || defaultCurrency}
          onChange={(value) => setLoan((prev) => ({ ...prev, currency: value }))}
        />
        <FormSelect
          label="Contact"
          value={loan.contactId}
          onChange={(value) => setLoan((prev) => ({ ...prev, contactId: value }))}
          options={contactOptions}
        />
        <FormInput
          label="Start Date"
          type="date"
          value={loan.startDate}
          onChange={(value) => setLoan((prev) => ({ ...prev, startDate: value }))}
        />
        <FormSelect
          label="Horizon"
          value={loan.horizon}
          onChange={(value) => setLoan((prev) => ({ ...prev, horizon: value as typeof loan.horizon }))}
          options={horizonOptions}
        />
        <FormInput
          label="Interest Rate (%)"
          type="number"
          value={loan.interestRate}
          onChange={(value) => setLoan((prev) => ({ ...prev, interestRate: value }))}
          min="0"
        />
        <FormInput
          label="Term (Months)"
          type="number"
          value={loan.termMonths}
          onChange={(value) => setLoan((prev) => ({ ...prev, termMonths: value }))}
          min="0"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" className={buttonClasses.primary}>Quick Add Loan</button>
        {renderStatus(loanStatus)}
      </div>
    </form>
  );

  const renderReceivableTab = () => (
    <form onSubmit={handleReceivableSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyInput
          label="Amount"
          value={receivable.amount}
          onChange={(value) => setReceivable((prev) => ({ ...prev, amount: value }))}
          required
        />
        <FormInput
          label="Currency"
          value={receivable.currency || defaultCurrency}
          onChange={(value) => setReceivable((prev) => ({ ...prev, currency: value }))}
        />
        <FormSelect
          label="Contact"
          value={receivable.contactId}
          onChange={(value) => setReceivable((prev) => ({ ...prev, contactId: value }))}
          options={contactOptions}
        />
        <FormInput
          label="Due Date"
          type="date"
          value={receivable.dueDate}
          onChange={(value) => setReceivable((prev) => ({ ...prev, dueDate: value }))}
        />
        <FormSelect
          label="Horizon"
          value={receivable.horizon}
          onChange={(value) => setReceivable((prev) => ({ ...prev, horizon: value as typeof receivable.horizon }))}
          options={horizonOptions}
        />
        <FormInput
          label="Interest Rate (%)"
          type="number"
          value={receivable.interestRate}
          onChange={(value) => setReceivable((prev) => ({ ...prev, interestRate: value }))}
          min="0"
        />
        <FormInput
          label="Term (Months)"
          type="number"
          value={receivable.termMonths}
          onChange={(value) => setReceivable((prev) => ({ ...prev, termMonths: value }))}
          min="0"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="submit" className={buttonClasses.primary}>Quick Add Receivable</button>
        {renderStatus(receivableStatus)}
      </div>
    </form>
  );

  useEffect(() => {
    if (!transaction.category) {
      return;
    }
    const match = categories.find((category) => category.id === transaction.category);
    if (match && match.name !== transaction.category) {
      setTransaction((prev) => (prev.category === match.id ? { ...prev, category: match.name } : prev));
    }
  }, [categories, transaction.category, setTransaction]);

  useEffect(() => {
    let mounted = true;
    if (participantModalOpen) {
      // load frequent contacts
      (async () => {
        try {
          const top = await getTopContacts(contacts, 5);
          const favs = await getFavourites();
          if (mounted) {
            setFrequentContacts(top);
            setFavouritesMap(favs || {});
          }
        } catch (e) {
          if (mounted) setFrequentContacts(contacts.slice(0, 5));
        }
      })();
    }
    return () => { mounted = false; };
  }, [participantModalOpen, contacts]);

  // long-press handling for mobile: set payer by pressing and holding a tile
  const longPressTimer = React.useRef<number | null>(null);
  function startLongPress(id: string) {
    cancelLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setBufferPayerId(id);
    }, 600) as unknown as number;
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current as unknown as number);
      longPressTimer.current = null;
    }
  }

  // Helper to set payer inline using participant list
  function setAutoAdded(id: string | null) {
    autoAddedPayerRef.current = id;
    setAutoAddedPayerId(id);
  }

  function handleSetPayer(contactId?: string) {
    if (!contactId) return;
    const name = contactId === 'self' ? 'You' : (contacts.find(c => c.id === contactId)?.name || 'Person');

    setTransaction((prev) => {
      let parts = (prev.participants || []).slice();

      // If we previously auto-added a payer and it's different from the new one, remove it
      if (autoAddedPayerRef.current && autoAddedPayerRef.current !== contactId) {
        parts = parts.filter((p) => p.contactId !== autoAddedPayerRef.current);
      }

      const exists = parts.some((p) => p.contactId === contactId);
      if (!exists) {
        parts = [...parts, { contactId: contactId, share: '' }];
        // mark this as auto-added so we can remove it later if payer changes
        setAutoAdded(contactId);
      } else {
        // if the payer already existed, keep or clear auto-added marker appropriately
        if (autoAddedPayerRef.current === contactId) {
          setAutoAdded(contactId);
        } else {
          setAutoAdded(null);
        }
      }

      // For equal mode: recompute equal shares but keep list order
      if (prev.billSplitMode === 'equal') {
        const total = parseInputAmount(prev.amount || '0');
        const count = parts.filter(p => p.contactId).length;
        const share = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
        parts = parts.map((p) => ({ ...p, share: String(share) }));
      }

      return { ...prev, participants: parts, billSplitPayerId: contactId };
    });

    // animate payer badge
    setPayerBadgeAnimateId(contactId);
    window.setTimeout(() => setPayerBadgeAnimateId(null), 700);

    onNotify('info', `${name} set as payer`);
  }

  function handleRemoveParticipant(contactId?: string) {
    if (!contactId) return;
    const name = contactId === 'self' ? 'You' : (contacts.find(c => c.id === contactId)?.name || 'Person');
    // Prevent removing the current payer
    if ((transaction.billSplitPayerId || 'self') === contactId) {
      const msg = 'Cannot remove the payer. Change the payer before removing them.';
      onNotify('error', msg);
      setParticipantError(msg);
      window.setTimeout(() => setParticipantError(null), 4000);
      return;
    }

    setTransaction((prev) => {
      let parts = (prev.participants || []).slice().filter(p => p.contactId !== contactId);
      // If equal mode, recompute shares
      if (prev.billSplitMode === 'equal') {
        const total = parseInputAmount(prev.amount || '0');
        const count = parts.filter(p => p.contactId).length;
        const share = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
        parts = parts.map((p) => ({ ...p, share: String(share) }));
      }

      let payerId = prev.billSplitPayerId;
      if (payerId === contactId) {
        // reset payer to self and ensure self is a participant
        payerId = 'self';
        if (!parts.find(p => p.contactId === 'self')) {
          parts = [{ contactId: 'self', share: '' }, ...parts];
          setAutoAdded('self');
        }
      }

      // if we removed an auto-added participant, clear marker
      if (autoAddedPayerRef.current === contactId) setAutoAdded(null);

      return { ...prev, participants: parts, billSplitPayerId: payerId };
    });

    onNotify('info', `${name} removed from participants`);
  }

  // Inline popover helpers (hybrid UI)
  // ParticipantEditor handles inline edits for shares, set-as-payer and removal

  // load persisted modal prefs on mount
  useEffect(() => {
    // no persisted replace preference
  }, []);

  // compute favourites list for modal (fall back to frequentContacts if no favourites yet)
  const modalFavourites = contacts.filter((c) => favouritesMap[c.id]);
  const favouritePreview = modalFavourites.length > 0 ? modalFavourites.slice(0, 5) : frequentContacts;

  // helper: parse share value (amount or percent) to numeric absolute amount
  function parseShareValue(value: string, totalAmount: number): number {
    if (!value) return 0;
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) {
      const num = parseFloat(trimmed.slice(0, -1));
      if (!Number.isFinite(num)) return 0;
      return Math.round((totalAmount * (num / 100)) * 100) / 100;
    }
    return parseInputAmount(value);
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold m-0">Quick Add</h2>
          <p className="m-0 text-slate-500 text-sm">
            Capture new activity without leaving the dashboard.
          </p>
        </div>
        <button type="button" className={buttonClasses.secondary} onClick={handleResetAll}>
          Reset Forms
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabLabels.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setCurrentTab(tab.id);
              setBillSplitError('');
            }}
            className={`px-3.5 py-2 rounded-full text-xs border ${
              currentTab === tab.id
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabLabels.map((tab) => (
        <p
          key={`${tab.id}-helper`}
          className={`m-0 mb-4 text-sm text-slate-500 ${currentTab === tab.id ? 'block' : 'hidden'}`}
        >
          {tab.helper}
        </p>
      ))}

      {currentTab === 'transaction' && renderTransactionTab()}
      {currentTab === 'people' && renderPersonTab()}
      {currentTab === 'loans' && renderLoanTab()}
      {currentTab === 'receivables' && renderReceivableTab()}
    </div>
  );
}
