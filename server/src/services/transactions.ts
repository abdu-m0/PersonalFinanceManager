import { prisma } from '../data/db';

export type TransactionInput = {
  type: 'income' | 'expense' | 'transfer';
  amount: number; currency: string; date?: string; status?: string;
  accountId?: string; fromAccountId?: string; toAccountId?: string;
  description?: string; category?: string; notes?: string; metadata?: any;
};

export async function listTransactions() {
  const rows = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
  return rows.map((r: any) => ({ ...r, metadata: parseMetadata(r.metadata) }));
}

export async function createSimpleTransaction(input: TransactionInput) {
  if (!input.type) throw new Error('type required');
  if (!Number.isFinite(input.amount)) throw new Error('amount required');
  if ((input.type === 'income' || input.type === 'expense') && !input.accountId) throw new Error('accountId required');
  if (input.type === 'transfer' && (!input.fromAccountId || !input.toAccountId)) throw new Error('fromAccountId & toAccountId required');

  const data: any = {
    type: input.type,
    amount: Math.abs(round2(input.amount)),
    currency: input.currency || 'MVR',
    date: new Date(input.date || Date.now()).toISOString(),
    status: input.status || 'posted',
    description: input.description,
    category: input.category,
    notes: input.notes,
    accountId: input.accountId,
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    postedAt: input.status === 'posted' ? new Date().toISOString() : undefined
  };
  const created = await prisma.transaction.create({ data });
  // Best-effort balance adjustment (basic; real logic should unify with service layer)
  await adjustBalances(created, 'add');
  return { ...created, metadata: parseMetadata(created.metadata) };
}

export async function deleteTransaction(id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new Error('Not found');
  await adjustBalances(existing, 'remove');
  await prisma.transaction.delete({ where: { id } });
}

async function adjustBalances(tx: any, mode: 'add' | 'remove') {
  const mult = mode === 'add' ? 1 : -1;
  if (tx.type === 'income' || tx.type === 'expense') {
    if (!tx.accountId) return;
    const factor = tx.type === 'income' ? 1 : -1;
    await prisma.account.update({ where: { id: tx.accountId }, data: { balance: { increment: mult * factor * tx.amount } } });
  } else if (tx.type === 'transfer') {
    if (tx.fromAccountId) await prisma.account.update({ where: { id: tx.fromAccountId }, data: { balance: { increment: mult * -tx.amount } } });
    if (tx.toAccountId) await prisma.account.update({ where: { id: tx.toAccountId }, data: { balance: { increment: mult * tx.amount } } });
  }
}

function parseMetadata(raw: string | null) {
  if (!raw) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

function round2(v: number) { return Math.round(v * 100) / 100; }
