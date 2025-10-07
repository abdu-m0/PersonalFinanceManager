import { Router } from "express";
import SavingsGoalRepository from "../data/repositories/SavingsGoalRepository";
// Prisma model types not imported individually due to custom generated client typing limitations.

export const savingsRouter = Router();
const savingsGoalRepository = new SavingsGoalRepository();

savingsRouter.get("/", async (_req, res) => {
  try {
    const goals = await savingsGoalRepository.findAll();
    res.json(goals);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch savings goals";
    res.status(500).json({ error: message });
  }
});

// Helper to coerce and validate numeric / optional fields
function parseNumber(value: any, field: string, required = false): number | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${field} is required`);
    return undefined;
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${field} must be a valid number`);
  }
  return num;
}

function normalizeIsoDate(value: any): string | undefined {
  if (!value || typeof value !== 'string' || value.trim() === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function round2(v: number) { return Math.round(v * 100) / 100; }

// Using loose typing because generated Prisma client for this project does not expose *CreateInput types by name.
function buildCreateInput(body: any): any {
  const targetAmount = parseNumber(body.targetAmount, 'targetAmount', true)!;
  const priority = parseNumber(body.priority, 'priority', false);
  const contributionsRaw: any[] = Array.isArray(body.contributions) ? body.contributions : [];
  const contributions = contributionsRaw
    .filter(c => c && c.amount !== undefined)
    .map(c => ({
      date: normalizeIsoDate(c.date) || new Date().toISOString(),
      amount: round2(parseNumber(c.amount, 'contribution.amount', true)!),
      currency: (c.currency || body.currency || 'MVR').toString().trim().toUpperCase(),
      accountId: c.accountId || undefined
    }));
  const currentAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
  return {
    label: (body.label || 'Savings Goal').toString().trim(),
    targetAmount: round2(targetAmount),
    currentAmount: round2(currentAmount || 0),
    currency: (body.currency || 'MVR').toString().trim().toUpperCase(),
    targetDate: normalizeIsoDate(body.targetDate),
    description: body.description?.toString().trim() || undefined,
    priority: priority !== undefined ? Math.trunc(priority) : undefined,
    contributions: contributions.length ? { create: contributions } : undefined,
    // Auto contribution mapping (optional)
    autoAmount: parseNumber(body.autoAmount, 'autoAmount', false),
    autoCurrency: body.autoCurrency ? body.autoCurrency.toString().trim().toUpperCase() : undefined,
    autoCadence: body.autoCadence || undefined,
    autoInterval: parseNumber(body.autoInterval, 'autoInterval', false),
    autoDayOfMonth: parseNumber(body.autoDayOfMonth, 'autoDayOfMonth', false),
    nextContributionDate: normalizeIsoDate(body.nextContributionDate)
  };
}

function buildUpdateInput(body: any): any {
  const data: any = {};
  if (body.label !== undefined) data.label = body.label.toString().trim();
  if (body.targetAmount !== undefined) data.targetAmount = round2(parseNumber(body.targetAmount, 'targetAmount', true)!);
  if (body.currency !== undefined) data.currency = body.currency.toString().trim().toUpperCase();
  if (body.targetDate !== undefined) data.targetDate = normalizeIsoDate(body.targetDate);
  if (body.description !== undefined) data.description = body.description?.toString().trim() || undefined;
  if (body.priority !== undefined) data.priority = Math.trunc(parseNumber(body.priority, 'priority', true)!);
  // Auto contribution fields
  if (body.autoAmount !== undefined) data.autoAmount = parseNumber(body.autoAmount, 'autoAmount', false);
  if (body.autoCurrency !== undefined) data.autoCurrency = body.autoCurrency?.toString().trim().toUpperCase();
  if (body.autoCadence !== undefined) data.autoCadence = body.autoCadence || undefined;
  if (body.autoInterval !== undefined) data.autoInterval = parseNumber(body.autoInterval, 'autoInterval', false);
  if (body.autoDayOfMonth !== undefined) data.autoDayOfMonth = parseNumber(body.autoDayOfMonth, 'autoDayOfMonth', false);
  if (body.nextContributionDate !== undefined) data.nextContributionDate = normalizeIsoDate(body.nextContributionDate);
  return data;
}

savingsRouter.post("/", async (req, res) => {
  try {
    const data = buildCreateInput(req.body);
    const goal = await savingsGoalRepository.create(data);
    res.status(201).json(goal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create savings goal";
    res.status(400).json({ error: message });
  }
});
import { prisma } from "../data/db";

savingsRouter.post("/:id/contributions", async (req, res) => {
  try {
    const goal = await savingsGoalRepository.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    const contribution = req.body as { date?: string; amount: number | string; currency?: string; accountId?: string };
    const amountNum = parseNumber(contribution.amount, 'amount', true)!;
    const created = await prisma.savingsContribution.create({
      data: {
        goalId: goal.id,
        date: normalizeIsoDate(contribution.date) || new Date().toISOString(),
        amount: round2(Math.abs(amountNum)),
        currency: (contribution.currency || goal.currency).toString().trim().toUpperCase(),
        accountId: contribution.accountId || undefined
      }
    });
    // Update aggregate currentAmount (re-compute by summing contributions)
    const totals = await prisma.savingsContribution.aggregate({
      where: { goalId: goal.id },
      _sum: { amount: true }
    });
    await prisma.savingsGoal.update({ where: { id: goal.id }, data: { currentAmount: round2(totals._sum.amount || 0) } });
    const refreshed = await savingsGoalRepository.findById(goal.id);
    res.status(201).json({ contribution: created, goal: refreshed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record contribution";
    res.status(400).json({ error: message });
  }
});

savingsRouter.patch(":id", async (req, res) => {
  try {
    const data = buildUpdateInput(req.body);
    const goal = await savingsGoalRepository.update(req.params.id, data);
    res.json(goal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update savings goal";
    res.status(400).json({ error: message });
  }
});

savingsRouter.delete("/:id", async (req, res) => {
  try {
    await savingsGoalRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete savings goal";
    res.status(400).json({ error: message });
  }
});

savingsRouter.delete("/:id/contributions/:contributionId", async (req, res) => {
  try {
    const goal = await savingsGoalRepository.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    // Delete the contribution directly and recompute the aggregate currentAmount
    await prisma.savingsContribution.delete({ where: { id: req.params.contributionId } });
    const totals = await prisma.savingsContribution.aggregate({
      where: { goalId: goal.id },
      _sum: { amount: true }
    });
    const currentAmount = round2(totals._sum.amount || 0);
    await prisma.savingsGoal.update({ where: { id: goal.id }, data: { currentAmount } });
    const refreshed = await savingsGoalRepository.findById(goal.id);
    res.json(refreshed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete contribution";
    res.status(400).json({ error: message });
  }
});
