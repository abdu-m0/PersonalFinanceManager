import { prisma } from '../data/db';

export async function getSettings() {
  return prisma.settings.findFirst();
}

export type UpdateSettingsInput = Partial<{
  defaultCurrency: string;
  budgetingPeriod: string;
  budgetingStartDay: number;
  allowBackdatedEdits: boolean;
  reminderCreditCard: boolean;
  reminderLoans: boolean;
  reminderBillSplits: boolean;
}>;

export async function updateSettings(changes: UpdateSettingsInput) {
  const existing = await prisma.settings.findFirst();
  if (!existing) {
    // Create with defaults merged with provided values
    return prisma.settings.create({
      data: {
        id: 1,
        defaultCurrency: changes.defaultCurrency || 'MVR',
        budgetingPeriod: changes.budgetingPeriod || 'monthly',
        budgetingStartDay: changes.budgetingStartDay ?? 1,
        allowBackdatedEdits: changes.allowBackdatedEdits ?? true,
        reminderCreditCard: changes.reminderCreditCard ?? true,
        reminderLoans: changes.reminderLoans ?? true,
        reminderBillSplits: changes.reminderBillSplits ?? true,
      }
    });
  }
  return prisma.settings.update({ where: { id: existing.id }, data: changes });
}
