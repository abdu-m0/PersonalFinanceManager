import { prisma } from '../data/db';

export type BillSplitParticipantInput = { contactId: string; share: number; paid: number };

function computeStatus(participants: { share: number; paid: number }[]): string {
  const outstanding = participants.filter(p => round2(p.share - p.paid) > 0);
  if (outstanding.length === 0) return 'settled';
  if (outstanding.length === participants.length) return 'open';
  return 'partial';
}

export async function listBillSplits() {
  return prisma.billSplit.findMany({ include: { participants: true }, orderBy: { date: 'desc' } });
}

export async function createBillSplit(input: { description: string; date: string; currency: string; totalAmount: number; payerContactId: string; participants: BillSplitParticipantInput[] }) {
  if (!input.participants?.length) throw new Error('At least one participant required');
  const status = computeStatus(input.participants);
  // Normalize shares to cents and ensure rounding residual is applied to last participant
  const total = round2(input.totalAmount);
  const parts = input.participants.map(p => ({ ...p, share: round2(p.share), paid: round2(p.paid) }));
  const sumShares = round2(parts.reduce((s, p) => s + p.share, 0));
  const residual = round2(total - sumShares);
  if (Math.abs(residual) >= 0.01 && parts.length > 0) {
    // apply residual to last participant's share
    parts[parts.length - 1].share = round2(parts[parts.length - 1].share + residual);
  }

  // Validate: ensure payer is included among participants.
  const payerId = input.payerContactId;
  if (payerId && !parts.find(p => p.contactId === payerId)) {
    throw new Error('Payer must be included among participants');
  }

  // Ensure payer 'self' contact exists (create minimal self record if missing)
  if (input.payerContactId === 'self') {
    const existing = await prisma.contact.findUnique({ where: { id: 'self' } });
    if (!existing) {
      await prisma.contact.create({ data: { id: 'self', name: 'You', avatarColor: '#16a34a' } });
    }
  }

  // Validate participant contact ids exist to avoid FK constraint errors
  for (const p of parts) {
    if (p.contactId === 'self') continue;
    const exists = await prisma.contact.findUnique({ where: { id: p.contactId } });
    if (!exists) {
      throw new Error(`Participant contact not found: ${p.contactId}`);
    }
  }

  return prisma.billSplit.create({
    data: {
      description: input.description?.trim() || 'Bill Split',
      date: new Date(input.date || Date.now()).toISOString(),
      currency: input.currency || 'MVR',
      totalAmount: total,
      payerContactId: input.payerContactId,
      status,
      participants: {
        create: parts.map(p => ({ contactId: p.contactId, share: p.share, paid: p.paid }))
      }
    },
    include: { participants: true }
  });
}

export async function recordBillSplitPayment(input: { splitId: string; contactId: string; paid: number }) {
  const split = await prisma.billSplit.findUnique({ where: { id: input.splitId }, include: { participants: true } });
  if (!split) throw new Error('Split not found');
  const participant = split.participants.find((p: { contactId: string; id: string }) => p.contactId === input.contactId);
  if (!participant) throw new Error('Participant not in split');

  // perform update and status recompute in a transaction to avoid race conditions
  const paidValue = round2(input.paid);
  const result = await prisma.$transaction(async (tx: any) => {
    await tx.billSplitParticipant.update({ where: { id: participant.id }, data: { paid: paidValue } });
    const refreshed = await tx.billSplit.findUnique({ where: { id: input.splitId }, include: { participants: true } });
    if (!refreshed) throw new Error('Split disappeared');
    const newStatus = computeStatus((refreshed.participants as { share: number; paid: number }[]));
    return tx.billSplit.update({ where: { id: input.splitId }, data: { status: newStatus }, include: { participants: true } });
  });

  return result;
}

function round2(v: number) { return Math.round(v * 100) / 100; }
