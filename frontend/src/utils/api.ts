import type {
  Account,
  Budget,
  Category,
  Contact,
  Loan,
  RecurringItem,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  TransactionStatus,
  TransactionType
} from '../types';

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(text || 'Network response was not ok');
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    // Fallback to raw text if response wasn't valid JSON
    return text as unknown as T;
  }
}

type MutationOptions = {
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
};

async function mutate<T>(url: string, body?: unknown, options: MutationOptions = {}): Promise<T> {
  const { method = 'POST' } = options;
  const response = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(text || 'Network response was not ok');
  }

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const apiClient = {
  mutate
};

export type CreateTransactionRequest = {
  type: TransactionType;
  date: string;
  amount: number;
  currency: string;
  status?: TransactionStatus;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  description?: string;
  category?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  billSplit?: { people: string[] };
};

export type CreateTransactionResponse = { transaction: Transaction; createdLoans?: any[] } | Transaction;

export async function createTransaction(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
  return mutate<CreateTransactionResponse>('/api/transactions', request);
}

export async function importTransactionsFromCsv(request: {
  csv: string;
  defaultAccountId?: string;
  defaultType?: TransactionType;
  delimiter?: string;
}): Promise<{ imported: Transaction[]; errors: string[] }> {
  return mutate<{ imported: Transaction[]; errors: string[] }>('/api/transactions/import/csv', request);
}

export async function importTransactionFromSms(request: {
  message: string;
  accountId: string;
  category?: string;
  notes?: string;
}): Promise<Transaction> {
  return mutate<Transaction>('/api/transactions/import/sms', request);
}

export async function createContact(request: { name: string; label?: string; phone?: string; email?: string }): Promise<Contact> {
  return mutate<Contact>('/api/contacts', request);
}

export async function updateContact(contactId: string, request: Partial<Contact>): Promise<Contact> {
  return mutate<Contact>(`/api/contacts/${contactId}`, request, { method: 'PATCH' });
}

export async function deleteContact(contactId: string): Promise<void> {
  await mutate(`/api/contacts/${contactId}`, undefined, { method: 'DELETE' });
}

export async function createLoan(request: {
  label: string;
  contactId: string;
  direction: Loan['direction'];
  horizon: Loan['horizon'];
  principal: number;
  currency: string;
  interestRate: number;
  termMonths: number;
  startDate: string;
}): Promise<Loan> {
  return mutate<Loan>('/api/loans', request);
}

export async function recordLoanPayment(loanId: string, request: { amount: number; currency: string; date: string; note?: string }): Promise<Loan> {
  return mutate<Loan>(`/api/loans/${loanId}/payments`, request);
}

export async function deleteLoan(loanId: string): Promise<void> {
  await mutate(`/api/loans/${loanId}`, undefined, { method: 'DELETE' });
}

export async function createBudget(request: Omit<Budget, 'id'>): Promise<Budget> {
  return mutate<Budget>('/api/budgets', request);
}

export async function updateBudget(budgetId: string, request: Partial<Omit<Budget, 'id'>>): Promise<Budget> {
  return mutate<Budget>(`/api/budgets/${budgetId}`, request, { method: 'PATCH' });
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await mutate(`/api/budgets/${budgetId}`, undefined, { method: 'DELETE' });
}

export async function createSavingsGoal(request: Omit<SavingsGoal, 'id' | 'contributions'> & { contributions?: SavingsContribution[] }): Promise<SavingsGoal> {
  return mutate<SavingsGoal>('/api/savings', request);
}

export async function updateSavingsGoal(goalId: string, request: Partial<Omit<SavingsGoal, 'id'>>): Promise<SavingsGoal> {
  return mutate<SavingsGoal>(`/api/savings/${goalId}`, request, { method: 'PATCH' });
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
  await mutate(`/api/savings/${goalId}`, undefined, { method: 'DELETE' });
}

export async function addSavingsContribution(goalId: string, request: Omit<SavingsContribution, 'id'>): Promise<{ contribution: SavingsContribution; goal: SavingsGoal }> {
  return mutate<{ contribution: SavingsContribution; goal: SavingsGoal }>(`/api/savings/${goalId}/contributions`, request);
}

export async function deleteSavingsContribution(goalId: string, contributionId: string): Promise<SavingsGoal> {
  return mutate<SavingsGoal>(`/api/savings/${goalId}/contributions/${contributionId}`, undefined, { method: 'DELETE' });
}

export async function createAccount(request: Omit<Account, 'id' | 'balance' | 'status'> & { balance?: number; status?: Account['status'] }): Promise<Account> {
  return mutate<Account>('/api/accounts', request);
}

export async function updateAccount(accountId: string, request: Partial<Omit<Account, 'id'>>): Promise<Account> {
  return mutate<Account>(`/api/accounts/${accountId}`, request, { method: 'PATCH' });
}

export async function deleteAccount(accountId: string): Promise<void> {
  await mutate(`/api/accounts/${accountId}`, undefined, { method: 'DELETE' });
}

export async function createCategory(request: { name: string }): Promise<Category> {
  return mutate<Category>('/api/categories', request);
}

export async function updateTransactionStatus(transactionId: string, status: 'posted' | 'pending'): Promise<Transaction> {
  const response = await fetch(`/api/transactions/${transactionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, postedAt: new Date().toISOString() }),
  });
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error || 'Failed to update transaction status');
  }
  return response.json();
}

export async function createRecurringItem(item: Omit<RecurringItem, 'id'>): Promise<RecurringItem> {
  return mutate<RecurringItem>('/api/recurring', item);
}

export async function updateRecurringItem(itemId: string, request: Partial<Omit<RecurringItem, 'id'>>): Promise<RecurringItem> {
  return mutate<RecurringItem>(`/api/recurring/${itemId}`, request, { method: 'PATCH' });
}

export async function deleteRecurringItem(itemId: string): Promise<void> {
  await mutate(`/api/recurring/${itemId}`, undefined, { method: 'DELETE' });
}
