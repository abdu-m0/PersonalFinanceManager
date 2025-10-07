import React, { Suspense, useCallback, useEffect, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { capitalize } from "./utils/formatting";
import { useNotification } from "./hooks/useNotification";
import { useFinanceSnapshot } from "./hooks/useFinanceSnapshot";
import { useQuickAdd } from "./hooks/useQuickAdd";
import ErrorBoundary from "./components/ErrorBoundary";
const DashboardView = React.lazy(() => import('./components/DashboardView'));
const AccountsView = React.lazy(() => import('./components/AccountsView'));
const LoansView = React.lazy(() => import('./components/LoansView'));
const ContactsView = React.lazy(() => import('./components/ContactsView'));
const PlanningView = React.lazy(() => import('./components/PlanningView'));
const RecurringItemsView = React.lazy(() => import('./components/RecurringItemsView'));
const CashflowView = React.lazy(() => import('./components/CashflowView'));
const AccountLedgerView = React.lazy(() => import('./components/AccountLedgerView'));
import { layoutClasses } from "./styles/classes";
import TopNavbar from "./components/TopNavbar";
import { Modal } from './components/common/Modal';
import { EditContactForm } from './components/common/EditContactForm';
import { Account, Budget, BudgetProgress, Contact, RecurringItem, SavingsGoal } from './types';
import {
  createAccount as createAccountApi,
  updateAccount as updateAccountApi,
  createBudget as createBudgetApi,
  updateBudget as updateBudgetApi,
  deleteBudget as deleteBudgetApi,
  createSavingsGoal as createSavingsGoalApi,
  updateSavingsGoal as updateSavingsGoalApi,
  deleteSavingsGoal as deleteSavingsGoalApi,
  addSavingsContribution as addSavingsContributionApi,
  deleteSavingsContribution as deleteSavingsContributionApi,
  createContact as createContactApi,
  updateContact as updateContactApi,
  deleteContact as deleteContactApi,
  deleteAccount as deleteAccountApi,
  createLoan as createLoanApi,
  recordLoanPayment as recordLoanPaymentApi,
  deleteLoan as deleteLoanApi,
  createCategory as createCategoryApi,
  createTransaction as createTransactionApi,
  createRecurringItem as createRecurringItemApi,
  updateRecurringItem as updateRecurringItemApi,
  deleteRecurringItem as deleteRecurringItemApi,
  updateTransactionStatus,
} from "./utils/api";
import type { SavingsGoalFormState } from './components/common/SavingsGoalForm';
import type { ContributionFormState } from './components/common/ContributionForm';
import type { RecurringItemFormState } from './components/common/RecurringItemForm';

type LoanDraft = {
  amount: string;
  currency: string;
  contactId: string;
  accountId: string;
  startDate: string;
  horizon: "short-term" | "long-term";
  interestRate: string;
  termMonths: string;
  direction: "borrowed" | "lent";
  label?: string;
};

type BudgetFormState = {
  label: string;
  period: "monthly" | "weekly" | "custom";
  startDate: string;
  endDate: string;
  carryForward: boolean;
  locked: boolean;
  categories: Array<{
    id: string;
    category: string;
    limit: string;
    carryForward: boolean;
  }>;
};

export default function App(): JSX.Element {
  const { notification, showNotification } = useNotification();
  const { snapshot, loading, refreshing, error, loadSnapshot } = useFinanceSnapshot();
  const quickAdd = useQuickAdd();
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);

  const refreshSnapshot = useCallback(async () => {
    await loadSnapshot({ silent: true });
  }, [loadSnapshot]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const borrowedLoans = useMemo(
    () => (snapshot ? snapshot.loans.filter((loan) => loan.direction === 'borrowed') : []),
    [snapshot]
  );

  const lentLoans = useMemo(
    () => (snapshot ? snapshot.loans.filter((loan) => loan.direction === 'lent') : []),
    [snapshot]
  );

  const budgetProgressByBudget = useMemo(() => {
    if (!snapshot) return new Map<string, BudgetProgress[]>();

    return snapshot.budgetProgress.reduce<Map<string, BudgetProgress[]>>((acc, entry) => {
      const items = acc.get(entry.budgetId);
      if (items) {
        items.push(entry);
        return acc;
      }
      acc.set(entry.budgetId, [entry]);
      return acc;
    }, new Map());
  }, [snapshot]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm font-medium text-slate-500">Loading...</span>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm font-semibold text-red-600">{error || 'Failed to load data'}</span>
      </div>
    );
  }

  const runMutation = async <T,>(operation: () => Promise<T>, successMessage: string, failureMessage: string): Promise<T> => {
    try {
      const result = await operation();
      await refreshSnapshot();
      showNotification('success', successMessage);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : failureMessage;
      showNotification('error', message || failureMessage);
      throw err instanceof Error ? err : new Error(message || failureMessage);
    }
  };

  const createDeleteHandler = <T extends string | { id: string }>(
    deleteApiFn: (id: string) => Promise<any>,
    itemName: string,
    extractId: (item: T) => string = (item) => typeof item === 'string' ? item : item.id
  ) => async (item: T) => {
    const id = extractId(item);
    await runMutation(
      () => deleteApiFn(id),
      `${capitalize(itemName)} removed.`,
      `Unable to delete ${itemName}.`
    );
  };

  const handleDeleteLoan = createDeleteHandler(deleteLoanApi, 'loan');
  const handleDeleteBudget = createDeleteHandler(deleteBudgetApi, 'budget');
  const handleDeleteSavingsGoal = createDeleteHandler(deleteSavingsGoalApi, 'savings goal');
  const handleDeleteContribution = (goalId: string, contributionId: string) => {
    return runMutation(
      () => deleteSavingsContributionApi(goalId, contributionId),
      'Contribution removed.',
      'Unable to delete contribution.'
    );
  };
  const handleDeleteContact = createDeleteHandler(deleteContactApi, 'contact');
  const handleDeleteAccount = createDeleteHandler(deleteAccountApi, 'account');
  const handleDeleteRecurringItem = createDeleteHandler(deleteRecurringItemApi, 'recurring item');

  const handleCreateLoan = async (draft: LoanDraft) => {
    const principal = Number(draft.amount);
    if (!Number.isFinite(principal) || principal <= 0) {
      throw new Error('Amount must be greater than zero.');
    }
    if (!draft.contactId) {
      throw new Error('Select a contact before saving the loan.');
    }
    if (!draft.accountId) {
      throw new Error('Select an account for the loan.');
    }
    const termMonths = draft.horizon === 'long-term' ? Number(draft.termMonths || '0') : 1;
    if (!Number.isFinite(termMonths) || termMonths <= 0) {
      throw new Error('Provide a valid term in months.');
    }
    const interestRate = Number(draft.interestRate || '0');
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      throw new Error('Interest rate must be zero or higher.');
    }

    const contactName = snapshot.contacts.find((contact) => contact.id === draft.contactId)?.name ?? 'Contact';
    const payload = {
      label:
        draft.label?.trim() ||
        `${draft.direction === 'borrowed' ? 'Loan from ' : 'Receivable from '}${contactName}`,
      contactId: draft.contactId,
      direction: draft.direction,
      horizon: draft.horizon,
      principal,
      currency: draft.currency || snapshot.settings.defaultCurrency,
      interestRate,
      termMonths,
      startDate: draft.startDate || new Date().toISOString().slice(0, 10),
      accountId: draft.accountId
    };

    await runMutation(async () => {
      const loan = await createLoanApi(payload);
      
      await createTransactionApi({
        type: draft.direction === 'borrowed' ? 'income' : 'expense',
        amount: principal,
        currency: draft.currency || snapshot.settings.defaultCurrency,
        date: draft.startDate || new Date().toISOString().slice(0, 10),
        accountId: draft.accountId,
        description: `${draft.direction === 'borrowed' ? 'Loan from' : 'Loan to'} ${contactName}`,
        category: draft.direction === 'borrowed' ? 'Loans' : 'Receivables',
        notes: `Initial ${draft.direction === 'borrowed' ? 'loan' : 'receivable'} amount`
      });

      return loan;
    },
    draft.direction === 'borrowed' ? 'Loan recorded.' : 'Receivable recorded.',
    'Unable to save loan.'
    );
  };

  const handleRecordLoanPayment = async (
    loanId: string,
    payment: { amount: number; date: string; currency: string; accountId: string }
  ) => {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new Error('Amount must be greater than zero.');
    }
    if (!payment.accountId) {
      throw new Error('Select an account for the payment.');
    }

    const loan = snapshot.loans.find(l => l.id === loanId);
    if (!loan) {
      throw new Error('Loan not found.');
    }

    const payload = {
      amount: payment.amount,
      date: payment.date || new Date().toISOString().slice(0, 10),
      currency: payment.currency || snapshot.settings.defaultCurrency
    };

    await runMutation(async () => {
      const updatedLoan = await recordLoanPaymentApi(loanId, payload);

      const contactName = snapshot.contacts.find((contact) => contact.id === loan.contactId)?.name ?? 'Contact';
      await createTransactionApi({
        type: loan.direction === 'borrowed' ? 'expense' : 'income',
        amount: payment.amount,
        currency: payment.currency || snapshot.settings.defaultCurrency,
        date: payment.date || new Date().toISOString().slice(0, 10),
        accountId: payment.accountId,
        description: `${loan.direction === 'borrowed' ? 'Loan payment to' : 'Loan repayment from'} ${contactName}`,
        category: loan.direction === 'borrowed' ? 'Loan Payments' : 'Receivable Payments',
        notes: `Payment for ${loan.label}`
      });

      return updatedLoan;
    },
    'Payment recorded.',
    'Unable to record payment.'
    );
  };

  const handleCreateCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showNotification('error', 'Category name is required.');
      throw new Error('Category name is required.');
    }

    await runMutation(
      () => createCategoryApi({ name: trimmed }),
      'Category added.',
      'Unable to add category.'
    );
  };

  const mapBudgetCategories = (categories: BudgetFormState['categories']) => {
    return categories
      .filter((category) => category.category.trim())
      .map((category) => {
        const limit = Number(category.limit);
        if (!Number.isFinite(limit) || limit < 0) {
          throw new Error('Category limits must be zero or higher.');
        }
        return {
          id: category.id,
          category: category.category,
          limit,
          carryForward: category.carryForward
        };
      });
  };

  const handleCreateBudget = async (form: BudgetFormState) => {
    const categories = mapBudgetCategories(form.categories);
    if (!categories.length) {
      throw new Error('Add at least one category before saving the budget.');
    }

    const payload: Omit<Budget, 'id'> = {
      label: form.label.trim() || 'Budget',
      period: form.period,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate ? form.endDate : undefined,
      carryForward: form.carryForward,
      locked: form.locked,
      categories
    };

    await runMutation(
      () => createBudgetApi(payload),
      'Budget saved.',
      'Unable to save budget.'
    );
  };

  const handleUpdateBudget = async (budgetId: string, form: BudgetFormState) => {
    const categories = mapBudgetCategories(form.categories);
    if (!categories.length) {
      throw new Error('Add at least one category before saving the budget.');
    }

    const payload: Partial<Omit<Budget, 'id'>> = {
      label: form.label.trim() || 'Budget',
      period: form.period,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      endDate: form.endDate ? form.endDate : undefined,
      carryForward: form.carryForward,
      locked: form.locked,
      categories
    };

    await runMutation(
      () => updateBudgetApi(budgetId, payload),
      'Budget updated.',
      'Unable to update budget.'
    );
  };

  const handleCreateSavingsGoal = async (
    goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'contributions'>
  ) => {
    if (!goal.label.trim()) {
      throw new Error('Enter a label for the savings goal.');
    }
    if (goal.targetAmount <= 0) {
      throw new Error('Target amount must be greater than zero.');
    }

    await runMutation(
      () =>
        createSavingsGoalApi({
          ...goal,
          label: goal.label.trim(),
          currency: goal.currency || snapshot.settings.defaultCurrency,
          currentAmount: 0
        }),
      'Savings goal created.',
      'Unable to create savings goal.'
    );
  };

  // Adapter: accept form-state (strings) from SavingsGoalForm and call the typed handler
  const handleCreateSavingsGoalFromForm = async (form: SavingsGoalFormState) => {
    const payload: Omit<SavingsGoal, 'id' | 'currentAmount' | 'contributions'> = {
      label: form.label.trim() || 'Savings Goal',
      targetAmount: Number(form.targetAmount),
      currency: snapshot.settings.defaultCurrency,
      targetDate: form.targetDate || undefined,
      description: form.description || undefined,
      priority: Number(form.priority) || 0,
    };
    await handleCreateSavingsGoal(payload);
  };

  const handleUpdateSavingsGoalFromForm = async (goalId: string, form: SavingsGoalFormState) => {
    const payload: Partial<Omit<SavingsGoal, 'id'>> = {
      label: form.label?.trim(),
      targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
      targetDate: form.targetDate || undefined,
      description: form.description || undefined,
      priority: form.priority ? Number(form.priority) : undefined,
    };
    await handleUpdateSavingsGoal(goalId, payload);
  };

  const handleAddContributionFromForm = async (goalId: string, contribution: ContributionFormState) => {
    const amountNum = Number(contribution.amount);
  await handleAddContribution(goalId, { amount: amountNum, date: contribution.date, currency: snapshot.settings.defaultCurrency });
  };

  const handleDeleteContributionVoid = async (goalId: string, contributionId: string) => {
    await handleDeleteContribution(goalId, contributionId).then(() => {});
  };

  const handleUpdateSavingsGoal = async (
    goalId: string,
    goal: Partial<Omit<SavingsGoal, 'id'>>
  ) => {
    const payload: Partial<Omit<SavingsGoal, 'id'>> = {
      ...goal,
      label: goal.label !== undefined ? goal.label.trim() : goal.label,
      currency: goal.currency === '' ? undefined : goal.currency
    };

    await runMutation(
      () => updateSavingsGoalApi(goalId, payload),
      'Savings goal updated.',
      'Unable to update savings goal.'
    );
  };

  const handleAddContribution = async (
    goalId: string,
    contribution: { amount: number | string; date: string; currency: string }
  ) => {
    const amountNum = typeof contribution.amount === 'number' ? contribution.amount : Number(contribution.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new Error('Contribution amount must be greater than zero.');
    }

    await runMutation(
      () =>
        addSavingsContributionApi(goalId, {
          amount: amountNum,
          date: contribution.date || new Date().toISOString().slice(0, 10),
          currency: contribution.currency || snapshot.settings.defaultCurrency
        }).then(() => undefined),
      'Contribution recorded.',
      'Unable to record contribution.'
    );
  };

  const handleAddContact = async (contact: Omit<Contact, 'id'>) => {
    if (!contact.name.trim()) {
      throw new Error('Enter a name to add the contact.');
    }

    const payload = {
      name: contact.name.trim(),
      label: contact.label?.trim() || undefined,
      phone: contact.phone?.trim() || undefined,
      email: contact.email?.trim() || undefined
    };

    await runMutation(
      () => createContactApi(payload),
      'Contact added.',
      'Unable to add contact.'
    );
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleUpdateContact = async (updatedContact: Partial<Contact>) => {
    if (!editingContact) return;

    const payload = {
      name: updatedContact.name?.trim(),
      label: updatedContact.label?.trim() || undefined,
      phone: updatedContact.phone?.trim() || undefined,
      email: updatedContact.email?.trim() || undefined
    };

    if (!payload.name) {
      showNotification('error', 'Name is required.');
      return;
    }

    await runMutation(
      () => updateContactApi(editingContact.id, payload),
      'Contact updated.',
      'Unable to update contact.'
    );
    setEditingContact(null);
  };

  const handleCreateAccount = async (draft: { name: string; type: Account['type']; institution?: string; currency: string; balance: string }) => {
    await runMutation(
      () => createAccountApi({
        name: draft.name,
        type: draft.type,
        institution: draft.institution,
        currency: draft.currency,
        balance: Number(draft.balance) || 0,
        status: 'active'
      }),
      'Account created.',
      'Failed to create account.'
    );
  };

  const handleUpdateAccount = async (accountId: string, updates: Partial<{ name: string; type: Account['type']; institution?: string; currency: string }>) => {
    await runMutation(
      () => updateAccountApi(accountId, updates),
      'Account updated.',
      'Failed to update account.'
    );
  };

  const handleCreateRecurringItem = async (item: Omit<RecurringItem, 'id'>) => {
    await runMutation(
      () => createRecurringItemApi(item),
      'Recurring item created.',
      'Failed to create recurring item.'
    );
  };

  const handleCreateRecurringItemFromForm = async (form: RecurringItemFormState) => {
    const payload: Omit<RecurringItem, 'id'> = {
      label: form.label,
      type: form.type,
      amount: Number(form.amount),
      currency: form.currency,
      nextRunDate: form.nextRunDate,
      recurrence: form.recurrence,
      accountId: form.accountId || undefined,
      toAccountId: form.toAccountId || undefined,
      contactId: form.contactId || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      autoCreateTransaction: !!form.autoCreateTransaction,
    };
    await handleCreateRecurringItem(payload);
  };

  const handleUpdateRecurringItemFromForm = async (itemId: string, form: RecurringItemFormState) => {
    const updates: Partial<Omit<RecurringItem, 'id'>> = {
      label: form.label,
      type: form.type,
      amount: Number(form.amount),
      currency: form.currency,
      nextRunDate: form.nextRunDate,
      recurrence: form.recurrence,
      accountId: form.accountId || undefined,
      toAccountId: form.toAccountId || undefined,
      contactId: form.contactId || undefined,
      category: form.category || undefined,
      notes: form.notes || undefined,
      autoCreateTransaction: !!form.autoCreateTransaction,
    };
    await handleUpdateRecurringItem(itemId, updates);
  };

  const handleUpdateRecurringItem = async (itemId: string, updates: Partial<Omit<RecurringItem, 'id'>>) => {
    await runMutation(
      () => updateRecurringItemApi(itemId, updates),
      'Recurring item updated.',
      'Failed to update recurring item.'
    );
  };

  const handlePostTransaction = async (transactionId: string) => {
    await runMutation(
      () => updateTransactionStatus(transactionId, 'posted'),
      'Transaction posted.',
      'Failed to post transaction.'
    );
  };

  // compute notification CSS once to avoid type-narrowing issues in JSX
  const notificationClass = notification
    ? notification.type === 'success'
      ? 'w-full max-w-sm rounded-xl border-l-4 px-4 py-3 text-sm shadow-lg pointer-events-auto border-green-500 bg-green-100 text-green-800'
      : notification.type === 'error'
      ? 'w-full max-w-sm rounded-xl border-l-4 px-4 py-3 text-sm shadow-lg pointer-events-auto border-red-500 bg-red-100 text-red-800'
      : 'w-full max-w-sm rounded-xl border-l-4 px-4 py-3 text-sm shadow-lg pointer-events-auto border-blue-500 bg-blue-100 text-blue-800'
    : '';

  // NOTE: render separate notification variants with literal ARIA attributes so the linter
  // can statically verify valid values.

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <TopNavbar />
      {/* Notifications are rendered in a fixed side container so they don't shift page layout */}
      {notification && (
        <div className="fixed top-4 right-4 z-[1100] flex flex-col items-end pointer-events-none">
          {notification.type === 'error' ? (
            <div className={notificationClass} role="alert" aria-live="assertive">
              <p className="font-bold">{capitalize(notification.type)}</p>
              <p>{notification.message}</p>
            </div>
          ) : (
            <div className={notificationClass} role="status" aria-live="polite">
              <p className="font-bold">{capitalize(notification.type)}</p>
              <p>{notification.message}</p>
            </div>
          )}
        </div>
      )}
      <main>
        <div className={layoutClasses.mainContent}>
          {/* Notification container moved to fixed side position to avoid layout shifts */}

          {editingContact && (
            <Modal isOpen={!!editingContact} onClose={() => setEditingContact(null)} title="Edit Contact">
              <EditContactForm
                contact={editingContact}
                onSave={handleUpdateContact}
                onCancel={() => setEditingContact(null)}
              />
            </Modal>
          )}

          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-inner">
                  <span className="text-sm font-medium text-slate-500">Loading view...</span>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <DashboardView
                    accounts={snapshot.accounts}
                    recentTransactions={snapshot.transactions.slice(0, 10)}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    categories={snapshot.categories}
                    contacts={snapshot.contacts}
                    onRefresh={refreshSnapshot}
                    refreshing={refreshing}
                    quickAdd={quickAdd}
                    onNotify={showNotification}
                    reports={snapshot.reports}
                  />
                } />
                <Route path="/accounts" element={
                  <AccountsView
                    accounts={snapshot.accounts}
                    transactions={snapshot.transactions}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    onCreateAccount={handleCreateAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onDeleteAccount={handleDeleteAccount}
                    onPostTransaction={handlePostTransaction}
                  />
                } />
                <Route path="/accounts/:accountId" element={
                  <AccountLedgerView
                    snapshot={snapshot}
                    onPostTransaction={handlePostTransaction}
                  />
                } />
                <Route path="/loans" element={
                  <LoansView
                    payableLoans={borrowedLoans}
                    receivables={lentLoans}
                    contacts={snapshot.contacts}
                    accounts={snapshot.accounts}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    onCreateLoan={handleCreateLoan}
                    onCreatePayment={handleRecordLoanPayment}
                    onDeleteLoan={handleDeleteLoan}
                  />
                } />
                <Route path="/planning" element={
                  <PlanningView
                    budgets={snapshot.budgets}
                    budgetProgress={budgetProgressByBudget}
                    savingsGoals={snapshot.savingsGoals}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    categories={snapshot.categories}
                    onCreateCategory={handleCreateCategory}
                    onCreateBudget={handleCreateBudget}
                    onUpdateBudget={handleUpdateBudget}
                    onDeleteBudget={handleDeleteBudget}
                    onCreateSavingsGoal={handleCreateSavingsGoalFromForm}
                    onUpdateSavingsGoal={handleUpdateSavingsGoalFromForm as any}
                    onDeleteSavingsGoal={handleDeleteSavingsGoal}
                    onAddContribution={handleAddContributionFromForm}
                    onDeleteContribution={handleDeleteContributionVoid}
                  />
                } />
                <Route path="/recurring-items" element={
                  <RecurringItemsView
                    recurringItems={snapshot.recurringItems}
                    accounts={snapshot.accounts}
                    categories={snapshot.categories}
                    contacts={snapshot.contacts}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    onCreateRecurringItem={handleCreateRecurringItemFromForm}
                    onUpdateRecurringItem={handleUpdateRecurringItemFromForm}
                    onDeleteRecurringItem={handleDeleteRecurringItem}
                  />
                } />
                <Route path="/cashflow" element={
                  <CashflowView
                    transactions={snapshot.transactions}
                    accounts={snapshot.accounts}
                    recurringItems={snapshot.recurringItems}
                    loans={snapshot.loans}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    onPostTransaction={handlePostTransaction}
                  />
                } />
                <Route path="/contacts" element={
                  <ContactsView
                    contacts={snapshot.contacts}
                    onAddContact={handleAddContact}
                    onEditContact={handleEditContact}
                    onDeleteContact={handleDeleteContact}
                    payableLoans={borrowedLoans}
                    receivables={lentLoans}
                    defaultCurrency={snapshot.settings.defaultCurrency}
                    accounts={snapshot.accounts}
                    onRecordLoanPayment={handleRecordLoanPayment}
                  />
                } />
                <Route path="/settings" element={
                  <Navigate to="/dashboard" replace />
                } />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
