import React from 'react';
import type { RecurringItem, Account } from '../../types';
import { formatAmount, formatDate, capitalize } from '../../utils/formatting';
import { buttonClasses } from '../../styles/classes';

type RecurringItemCardProps = {
  item: RecurringItem;
  account?: Account;
  onEdit: (item: RecurringItem) => void;
  onDelete: (itemId: string) => void;
};

export default function RecurringItemCard({ item, account, onEdit, onDelete }: RecurringItemCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-slate-800">{item.label}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            item.type === 'income' ? 'bg-green-100 text-green-800' :
            item.type === 'expense' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {capitalize(item.type)}
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-2">
          {formatAmount(item.amount, item.currency)}
        </p>
        <div className="text-sm text-slate-500 mt-2 space-y-1">
          <p><strong>Next Run:</strong> {formatDate(item.nextRunDate)}</p>
          <p><strong>Frequency:</strong> {capitalize(item.recurrence.cadence)}</p>
          {account && <p><strong>Account:</strong> {account.name}</p>}
          {item.category && <p><strong>Category:</strong> {item.category}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={() => onEdit(item)} className={buttonClasses.secondary}>Edit</button>
        <button onClick={() => onDelete(item.id)} className={buttonClasses.danger}>Delete</button>
      </div>
    </div>
  );
}
