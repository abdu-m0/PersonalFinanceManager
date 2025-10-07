import { randomUUID } from "crypto";import { PrismaClient, Prisma } from '@prisma/client'
import {
  Account,
  AccountType,
  BillSplit,
  BillSplitStatus,
  Budget,
  BudgetPeriod,
  BudgetProgress,
  BudgetVsActualPoint,
  CashflowForecast,
  CashflowForecastEntry,
  Category,
  CategorySpending,
  Contact,
  ContactSummary,
  CreditCardDetails,
  CreditCardUtilizationPoint,
  CurrencyCode,
  FinanceSettings,
  FinanceSnapshot,
  ForecastChartPoint,
  IncomeExpenseTrendPoint,
  AmortizationEntry,
  Loan,
  LoanDirection,
  LoanHorizon,
  LoanPayment,
  LoanStatus,
  NetWorthPoint,
  RecurringItem,
  RecurrenceRule,
  ReportBundle,
  SavingsContribution,
  SavingsGoal,
  Transaction,
  TransactionStatus,
  TransactionType
} from "../types";
import { parseBankSms, buildTransactionFromSms } from "../utils/sms";
import { parseTransactionCsv, toTransactionType, CsvRow } from "../utils/csv";
import { buildAmortizationSchedule } from "../utils/loans";

const prisma = new PrismaClient();

export const SELF_CONTACT_ID = "self";

// Legacy in-memory collections (kept as empty arrays for compatibility).
// These are populated in-memory in the old implementation; the app now
// primarily uses Prisma. Keeping these typed empty arrays prevents a
// large number of TypeScript errors while we progressively migrate logic
// to DB-backed implementations.
const accounts: Account[] = [];
const transactions: Transaction[] = [];
const contacts: Contact[] = [];
const loans: Loan[] = [];
const billSplits: BillSplit[] = [];
const budgets: Budget[] = [];
const savingsGoals: SavingsGoal[] = [];
const recurringItems: RecurringItem[] = [];
const categories: Category[] = [];

function safeParseJson<T = any>(value?: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return undefined;
  }
}

/**
 * Ensure a loan schedule is returned as an array of AmortizationEntry.
 * The underlying DB may store the schedule as JSON string or as an array.
 * This helper normalizes strings, single objects, and undefined to a safe array.
 */
export function normalizeSchedule(value: any): AmortizationEntry[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as AmortizationEntry[];
  if (typeof value === 'string') {
    const parsed = safeParseJson<any[]>(value);
    return Array.isArray(parsed) ? parsed as AmortizationEntry[] : [];
  }
  if (typeof value === 'object') {
    // Single entry object
    return [value as AmortizationEntry];
  }
  return [];
}

function dbTxToGqlTx(dbTx: any): Transaction {
  return {
    id: dbTx.id,
    type: dbTx.type as TransactionType,
    date: dbTx.date,
    amount: dbTx.amount,
    currency: dbTx.currency,
    status: dbTx.status as TransactionStatus,
    postedAt: dbTx.postedAt ?? undefined,
    accountId: dbTx.accountId ?? undefined,
    fromAccountId: dbTx.fromAccountId ?? undefined,
    toAccountId: dbTx.toAccountId ?? undefined,
    counterAmount: dbTx.counterAmount ?? undefined,
    counterCurrency: dbTx.counterCurrency ?? undefined,
    description: dbTx.description ?? undefined,
    merchant: dbTx.merchant ?? undefined,
    category: dbTx.category ?? undefined,
    notes: dbTx.notes ?? undefined,
    contactId: dbTx.contactId ?? undefined,
    referenceNo: dbTx.referenceNo ?? undefined,
    approvalCode: dbTx.approvalCode ?? undefined,
    dueDate: dbTx.dueDate ?? undefined,
    source: dbTx.source ?? undefined,
    metadata: typeof dbTx.metadata === 'string' ? safeParseJson<Record<string, unknown>>(dbTx.metadata) : dbTx.metadata ?? undefined
  } as Transaction;
}

export function dbLoanToGqlLoan(dbLoan: any): Loan {
  return {
    id: dbLoan.id,
    label: dbLoan.label,
    contactId: dbLoan.contactId,
    direction: dbLoan.direction as LoanDirection,
    horizon: dbLoan.horizon as LoanHorizon,
    principal: dbLoan.principal,
    currency: dbLoan.currency,
    interestRate: dbLoan.interestRate,
    termMonths: dbLoan.termMonths,
    startDate: dbLoan.startDate,
    status: dbLoan.status as LoanStatus,
    payments: (dbLoan.payments ?? []).map((p: any) => ({ id: p.id, loanId: p.loanId, date: p.date, amount: p.amount, currency: p.currency, note: p.note } as LoanPayment)),
    schedule: normalizeSchedule(dbLoan.schedule),
  } as Loan;
}

const DEFAULT_CURRENCY: CurrencyCode = "MVR";
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  MVR: 1,
  USD: 15.42,
  EUR: 16.32,
  GBP: 18.55,
  LKR: 0.049
};

export async function getSettings(): Promise<FinanceSettings | null> {
  const s = await prisma.settings.findFirst();
  if (!s) return null;
  return {
    defaultCurrency: s.defaultCurrency,
    budgetingPeriod: s.budgetingPeriod as BudgetPeriod,
    budgetingStartDay: s.budgetingStartDay,
    allowBackdatedEdits: s.allowBackdatedEdits,
    reminders: {
      creditCardDue: (s as any).reminderCreditCard ?? true,
      loanPayments: (s as any).reminderLoans ?? true,
      billSplits: (s as any).reminderBillSplits ?? true
    }
  };
}

export async function getCategories(): Promise<Category[]> {
  return prisma.category.findMany();
}

export async function createCategory(input: { name: string }): Promise<Category> {
  return ensureCategory(input.name, true);
}

export async function getAccounts(): Promise<Account[]> {
  const rows = await prisma.account.findMany();
  return rows as unknown as Account[];
}

export async function createAccount(input: {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balance?: number;
  institution?: string;
  lastFour?: string;
  color?: string;
  icon?: string;
  creditCard?: Partial<CreditCardDetails>;
}): Promise<Account> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Account name is required");
  }
  const accountType = input.type;
  const currency = input.currency.toUpperCase();
  const data: any = {
    name,
    type: accountType,
    institution: input.institution?.trim() || undefined,
    lastFour: input.lastFour?.trim() || undefined,
    currency,
    balance: round2(input.balance ?? 0),
    color: input.color,
    icon: input.icon,
    status: "active",
  };

  if (accountType === "credit-card") {
    data.statementStartDay = input.creditCard?.statementStartDay ?? 1;
    data.statementEndDay = input.creditCard?.statementEndDay ?? 30;
    data.dueDay = input.creditCard?.dueDay ?? 15;
    data.creditLimit = input.creditCard?.creditLimit ?? 5000;
    data.apr = input.creditCard?.apr ?? 24;
    data.annualFee = input.creditCard?.annualFee;
    data.gracePeriodDays = input.creditCard?.gracePeriodDays ?? 21;
    data.pendingBalance = input.creditCard?.pendingBalance ?? 0;
    data.availableCredit = input.creditCard?.availableCredit ?? input.creditCard?.creditLimit ?? 5000;
  }

  const row = await prisma.account.create({ data });
  return row as unknown as Account;
}

export async function updateAccount(accountId: string, changes: Partial<Omit<Account, "id">>): Promise<Account> {
  const account = await requireAccount(accountId);
  const data: any = {};

  if (changes.name !== undefined) {
    data.name = changes.name.trim();
  }
  if (changes.currency !== undefined) {
    data.currency = changes.currency.toUpperCase();
  }
  if (changes.balance !== undefined && Number.isFinite(changes.balance)) {
    data.balance = round2(changes.balance);
  }
  if (changes.status) {
    data.status = changes.status;
  }

  // Note: Prisma doesn't support updating nested JSON fields directly like this.
  // This part of the logic needs to be handled carefully.
  // For simplicity, we'll just update the top-level credit card fields if they exist.
  // A more robust solution might involve fetching, merging, and then updating.
  if (account.type === "credit-card" && changes.creditCard) {
    Object.assign(data, changes.creditCard);
  }

  const row = await prisma.account.update({ where: { id: accountId }, data });
  return row as unknown as Account;
}

export async function deleteAccount(accountId: string): Promise<void> {
  await requireAccount(accountId);

  // This is complex due to cascading effects. Prisma's onDelete: Cascade helps,
  // but `applyTransactionToAccounts` needs to be run.
  // A transaction is best here.
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { accountId: accountId },
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ],
    },
  });

  // This logic is tricky with a DB. Reversing transactions is an anti-pattern.
  // A better approach is to mark accounts as "deleted" or "archived".
  // For now, we will just delete. The balance impact is now harder to reverse.
  // The original logic is preserved for demonstration, but this is a good area for a redesign.
  for (let i = transactions.length - 1; i >= 0; i -= 1) {
    const tx = transactions[i];
    await applyTransactionToAccounts(dbTxToGqlTx(tx), "remove");
  }

  // Prisma's `onDelete: Cascade` in the schema will handle deleting related transactions, loans, etc.
  // We also need to handle relations that are SetNull.
  await prisma.$transaction([
    // Set related recurring items' account to null
    prisma.recurringItem.updateMany({
      where: { accountId: accountId },
      data: { accountId: null },
    }),
    // Set related savings contributions' account to null
    prisma.savingsContribution.updateMany({
      where: { accountId: accountId },
      data: { accountId: null },
    }),
    // Finally, delete the account
    prisma.account.delete({ where: { id: accountId } }),
  ]);
}

export async function getTransactions(): Promise<Transaction[]> {
  const txs = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
  return txs.map(dbTxToGqlTx);
}

export async function createTransaction(input: Omit<Transaction, "id">): Promise<Transaction> {
  validateTransactionInput(input);

  const data: any = {
    ...input,
    amount: round2(Math.abs(input.amount)),
    date: normaliseDate(input.date),
    postedAt: input.status === "posted" ? input.postedAt ?? new Date().toISOString() : undefined,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    account: input.accountId ? { connect: { id: input.accountId } } : undefined,
    fromAccount: input.fromAccountId ? { connect: { id: input.fromAccountId } } : undefined,
    toAccount: input.toAccountId ? { connect: { id: input.toAccountId } } : undefined,
    contact: input.contactId ? { connect: { id: input.contactId } } : undefined,
  };
  // Remove fields that are for relations
  delete (data as Partial<Transaction>).accountId;
  delete (data as Partial<Transaction>).fromAccountId;
  delete (data as Partial<Transaction>).toAccountId;
  delete (data as Partial<Transaction>).contactId;


  if (input.category) {
    await ensureCategory(input.category);
  }

  const createdTx = await prisma.transaction.create({ data });
  const gql = dbTxToGqlTx(createdTx);
  await applyTransactionToAccounts(gql, "add");
  return gql;
}

export async function updateTransactionStatus(id: string, status: TransactionStatus, postedAt?: string): Promise<Transaction> {
  const tx = await requireTransaction(id);
  await applyTransactionToAccounts(tx, "remove");

  const updatedTx = await prisma.transaction.update({
    where: { id },
    data: {
      status: status,
      postedAt: status === "posted" ? normaliseDate(postedAt ?? new Date().toISOString()) : undefined,
    }
  });
  const gql = dbTxToGqlTx(updatedTx);
  await applyTransactionToAccounts(gql, "add");
  return gql;
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  const tx = await requireTransaction(id);
  await applyTransactionToAccounts(tx, "remove");
  const deletedTx = await prisma.transaction.delete({ where: { id } });
  return dbTxToGqlTx(deletedTx);
}

export async function importTransactionFromSms(input: {
  message: string;
  accountId: string;
  category?: string;
  notes?: string;
}): Promise<Transaction> {
  const account = await requireAccount(input.accountId);
  const parsed = parseBankSms(input.message);

  const overrides = {
    accountId: account.id,
    category: input.category,
    notes: input.notes,
    status: account.type === "credit-card" ? "pending" : "posted"
  } as Partial<Transaction>;

  const txInput = buildTransactionFromSms(parsed, overrides);
  return await createTransaction(txInput);
}

export async function importTransactionsFromCsv(input: {
  csv: string;
  defaultAccountId?: string;
  defaultType?: TransactionType;
  delimiter?: string;
}): Promise<{ imported: Transaction[]; errors: string[] }> {
  const delimiter = input.delimiter ?? ",";
  const rows = parseTransactionCsv(input.csv, delimiter);
  const defaultAccount = input.defaultAccountId ? await resolveAccountIdentifier(input.defaultAccountId) : undefined;
  const defaultType = input.defaultType ?? "expense";

  const imported: Transaction[] = [];
  const errors: string[] = [];

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];
    try {
      const account = resolveAccountForRow(row, defaultAccount); // This needs to be async now
      if (!account) {
        throw new Error("Account not found. Provide an account column or defaultAccountId.");
      }

      const type = toTransactionType(row.type, defaultType);
      const amount = parseAmount(row.amount);
      const currency = (row.currency || account.currency).trim().toUpperCase();
      const status = normaliseStatus(row.status, account);
      const description = row.description || row.merchant || "";
      const date = row.date ? normaliseDate(row.date) : new Date().toISOString();

      const tx: Omit<Transaction, "id"> = {
        type,
        date,
        amount,
        currency,
        status,
        accountId: type !== "transfer" ? account.id : undefined,
        fromAccountId: type === "transfer" ? account.id : undefined,
        toAccountId: type === "transfer" ? resolveAccountIdentifier(row.toaccount ?? row.destination ?? "")?.id : undefined,
        counterAmount: row.counteramount ? parseAmount(row.counteramount) : undefined,
        counterCurrency: row.countercurrency?.trim().toUpperCase() || undefined,
        description,
        merchant: row.merchant || undefined,
        category: row.category || undefined,
        notes: row.notes || undefined,
        contactId: resolveContactIdentifier(row.contact)?.id,
        referenceNo: row.reference || undefined,
        approvalCode: row.approval || undefined,
        dueDate: row.due_date ? normaliseDate(row.due_date) : undefined,
        postedAt: status === "posted" ? date : undefined,
        source: "csv",
        metadata: row.metadata ? { importedMetadata: row.metadata } : undefined
      };

      if (tx.type === "transfer" && !tx.toAccountId) {
        throw new Error("Transfer rows require destination account");
      }

  const created = await createTransaction(tx);
  imported.push(created);
    } catch (error) {
      errors.push(`Row ${idx + 2}: ${(error as Error).message}`);
    }
  }

  return { imported, errors };
}

export async function getContacts(): Promise<Contact[]> {
  const rows = await prisma.contact.findMany();
  // map possible nulls to undefined to match our domain type
  return rows.map((r: any) => ({ id: r.id, name: r.name, label: r.label ?? undefined, phone: r.phone ?? undefined, email: r.email ?? undefined, avatarColor: r.avatarColor ?? undefined })) as Contact[];
}

export async function createContact(input: { name: string; label?: string; phone?: string; email?: string; avatarColor?: string }): Promise<Contact> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Contact name is required");
  }
  const existing = await prisma.contact.findFirst({ where: { name: { equals: name } } });
  if (existing) {
    return { id: existing.id, name: existing.name, label: existing.label ?? undefined, phone: existing.phone ?? undefined, email: existing.email ?? undefined, avatarColor: existing.avatarColor ?? undefined } as Contact;
  }
  const row = await prisma.contact.create({ data: {
    name,
    label: input.label?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    avatarColor: input.avatarColor || randomAvatarColor()
  }});
  return { id: row.id, name: row.name, label: row.label ?? undefined, phone: row.phone ?? undefined, email: row.email ?? undefined, avatarColor: row.avatarColor ?? undefined } as Contact;
}

export async function updateContact(contactId: string, updates: Partial<Omit<Contact, "id">>): Promise<Contact> {
  await requireContact(contactId);
  const data: any = {};
  if (updates.name) {
    data.name = updates.name.trim();
  }
  if (updates.label !== undefined) {
    data.label = updates.label?.toString().trim() || undefined;
  }
  if (updates.phone !== undefined) {
    data.phone = updates.phone.trim() || undefined;
  }
  if (updates.email !== undefined) {
    data.email = updates.email.trim() || undefined;
  }
  if (updates.avatarColor !== undefined) {
    data.avatarColor = updates.avatarColor;
  }
  const row = await prisma.contact.update({ where: { id: contactId }, data });
  return { id: row.id, name: row.name, label: row.label ?? undefined, phone: row.phone ?? undefined, email: row.email ?? undefined, avatarColor: row.avatarColor ?? undefined } as Contact;
}

export async function deleteContact(contactId: string): Promise<void> {
  if (contactId === SELF_CONTACT_ID) {
    throw new Error("Cannot delete self contact");
  }

  const index = contacts.findIndex((contact) => contact.id === contactId);
  if (index === -1) {
    throw new Error("Contact not found");
  }
  // Prisma's onDelete: Cascade will handle related loans and bill split participants.
  // Transactions with this contactId will have it set to null due to onDelete: SetNull.
  await prisma.contact.delete({ where: { id: contactId } });
}

export async function getLoans(): Promise<Loan[]> {
  const dbLoans = await prisma.loan.findMany({ include: { payments: true } });
  return dbLoans.map(dbLoanToGqlLoan);
}

export async function createLoan(input: {
  label: string;
  contactId: string;
  direction: LoanDirection;
  horizon: LoanHorizon;
  principal: number;
  currency: CurrencyCode;
  interestRate: number;
  termMonths: number;
  startDate: string;
}): Promise<Loan> {
  await requireContact(input.contactId);
  if (input.principal <= 0) {
    throw new Error("Principal must be greater than zero");
  }
  if (input.termMonths <= 0) {
    throw new Error("Term must be greater than zero");
  }
  const schedule = buildAmortizationSchedule(input.principal, input.interestRate, input.termMonths, input.startDate);
  const createdLoan = await prisma.loan.create({ data: {
    label: input.label.trim() || "Loan",
    contactId: input.contactId,
    direction: input.direction,
    horizon: input.horizon,
    principal: round2(input.principal),
    currency: input.currency,
    interestRate: input.interestRate,
    termMonths: input.termMonths,
    startDate: normaliseDate(input.startDate),
    status: "active",
    schedule: JSON.stringify(schedule),
  }});

  return dbLoanToGqlLoan({ ...createdLoan, payments: [] });
}

export async function recordLoanPayment(input: { loanId: string; date: string; amount: number; currency: CurrencyCode; note?: string }): Promise<Loan> {
  let loan = await requireLoan(input.loanId);
  await prisma.loanPayment.create({ data: {
    loanId: input.loanId,
    date: normaliseDate(input.date),
    amount: round2(input.amount),
    currency: input.currency,
    note: input.note?.trim() || undefined
  }});

  loan = await requireLoan(input.loanId); // re-fetch to get new payment
  const newStatus = updateLoanStatus(loan);
  loan.status = newStatus;

  return loan;
}

export async function deleteLoan(loanId: string): Promise<void> {
  await requireLoan(loanId);
  await prisma.loan.delete({ where: { id: loanId } });
}

export async function getBillSplits(): Promise<BillSplit[]> {
  const splits = await prisma.billSplit.findMany({ include: { participants: true } });
  return splits.map((s: any) => ({ id: s.id, description: s.description, date: s.date, currency: s.currency, totalAmount: s.totalAmount, payerContactId: s.payerContactId, participants: (s.participants ?? []).map((p: any) => ({ contactId: p.contactId, share: p.share, paid: p.paid })), status: s.status as BillSplitStatus })) as BillSplit[];
}

export async function createBillSplit(input: {
  description: string;
  date: string;
  currency: CurrencyCode;
  totalAmount: number;
  payerContactId: string;
  participants: BillSplit["participants"];
}): Promise<BillSplit> {
  if (!input.participants.length) {
    throw new Error("At least one participant is required");
  }
  input.participants.forEach((participant) => {
    if (participant.contactId !== SELF_CONTACT_ID) {
      requireContact(participant.contactId);
    }
  });
  const status = computeBillSplitStatus(input.participants);

  const created = await prisma.billSplit.create({
    data: {
      description: input.description.trim() || "Bill Split",
      date: normaliseDate(input.date),
      currency: input.currency,
      totalAmount: round2(input.totalAmount),
      payerContactId: input.payerContactId,
      status,
      participants: {
        create: input.participants.map(p => ({
          contactId: p.contactId,
          share: p.share,
          paid: round2(p.paid)
        }))
      }
    },
    include: { participants: true }
  });

  return { id: created.id, description: created.description, date: created.date, currency: created.currency, totalAmount: created.totalAmount, payerContactId: created.payerContactId, participants: created.participants.map((p: any) => ({ contactId: p.contactId, share: p.share, paid: p.paid })), status: created.status as BillSplitStatus } as BillSplit;
}

export async function recordBillSplitPayment(input: { splitId: string; contactId: string; paid: number }): Promise<BillSplit> {
  const split = await requireBillSplit(input.splitId);
  const participant = split.participants.find((p) => p.contactId === input.contactId);
  if (!participant) {
    throw new Error("Participant not found in split");
  }
  // This is a complex update. It's easier to update the participant and then the split status.
  // `participant` here is typed as the public BillSplitParticipant (no `id`).
  // Prisma returns an `id` for DB participants so cast to any to access it.
  const participantId = (participant as any).id;
  await prisma.billSplitParticipant.update({
    where: { id: participantId },
    data: { paid: round2(input.paid) }
  });

  const updatedSplit = await requireBillSplit(input.splitId);
  const newStatus = computeBillSplitStatus(updatedSplit.participants);

  const res = await prisma.billSplit.update({ where: { id: input.splitId }, data: { status: newStatus }, include: { participants: true } });
  return { id: res.id, description: res.description, date: res.date, currency: res.currency, totalAmount: res.totalAmount, payerContactId: res.payerContactId, participants: (res.participants ?? []).map((p: any) => ({ contactId: p.contactId, share: p.share, paid: p.paid })), status: res.status as BillSplitStatus } as BillSplit;
}

export function getBudgets(): Budget[] {
  return budgets.map(cloneBudget);
}

export function createBudget(input: Omit<Budget, "id">): Budget {
  const normalizedCategories = input.categories.map((category) => ({ ...category, id: category.id ?? randomUUID() }));
  normalizedCategories.forEach((category) => ensureCategory(category.category));
  const budget: Budget = { ...input, id: randomUUID(), categories: normalizedCategories };
  budgets.push(budget);
  return cloneBudget(budget);
}

export function updateBudget(budgetId: string, updates: Partial<Omit<Budget, "id">>): Budget {
  const budget = requireBudget(budgetId);

  if (updates.label !== undefined) {
    budget.label = updates.label;
  }
  if (updates.period) {
    budget.period = updates.period;
  }
  if (updates.startDate) {
    budget.startDate = normaliseDate(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    budget.endDate = updates.endDate ? normaliseDate(updates.endDate) : undefined;
  }
  if (typeof updates.carryForward === "boolean") {
    budget.carryForward = updates.carryForward;
  }
  if (typeof updates.locked === "boolean") {
    budget.locked = updates.locked;
  }
  if (updates.categories) {
    budget.categories = updates.categories.map((category) => ({ ...category, id: category.id ?? randomUUID() }));
    budget.categories.forEach((category) => ensureCategory(category.category));
  }
  return cloneBudget(budget);
}

export function deleteBudget(budgetId: string): void {
  const index = budgets.findIndex((budget) => budget.id === budgetId);
  if (index === -1) {
    throw new Error("Budget not found");
  }
  budgets.splice(index, 1);
}

export function getSavingsGoals(): SavingsGoal[] {
  return savingsGoals.map(cloneSavingsGoal);
}

export function createSavingsGoal(input: Omit<SavingsGoal, "id" | "contributions"> & { contributions?: SavingsContribution[] }): SavingsGoal {
  const goal: SavingsGoal = {
    ...input,
    id: randomUUID(),
    contributions: (input.contributions ?? []).map((contribution) => ({ ...contribution, id: contribution.id ?? randomUUID() }))
  };
  goal.currentAmount = computeSavingsProgress(goal).currentAmount;
  savingsGoals.push(goal);
  return cloneSavingsGoal(goal);
}

export function addSavingsContribution(goalId: string, contribution: Omit<SavingsContribution, "id">): SavingsGoal {
  const goal = requireSavingsGoal(goalId);
  goal.contributions.push({ ...contribution, id: randomUUID(), amount: round2(contribution.amount) });
  goal.currentAmount = computeSavingsProgress(goal).currentAmount;
  return cloneSavingsGoal(goal);
}

export function updateSavingsGoal(goalId: string, updates: Partial<Omit<SavingsGoal, "id" | "contributions">> & { contributions?: SavingsContribution[] }): SavingsGoal {
  const goal = requireSavingsGoal(goalId);
  if (updates.label !== undefined) {
    goal.label = updates.label;
  }
  if (updates.targetAmount !== undefined) {
    goal.targetAmount = round2(updates.targetAmount);
  }
  if (updates.currency) {
    goal.currency = updates.currency;
  }
  if (updates.targetDate !== undefined) {
    goal.targetDate = updates.targetDate;
  }
  if (updates.priority !== undefined) {
    goal.priority = updates.priority;
  }
  if (updates.description !== undefined) {
    goal.description = updates.description;
  }
  if (updates.autoContribution !== undefined) {
    goal.autoContribution = updates.autoContribution
      ? {
          amount: round2(updates.autoContribution.amount),
          currency: updates.autoContribution.currency,
          cadence: { ...updates.autoContribution.cadence },
          nextContributionDate: normaliseDate(updates.autoContribution.nextContributionDate)
        }
      : undefined;
  }
  if (updates.contributions) {
    goal.contributions = updates.contributions.map((contribution) => ({ ...contribution, id: contribution.id ?? randomUUID() }));
  }
  goal.currentAmount = computeSavingsProgress(goal).currentAmount;
  return cloneSavingsGoal(goal);
}

export function deleteSavingsGoal(goalId: string): void {
  const index = savingsGoals.findIndex((goal) => goal.id === goalId);
  if (index === -1) {
    throw new Error("Savings goal not found");
  }
  savingsGoals.splice(index, 1);
}

export function deleteSavingsContribution(goalId: string, contributionId: string): SavingsGoal {
  const goal = requireSavingsGoal(goalId);
  goal.contributions = goal.contributions.filter((contribution) => contribution.id !== contributionId);
  goal.currentAmount = computeSavingsProgress(goal).currentAmount;
  return cloneSavingsGoal(goal);
}

export function getRecurringItems(): RecurringItem[] {
  return recurringItems.map(cloneRecurringItem);
}

export function createRecurringItem(input: Omit<RecurringItem, "id">): RecurringItem {
  const item: RecurringItem = { ...input, id: randomUUID(), nextRunDate: normaliseDate(input.nextRunDate) };
  recurringItems.push(item);
  return cloneRecurringItem(item);
}

export async function runRecurringItem(itemId: string, runDate: string = new Date().toISOString()): Promise<Transaction | null> {
  const item = requireRecurringItem(itemId);
  if (!item.autoCreateTransaction) {
    return null;
  }
  const tx: Omit<Transaction, "id"> = {
    type: item.type === "income" ? "income" : item.type === "expense" ? "expense" : "transfer",
    amount: item.amount,
    currency: item.currency,
    status: "pending",
    date: normaliseDate(runDate),
    accountId: item.accountId,
    description: item.label,
    category: item.category,
    contactId: item.contactId,
    source: "recurring"
  };
  if (tx.category) {
    ensureCategory(tx.category);
  }
  const created = await createTransaction(tx);
  item.nextRunDate = advanceRecurrence(item.nextRunDate, item.recurrence);
  return created;
}

// getFinanceSnapshot deprecated: replaced by database-backed buildSnapshot in services/snapshot.ts
/**
 * @deprecated Use buildSnapshot() in services/snapshot.ts (DB-backed)
 */
export function getFinanceSnapshot(): never {
  throw new Error("getFinanceSnapshot is deprecated. Use buildSnapshot() from services/snapshot.");
}

export function getContactSummaries(): ContactSummary[] {
  const map = new Map<string, ContactSummary["totals"]>();
  contacts.forEach((contact) => {
    map.set(contact.id, []);
  });

  const add = (contactId: string, currency: CurrencyCode, owed: number, owe: number) => {
    if (!map.has(contactId)) {
      map.set(contactId, []);
    }
    const buckets = map.get(contactId)!;
    let bucket = buckets.find((b) => b.currency === currency);
    if (!bucket) {
      bucket = { currency, owedToYou: 0, youOwe: 0, balance: 0 };
      buckets.push(bucket);
    }
    bucket.owedToYou = round2(bucket.owedToYou + owed);
    bucket.youOwe = round2(bucket.youOwe + owe);
    bucket.balance = round2(bucket.owedToYou - bucket.youOwe);
  };

  transactions.forEach((tx) => {
    if (!tx.contactId) return;
    if (tx.type === "expense") {
      add(tx.contactId, tx.currency, tx.amount, 0);
    }
    if (tx.type === "income") {
      add(tx.contactId, tx.currency, 0, tx.amount);
    }
  });
  // Legacy in-memory store code removed here; keep this function a thin adapter
  // that returns contact summaries derived from the current transactions map.

  return Array.from(map.entries()).map(([id, totals]) => ({ contactId: id, name: contacts.find(c => c.id === id)?.name ?? "", totals }));

}

function buildCashflowForecast(horizonDays: number): CashflowForecast {
  const accountsTotal = accounts.filter((acc) => acc.status === "active").reduce((sum, account) => sum + toBaseCurrency(account.balance, account.currency), 0);
  const startingBalance = round2(accountsTotal);

  const entries: CashflowForecastEntry[] = [];
  const today = new Date();

  for (let i = 0; i < horizonDays; i += 1) {
    const date = addDays(today, i);
    const inflow = calculateForecastInflow(date);
    const outflow = calculateForecastOutflow(date);
    const net = inflow - outflow;
    const balanceProjection = round2((entries[i - 1]?.balanceProjection ?? startingBalance) + net);

    let highlight: CashflowForecastEntry["highlight"] = "ok";
    if (outflow > inflow && Math.abs(net) > inflow) {
      highlight = "warning";
    }
    if (balanceProjection < 0) {
      highlight = "due";
    }

    entries.push({
      date: date.toISOString(),
      inflow: round2(inflow),
      outflow: round2(outflow),
      net: round2(net),
      balanceProjection,
      highlight,
      notes: buildForecastNotes(date)
    });
  }

  return {
    currency: DEFAULT_CURRENCY,
    asOf: today.toISOString(),
    horizonDays,
    startingBalance,
    entries
  };
}

function buildReports(): ReportBundle {
  const last90 = addDays(new Date(), -90);
  const filtered = transactions.filter((tx) => new Date(tx.date) >= last90);

  const spendingByCategory = aggregateSpendingByCategory(filtered);
  const incomeVsExpense = aggregateIncomeExpenseTrend(filtered);
  const netWorth = buildNetWorthSeries(180);
  const creditCardUtilization = buildCreditCardUtilizationSeries();
  const budgetVsActual = buildBudgetVsActual();
  const cashflowProjection = buildCashflowProjectionSeries();

  return {
    timeframeStart: last90.toISOString(),
    timeframeEnd: new Date().toISOString(),
    spendingByCategory,
    incomeVsExpense,
    netWorth,
    creditCardUtilization,
    budgetVsActual,
    cashflowProjection
  };
}

// Minimal stub for budget progress calculation used by buildBudgetVsActual.
// The full implementation should aggregate transactions against budgets.
function calculateBudgetProgress(): Array<{ budgetId: string; category: string; limit: number; spent: number; currency: CurrencyCode }> {
  return [];
}

function aggregateSpendingByCategory(transactionsList: Transaction[]): CategorySpending[] {
  const map = new Map<string, number>();
  transactionsList
    .filter((tx) => tx.type === "expense" && tx.category)
    .forEach((tx) => {
      const key = tx.category!.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + toBaseCurrency(tx.amount, tx.currency));
    });
  return Array.from(map.entries()).map(([category, amount]) => ({ category, currency: DEFAULT_CURRENCY, amount: round2(amount) }));
}

function aggregateIncomeExpenseTrend(transactionsList: Transaction[]): IncomeExpenseTrendPoint[] {
  const buckets = new Map<string, { income: number; expense: number }>();
  transactionsList.forEach((tx) => {
    const period = tx.date.slice(0, 7);
    const bucket = buckets.get(period) ?? { income: 0, expense: 0 };
    if (tx.type === "income") {
      bucket.income += toBaseCurrency(tx.amount, tx.currency);
    } else if (tx.type === "expense") {
      bucket.expense += toBaseCurrency(tx.amount, tx.currency);
    }
    buckets.set(period, bucket);
  });
  return Array.from(buckets.entries()).sort(([a], [b]) => (a > b ? 1 : -1)).map(([period, values]) => ({
    period,
    income: round2(values.income),
    expense: round2(values.expense),
    currency: DEFAULT_CURRENCY
  }));
}

function buildNetWorthSeries(days: number): NetWorthPoint[] {
  const today = new Date();
  const series: NetWorthPoint[] = [];
  for (let i = days; i >= 0; i -= 7) {
    const date = addDays(today, -i);
    const balance = accounts.reduce((sum, account) => sum + toBaseCurrency(account.balance, account.currency), 0);
    series.push({ date: date.toISOString(), amount: round2(balance), currency: DEFAULT_CURRENCY });
  }
  return series;
}

function buildCreditCardUtilizationSeries(): CreditCardUtilizationPoint[] {
  return accounts
    .filter((account) => account.type === "credit-card" && account.creditCard)
    .map((account) => {
      const card = account.creditCard!;
      const utilization = card.creditLimit === 0 ? 0 : ((card.creditLimit - (card.availableCredit ?? 0)) / card.creditLimit) * 100;
      return {
        accountId: account.id,
        accountName: account.name,
        utilizationPercent: Math.round(utilization * 100) / 100,
        statementEndDate: buildStatementDate(card.statementEndDay).toISOString()
      };
    });
}

function buildBudgetVsActual(): BudgetVsActualPoint[] {
  const progress = calculateBudgetProgress();
  return progress.map((entry) => ({
    budgetId: entry.budgetId,
    label: budgets.find((b) => b.id === entry.budgetId)?.label ?? "Budget",
    category: entry.category,
    limit: entry.limit,
    actual: entry.spent,
    currency: entry.currency
  }));
}

function buildCashflowProjectionSeries(): ForecastChartPoint[] {
  const forecast = buildCashflowForecast(90);
  return forecast.entries.map((entry) => ({ date: entry.date, projectedNet: entry.balanceProjection, currency: forecast.currency }));
}

function calculateForecastInflow(date: Date): number {
  let total = 0;
  recurringItems
    .filter((item) => item.type === "income")
    .forEach((item) => {
      if (isSameDay(new Date(item.nextRunDate), date)) {
        total += toBaseCurrency(item.amount, item.currency);
      }
    });

  transactions
    .filter((tx) => tx.type === "income" && (tx.status === "posted" || tx.status === "pending") && isSameDay(new Date(tx.date), date))
    .forEach((tx) => {
      total += toBaseCurrency(tx.amount, tx.currency);
    });

  return total;
}

function calculateForecastOutflow(date: Date): number {
  let total = 0;
  recurringItems
    .filter((item) => item.type !== "income")
    .forEach((item) => {
      if (isSameDay(new Date(item.nextRunDate), date)) {
        total += toBaseCurrency(item.amount, item.currency);
      }
    });

  loans.forEach((loan) => {
    const schedule = normalizeSchedule(loan.schedule);
    const due = schedule.find((entry) => isSameDay(new Date(entry.dueDate), date));
    if (due) {
      total += toBaseCurrency(due.principal + due.interest, loan.currency);
    }
  });

  accounts
    .filter((account) => account.type === "credit-card" && account.creditCard)
    .forEach((account) => {
      const card = account.creditCard!;
      const dueDate = buildStatementDate(card.dueDay);
      if (isSameDay(dueDate, date)) {
        const dueAmount = Math.max(0, account.balance);
        total += toBaseCurrency(dueAmount, account.currency);
      }
    });

  transactions
    .filter((tx) => tx.type === "expense" && (tx.status === "posted" || tx.status === "pending") && isSameDay(new Date(tx.date), date))
    .forEach((tx) => {
      total += toBaseCurrency(tx.amount, tx.currency);
    });

  return total;
}

function buildForecastNotes(date: Date): string | undefined {
  const dueLoans = loans.filter((loan) => normalizeSchedule(loan.schedule).some((entry) => isSameDay(new Date(entry.dueDate), date)));
  const dueCards = accounts.filter((account) => account.type === "credit-card" && isSameDay(buildStatementDate(account.creditCard?.dueDay ?? 1), date));
  const notes = [] as string[];
  if (dueLoans.length) {
    notes.push(`${dueLoans.length} loan payment${dueLoans.length > 1 ? "s" : ""}`);
  }
  if (dueCards.length) {
    notes.push(`${dueCards.length} card due`);
  }
  return notes.length ? notes.join(", ") : undefined;
}

function computeSavingsProgress(goal: SavingsGoal): { currentAmount: number } {
  const total = goal.contributions.reduce((sum, contribution) => sum + toBaseCurrency(contribution.amount, contribution.currency), 0);
  return { currentAmount: round2(total) };
}

function calculateLoanOutstanding(loan: Loan): number {
  const scheduled = normalizeSchedule(loan.schedule).reduce((sum, entry) => sum + entry.principal + entry.interest, 0);
  const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(round2(scheduled - paid), 0);
}

function updateLoanStatus(loan: Loan): LoanStatus {
  const outstanding = calculateLoanOutstanding(loan);
  if (outstanding === 0) {
    return "paid";
  }
  const nextDue = normalizeSchedule(loan.schedule).find((entry) => entry.balance > 0);
  if (nextDue && new Date(nextDue.dueDate) < new Date()) {
    return "overdue";
  }
  return "active";
}

function applyTransactionToAccounts(tx: Transaction, action: "add" | "remove") {
  const multiplier = action === "add" ? 1 : -1;

  if (tx.type === "income" || tx.type === "expense") {
    if (!tx.accountId) {
      throw new Error("Account is required for income and expense transactions");
    }
    const account = requireAccount(tx.accountId);
    const accountAmount = convertForAccount(tx.amount, tx.currency, account.currency, tx.metadata);
    const direction = tx.type === "income" ? 1 : -1;
    account.balance = round2(account.balance + multiplier * direction * accountAmount);
    if (account.type === "credit-card") {
      const card = account.creditCard;
      if (card) {
        if (tx.type === "expense") {
          card.pendingBalance = round2((card.pendingBalance ?? 0) + multiplier * accountAmount);
          card.availableCredit = round2((card.availableCredit ?? card.creditLimit) - multiplier * accountAmount);
        }
      }
    }
  } else if (tx.type === "transfer") {
    if (!tx.fromAccountId || !tx.toAccountId) {
      throw new Error("Transfers require fromAccountId and toAccountId");
    }
    const from = requireAccount(tx.fromAccountId);
    const to = requireAccount(tx.toAccountId);

    const debitAmount = convertForAccount(tx.amount, tx.currency, from.currency, tx.metadata);
    from.balance = round2(from.balance + multiplier * -debitAmount);

    const creditAmount = tx.counterAmount ?? tx.amount;
    const creditCurrency = tx.counterCurrency ?? to.currency;
    const creditInAccountCurrency = convertCurrency(creditAmount, creditCurrency, to.currency);
    to.balance = round2(to.balance + multiplier * creditInAccountCurrency);
  }
}

function convertForAccount(amount: number, amountCurrency: CurrencyCode, accountCurrency: CurrencyCode, metadata?: Record<string, unknown>): number {
  if (amountCurrency === accountCurrency) {
    return amount;
  }
  const accountAmount = metadata && typeof metadata["accountAmount"] === "number" ? (metadata["accountAmount"] as number) : undefined;
  if (accountAmount !== undefined) {
    return accountAmount;
  }
  return convertCurrency(amount, amountCurrency, accountCurrency);
}

function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  const fromRate = EXCHANGE_RATES[from] ?? 1;
  const toRate = EXCHANGE_RATES[to] ?? 1;
  return round2((amount * fromRate) / toRate);
}

function toBaseCurrency(amount: number, currency: CurrencyCode): number {
  return convertCurrency(amount, currency, DEFAULT_CURRENCY);
}

function resolveAccountForRow(row: CsvRow, defaultAccount?: Account): Account | undefined {
  if (row.account) {
    return resolveAccountIdentifier(row.account);
  }
  return defaultAccount;
}

function resolveAccountIdentifier(value: string): Account | undefined {
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  return accounts.find((account) => account.id === value || account.name.toLowerCase() === needle);
}

function resolveContactIdentifier(value?: string): Contact | undefined {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();
  if (!needle) return undefined;
  let contact = contacts.find((c) => c.id === value || c.name.toLowerCase() === needle);
  if (!contact) {
    contact = {
      id: randomUUID(),
      name: value.trim(),
      avatarColor: randomAvatarColor()
    };
    contacts.push(contact);
  }
  return contact;
}

function requireAccount(accountId: string): Account {
  const account = accounts.find((acc) => acc.id === accountId);
  if (!account) {
    throw new Error("Account not found");
  }
  return account;
}

function requireTransaction(id: string): Transaction {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) {
    throw new Error("Transaction not found");
  }
  return tx;
}

function requireContact(contactId: string): Contact {
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) {
    throw new Error("Contact not found");
  }
  return contact;
}

function requireLoan(loanId: string): Loan {
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) {
    throw new Error("Loan not found");
  }
  return loan;
}

function requireBillSplit(splitId: string): BillSplit {
  const split = billSplits.find((s) => s.id === splitId);
  if (!split) {
    throw new Error("Bill split not found");
  }
  return split;
}

function requireBudget(budgetId: string): Budget {
  const budget = budgets.find((b) => b.id === budgetId);
  if (!budget) {
    throw new Error("Budget not found");
  }
  return budget;
}

function requireSavingsGoal(goalId: string): SavingsGoal {
  const goal = savingsGoals.find((g) => g.id === goalId);
  if (!goal) {
    throw new Error("Savings goal not found");
  }
  return goal;
}

function requireRecurringItem(id: string): RecurringItem {
  const item = recurringItems.find((r) => r.id === id);
  if (!item) {
    throw new Error("Recurring item not found");
  }
  return item;
}

function cloneAccount(account: Account): Account {
  return {
    ...account,
    creditCard: account.creditCard ? { ...account.creditCard } : undefined
  };
}

function cloneTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    metadata: cloneMetadata(tx.metadata)
  };
}

function cloneContact(contact: Contact): Contact {
  return { ...contact };
}

function cloneLoan(loan: Loan): Loan {
  return {
    ...loan,
    payments: loan.payments.map((payment) => ({ ...payment })),
    schedule: normalizeSchedule(loan.schedule).map((entry) => ({ ...entry }))
  };
}

function cloneBillSplit(split: BillSplit): BillSplit {
  return {
    ...split,
    participants: split.participants.map((participant) => ({ ...participant }))
  };
}

function cloneBudget(budget: Budget): Budget {
  return {
    ...budget,
    categories: budget.categories.map((category) => ({ ...category }))
  };
}

function cloneSavingsGoal(goal: SavingsGoal): SavingsGoal {
  return {
    ...goal,
    contributions: goal.contributions.map((contribution) => ({ ...contribution })),
    autoContribution: goal.autoContribution ? { ...goal.autoContribution, cadence: { ...goal.autoContribution.cadence } } : undefined
  };
}

function cloneRecurringItem(item: RecurringItem): RecurringItem {
  return {
    ...item,
    recurrence: { ...item.recurrence }
  };
}

function cloneMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  return metadata ? { ...metadata } : undefined;
}

function calculateBudgetEndDate(startDate: string, period: BudgetPeriod): string | undefined {
  if (period === "custom") return undefined;
  const start = new Date(startDate);
  if (period === "weekly") {
    start.setUTCDate(start.getUTCDate() + 6);
  } else if (period === "monthly") {
    start.setUTCMonth(start.getUTCMonth() + 1);
    start.setUTCDate(start.getUTCDate() - 1);
  }
  return start.toISOString();
}

function inferBudgetEndDate(startDate: string, period: BudgetPeriod): Date {
  const calculated = calculateBudgetEndDate(startDate, period);
  return calculated ? new Date(calculated) : addDays(new Date(startDate), 29);
}

function validateTransactionInput(input: Omit<Transaction, "id">): void {
  if (!input.type) throw new Error("Transaction type is required");
  if (!input.date) throw new Error("Transaction date is required");
  if (input.amount === undefined || Number.isNaN(Number(input.amount))) throw new Error("Transaction amount is required");
  if (!input.currency) throw new Error("Transaction currency is required");
  if (!input.status) throw new Error("Transaction status is required");
}

function parseAmount(raw?: string): number {
  if (!raw) throw new Error("Amount is required");
  const cleaned = raw.replace(/,/g, "");
  const value = Number(cleaned);
  if (Number.isNaN(value)) {
    throw new Error("Invalid amount");
  }
  return round2(Math.abs(value));
}

function normaliseDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function normaliseStatus(status: string | undefined, account: Account): TransactionStatus {
  if (!status) {
    return account.type === "credit-card" ? "pending" : "posted";
  }
  const normalised = status.toLowerCase();
  if (normalised === "posted" || normalised === "pending") {
    return normalised;
  }
  return account.type === "credit-card" ? "pending" : "posted";
}

function computeBillSplitStatus(participants: BillSplit["participants"]): BillSplitStatus {
  const outstanding = participants.filter((p) => round2(p.share - p.paid) > 0);
  if (outstanding.length === 0) return "settled";
  if (outstanding.length === participants.length) return "open";
  return "partial";
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function advanceRecurrence(dateIso: string, recurrence: RecurrenceRule): string {
  const date = new Date(dateIso);
  const interval = recurrence.interval ?? 1;
  switch (recurrence.cadence) {
    case "daily":
      date.setUTCDate(date.getUTCDate() + interval);
      break;
    case "weekly":
      date.setUTCDate(date.getUTCDate() + 7 * interval);
      break;
    case "biweekly":
      date.setUTCDate(date.getUTCDate() + 14 * interval);
      break;
    case "monthly":
      date.setUTCMonth(date.getUTCMonth() + interval);
      if (recurrence.dayOfMonth) {
        date.setUTCDate(recurrence.dayOfMonth);
      }
      break;
    case "quarterly":
      date.setUTCMonth(date.getUTCMonth() + 3 * interval);
      break;
    case "yearly":
      date.setUTCFullYear(date.getUTCFullYear() + interval);
      break;
    case "custom":
    default:
      date.setUTCDate(date.getUTCDate() + interval);
      break;
  }
  return date.toISOString();
}

function buildStatementDate(dayOfMonth: number): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth));
  if (date < now) {
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return date;
}

function randomAvatarColor(): string {
  const palette = ["#2563eb", "#7c3aed", "#0ea5e9", "#16a34a", "#f97316", "#dc2626"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function ensureCategory(name: string, attachToBudgets = false): Category {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Category name is required");
  }
  let category = categories.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
  if (!category) {
    category = { id: randomUUID(), name: trimmed };
    categories.push(category);
  }
  if (attachToBudgets && budgets.length > 0) {
    budgets.forEach((budget) => {
      if (!budget.categories.some((allocation) => allocation.category.toLowerCase() === trimmed.toLowerCase())) {
        budget.categories.push({ id: randomUUID(), category: trimmed, limit: 0, carryForward: false });
      }
    });
  }
  return category;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
