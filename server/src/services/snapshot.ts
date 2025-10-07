import { prisma } from "../data/db";
import { getReportSummary } from "./analytics";

// Minimal snapshot builder to replace legacy in-memory getFinanceSnapshot with DB-backed data.
// Keeps field names so frontend hook continues to work. Derived analytics kept empty arrays/placeholders for now.
export async function buildSnapshot() {
  const [accounts, transactions, contacts, loans, budgets, savingsGoals, recurringItems, categories, billSplits] = await Promise.all([
    prisma.account.findMany(),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 200 }),
    prisma.contact.findMany(),
    prisma.loan.findMany({ include: { payments: true, contact: true } }),
    prisma.budget.findMany({ include: { categories: true } }),
    prisma.savingsGoal.findMany({ include: { contributions: true } }),
    prisma.recurringItem.findMany(),
    prisma.category.findMany(),
    prisma.billSplit.findMany({ include: { participants: true } })
  ]);

  return {
    accounts,
    transactions,
    contacts,
    loans,
  billSplits,
    budgets,
    budgetProgress: [], // Placeholder until computed
    savingsGoals,
    recurringItems,
  cashflowForecast: null,
  reports: await getReportSummary(),
  contactSummaries: computeContactSummaries(contacts, transactions, loans, billSplits),
    settings: await loadSettings(),
    categories
  };
}

async function loadSettings() {
  // If no settings row, return sensible defaults.
  const settings = await prisma.settings.findFirst();
  return settings ?? {
    defaultCurrency: "MVR",
    budgetingPeriod: "monthly",
    budgetingStartDay: 1,
    allowBackdatedEdits: false,
    reminderCreditCard: true,
    reminderLoans: true,
    reminderBillSplits: true
  };
}

function computeContactSummaries(contacts: any[], transactions: any[], loans: any[], billSplits: any[]) {
  const map = new Map<string, { currency: string; owedToYou: number; youOwe: number; balance: number }[]>();

  const add = (contactId: string, currency: string, owedToYou: number, youOwe: number) => {
    if (!map.has(contactId)) map.set(contactId, []);
    const buckets = map.get(contactId)!;
    let bucket = buckets.find(b => b.currency === currency);
    if (!bucket) {
      bucket = { currency, owedToYou: 0, youOwe: 0, balance: 0 };
      buckets.push(bucket);
    }
    bucket.owedToYou = Math.round((bucket.owedToYou + owedToYou) * 100) / 100;
    bucket.youOwe = Math.round((bucket.youOwe + youOwe) * 100) / 100;
    bucket.balance = Math.round((bucket.owedToYou - bucket.youOwe) * 100) / 100;
  };

  // Transactions with contactId: income/expense
  transactions.forEach((tx) => {
    if (!tx.contactId) return;
    if (tx.type === 'expense') {
      add(tx.contactId, tx.currency, tx.amount, 0);
    } else if (tx.type === 'income') {
      add(tx.contactId, tx.currency, 0, tx.amount);
    }
  });

  // Bill splits: for each split, participants indicate share and paid
  billSplits.forEach((split: any) => {
    const currency = split.currency || 'MVR';
    split.participants.forEach((p: any) => {
      const owed = Math.round((p.share - (p.paid || 0)) * 100) / 100;
      if (owed > 0) {
        // participant owes the payer
        add(p.contactId, currency, 0, owed);
      } else if (owed < 0) {
        // participant overpaid (unlikely), treat as owedToYou
        add(p.contactId, currency, Math.abs(owed), 0);
      }
    });
  });

  // Map to ContactSummary shape
  return contacts.map((c) => ({ contactId: c.id, name: c.name, totals: map.get(c.id) ?? [] }));
}
