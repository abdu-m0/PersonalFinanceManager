import React from 'react';
import type { RecurringItem, Account, Category, Contact } from '../types';
import { RecurringItemsList } from './common/RecurringItemsList';

type RecurringViewProps = {
  recurringItems: RecurringItem[];
  accounts: Account[];
  categories: Category[];
  contacts: Contact[];
  defaultCurrency: string;
  onCreateRecurringItem: (item: Omit<RecurringItem, 'id'>) => Promise<void>;
  onUpdateRecurringItem: (itemId: string, updates: Partial<Omit<RecurringItem, 'id'>>) => Promise<void>;
  onDeleteRecurringItem: (itemId: string) => Promise<void>;
};

export default function RecurringView({
  recurringItems,
  accounts,
  categories,
  defaultCurrency,
  onCreateRecurringItem,
  onUpdateRecurringItem,
  onDeleteRecurringItem,
}: RecurringViewProps) {
  return (
    <RecurringItemsList
      items={recurringItems}
      accounts={accounts}
      categories={categories}
      defaultCurrency={defaultCurrency}
      onCreateRecurringItem={onCreateRecurringItem}
      onUpdateRecurringItem={onUpdateRecurringItem}
      onDeleteRecurringItem={onDeleteRecurringItem}
      pageTitle="Recurring Transactions"
      pageDescription="Manage your subscriptions and recurring payments or income."
      newButtonText="New Recurring Item"
      emptyMessage="No recurring items found. Create one to get started."
      showTypeColumn={true}
    />
  );
}