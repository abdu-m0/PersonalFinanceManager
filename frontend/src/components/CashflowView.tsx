import React, { useMemo, useState } from 'react';
import { Account, AmortizationEntry, Loan, RecurringItem, Transaction } from '../types';
import { formatAmount, formatDate } from '../utils/formatting';
import { FormInput, FormSelect } from './common/FormComponents';
import PageHeader from './common/PageHeader';
import { ReusableTable } from './common/ReusableTable';

type DurationOption = '7d' | '30d' | 'this-month' | 'last-month' | 'this-year' | 'custom';

const durationOptions: { value: DurationOption; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

type ProjectedEvent = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer' | 'payment';
};

type CashflowViewProps = {
  transactions: Transaction[];
  accounts: Account[];
  recurringItems: RecurringItem[];
  loans: Loan[];
  defaultCurrency: string;
  onPostTransaction?: (transactionId: string) => Promise<void>;
};

export default function CashflowView({ transactions, accounts, recurringItems, loans, defaultCurrency, onPostTransaction }: CashflowViewProps) {
  const [duration, setDuration] = useState<DurationOption>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [projectionDays, setProjectionDays] = useState(30);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (duration) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case 'this-month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this-year':
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null,
        };
      default:
        break;
    }
    return { start, end };
  }, [duration, customStartDate, customEndDate]);

  const projectedEvents = useMemo(() => {
    const events: ProjectedEvent[] = [];
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + projectionDays);

    // Expand recurring items
    for (const item of recurringItems) {
      if (!item.nextRunDate) continue;
      let nextDate = new Date(item.nextRunDate);
      const interval = item.recurrence?.interval && item.recurrence.interval > 0 ? item.recurrence.interval : 1;
      while (nextDate <= endDate) {
        if (nextDate >= now) {
          events.push({
            id: `${item.id}-${nextDate.toISOString().split('T')[0]}`,
            date: nextDate.toISOString().split('T')[0],
            description: item.label,
            amount: item.type === 'income' ? item.amount : -item.amount,
            type: item.type === 'payment' ? 'payment' : item.type,
          });
        }

        const cadence = item.recurrence?.cadence || 'monthly';
        switch (cadence) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7 * interval);
            break;
          case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14 * interval);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3 * interval);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + interval);
            break;
          default:
            nextDate.setMonth(nextDate.getMonth() + interval);
        }
      }
    }

    // Loan schedule entries (defensive: schedule may be an array, a JSON string, or malformed)
    for (const loan of loans) {
      if (!loan.schedule) continue;
      let scheduleArray: AmortizationEntry[] = [];
      if (Array.isArray(loan.schedule)) {
        scheduleArray = loan.schedule;
      } else if (typeof loan.schedule === 'string') {
        try {
          const parsed = JSON.parse(loan.schedule);
          if (Array.isArray(parsed)) scheduleArray = parsed;
        } catch (e) {
          // ignore parse errors and skip this loan's schedule
          scheduleArray = [];
        }
      } else if (typeof loan.schedule === 'object' && loan.schedule !== null) {
        // single entry object -> normalize to array
        scheduleArray = [loan.schedule as AmortizationEntry];
      }

      if (!scheduleArray.length) continue;

      scheduleArray.forEach((entry: AmortizationEntry, index: number) => {
        const dueDate = new Date(entry.dueDate);
        if (dueDate >= now && dueDate <= endDate) {
          events.push({
            id: `${loan.id}-payment-${index}`,
            date: entry.dueDate,
            description: `Loan Payment: ${loan.label}`,
            amount: -(entry.principal + entry.interest),
            type: 'payment',
          });
        }
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [recurringItems, loans, projectionDays]);

  const filteredTransactions = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= dateRange.start! && tDate <= dateRange.end!;
    });
  }, [transactions, dateRange]);

  const { income, expenses, net } = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else if (t.type === 'expense') acc.expenses += t.amount;
        acc.net = acc.income - acc.expenses;
        return acc;
      },
      { income: 0, expenses: 0, net: 0 }
    );
  }, [filteredTransactions]);

  const data = filteredTransactions.map(t => ({
      ...t,
      account: accounts.find(a => a.id === t.accountId)?.name || 'N/A'
  }));

  return (
    <>
      <PageHeader title="Cash Flow" description="Analyze your income and expenses over time." />

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold">Summary</h2>
            <div className="flex items-center gap-2">
                <FormSelect
                    label=""
                    value={duration}
                    onChange={(value) => setDuration(value as DurationOption)}
                    options={durationOptions}
                />
                {duration === 'custom' && (
                    <>
                        <FormInput label="Start Date" type="date" value={customStartDate} onChange={setCustomStartDate} />
                        <FormInput label="End Date" type="date" value={customEndDate} onChange={setCustomEndDate} />
                    </>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-green-100 p-4 rounded-lg">
                <div className="text-sm text-green-700">Total Income</div>
                <div className="text-2xl font-bold text-green-900">{formatAmount(income, defaultCurrency)}</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg">
                <div className="text-sm text-red-700">Total Expenses</div>
                <div className="text-2xl font-bold text-red-900">{formatAmount(expenses, defaultCurrency)}</div>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg">
                <div className="text-sm text-blue-700">Net Cash Flow</div>
                <div className="text-2xl font-bold text-blue-900">{formatAmount(net, defaultCurrency)}</div>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold">Future Projections</h2>
            <div className="flex items-center gap-2">
                <FormInput label="Days to project" type="number" value={projectionDays.toString()} onChange={(val) => setProjectionDays(Number(val))} />
            </div>
        </div>
    <ReusableTable<ProjectedEvent>
      columns={[
        { key: 'date', header: 'Date', render: (r: ProjectedEvent) => formatDate(r.date) },
        { key: 'description', header: 'Description' },
        { key: 'amount', header: 'Amount', align: 'right' as const, render: (t: ProjectedEvent) => formatAmount(t.amount, defaultCurrency) },
      ]}
      data={projectedEvents}
      rowKey={(row: ProjectedEvent) => row.id}
      emptyMessage="No projected events in this period."
    />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Transactions</h2>
          <ReusableTable<Transaction & { account: string }>
              columns={[
                  { key: 'date', header: 'Date', render: (t: Transaction) => formatDate(t.date) },
                  { key: 'description', header: 'Description' },
                  { key: 'account', header: 'Account' },
                  { key: 'amount', header: 'Amount', align: 'right' as const, render: (t: Transaction) => formatAmount(t.amount, t.currency) },
                  { key: 'actions', header: 'Actions', render: (t: Transaction) => (
                    t.status === 'pending' ? (
                      <button
                        className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                        onClick={async () => {
                          if (!onPostTransaction) return;
                          try {
                            await onPostTransaction(t.id);
                          } catch (e) {
                            // swallow - parent will notify
                          }
                        }}
                      >
                        Post
                      </button>
                    ) : null
                  ) }
              ]}
              data={data}
              rowKey={(row: Transaction & { account: string }) => row.id}
              emptyMessage="No transactions in this period."
          />
      </div>
    </>
  );
}
