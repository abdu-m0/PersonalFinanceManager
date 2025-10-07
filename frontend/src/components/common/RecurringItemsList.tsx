import React, { useState } from 'react';
import PageHeader from './PageHeader';
import { ReusableTable } from './ReusableTable';
import { buttonClasses } from '../../styles/classes';
import { formatAmount, formatDate } from '../../utils/formatting';
import type { RecurringItem, Account, Category } from '../../types';
import { PlusCircle } from 'lucide-react';
import { RecurringItemForm } from './RecurringItemForm';

type RecurringItemsListProps = {
  items: RecurringItem[];
  accounts: Account[];
  categories: Category[];
  defaultCurrency: string;
  onCreateRecurringItem: (item: Omit<RecurringItem, 'id'>) => Promise<void>;
  onUpdateRecurringItem: (itemId: string, updates: Partial<Omit<RecurringItem, 'id'>>) => Promise<void>;
  onDeleteRecurringItem: (itemId: string) => Promise<void>;
  pageTitle: string;
  pageDescription: string;
  newButtonText: string;
  emptyMessage: string;
  showTypeColumn?: boolean;
  formFixedType?: 'income' | 'expense';
};

export function RecurringItemsList({
  items,
  accounts,
  categories,
  defaultCurrency,
  onCreateRecurringItem,
  onUpdateRecurringItem,
  onDeleteRecurringItem,
  pageTitle,
  pageDescription,
  newButtonText,
  emptyMessage,
  showTypeColumn = true,
  formFixedType,
}: RecurringItemsListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);

  const baseColumns = [
    { key: 'label', header: 'Label' },
    ...(showTypeColumn ? [{ key: 'type', header: 'Type' }] : []),
    { key: 'amount', header: 'Amount', render: (item: RecurringItem) => formatAmount(item.amount, item.currency) },
    { key: 'recurrence', header: 'Frequency', render: (item: RecurringItem) => `Every ${item.recurrence.interval || 1} ${item.recurrence.cadence.slice(0, -2)}${item.recurrence.interval && item.recurrence.interval > 1 ? 's' : ''}` },
    { key: 'nextRunDate', header: 'Next Due Date', render: (item: RecurringItem) => formatDate(item.nextRunDate) },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: RecurringItem) => (
        <div className="flex gap-2">
          <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className={buttonClasses.secondary}>Edit</button>
          <button onClick={() => onDeleteRecurringItem(item.id)} className={buttonClasses.danger}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className={buttonClasses.primary}>
            <PlusCircle size={20} />
            <span>{newButtonText}</span>
          </button>
        }
      />

      <ReusableTable
        columns={baseColumns}
        data={items}
        rowKey="id"
        emptyMessage={emptyMessage}
      />

      {isModalOpen && (
        <RecurringItemForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          accounts={accounts}
          categories={categories}
          defaultCurrency={defaultCurrency}
          onSubmit={async (formData) => {
            if (editingItem) {
              await onUpdateRecurringItem(editingItem.id, formData);
            } else {
              await onCreateRecurringItem(formData as Omit<RecurringItem, 'id'>);
            }
            setIsModalOpen(false);
          }}
          fixedType={formFixedType}
        />
      )}
    </>
  );
}
