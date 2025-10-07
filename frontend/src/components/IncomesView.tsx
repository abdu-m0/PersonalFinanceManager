import React from 'react';
import type { RecurringItem, Account, Category, Contact } from '../types';
import { RecurringItemsList } from './common/RecurringItemsList';

type IncomesViewProps = {
  recurringItems: RecurringItem[];
  accounts: Account[];
  categories: Category[];
  contacts: Contact[];
  defaultCurrency: string;
  onCreateRecurringItem: (item: Omit<RecurringItem, 'id'>) => Promise<void>;
  onUpdateRecurringItem: (itemId: string, updates: Partial<Omit<RecurringItem, 'id'>>) => Promise<void>;
  onDeleteRecurringItem: (itemId: string) => Promise<void>;
};

export default function IncomesView({
  recurringItems,
  accounts,
  categories,
  defaultCurrency,
  onCreateRecurringItem,
  onUpdateRecurringItem,
  onDeleteRecurringItem,
}: IncomesViewProps) {
  const incomeItems = recurringItems.filter(item => item.type === 'income');

  return (
    <RecurringItemsList
      items={incomeItems}
      accounts={accounts}
      categories={categories}
      defaultCurrency={defaultCurrency}
      onCreateRecurringItem={onCreateRecurringItem}
      onUpdateRecurringItem={onUpdateRecurringItem}
      onDeleteRecurringItem={onDeleteRecurringItem}
      pageTitle="Incomes"
      pageDescription="Manage your recurring income streams."
      newButtonText="New Income"
      emptyMessage="No recurring income found. Create one to get started."
      showTypeColumn={false}
      formFixedType="income"
    />
  );
}
