import React from 'react';
import { formatAmount } from '../utils/formatting';
import QuickAddPanel from './QuickAddPanel';
import PageHeader from './common/PageHeader';
import type { Account, Transaction, Category, Contact, ReportBundle } from '../types';
import type { NotificationType } from '../hooks/useNotification';
import type { QuickAddState } from '../hooks/useQuickAdd';
import { buttonClasses, surfaceClasses } from '../styles/classes';

type DashboardViewProps = {
  accounts: Account[];
  recentTransactions: Transaction[];
  defaultCurrency: string;
  categories: Category[];
  contacts: Contact[];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  quickAdd: QuickAddState;
  onNotify: (type: NotificationType, message: string) => void;
  reports: ReportBundle;
};

type SparklinePoint = {
  label: string;
  value: number;
};

const chartColors = {
  income: '#16a34a',
  expense: '#dc2626',
  netWorth: '#2563eb',
  projection: '#0f172a'
} as const;

function buildSparklinePath(points: SparklinePoint[], width: number, height: number): string {
  if (points.length === 0) {
    return '';
  }
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableWidth = width - 2;
  const usableHeight = height - 2;
  return points
    .map((point, index) => {
      const x = points.length === 1 ? usableWidth / 2 : (usableWidth / (points.length - 1)) * index;
      const normalized = (point.value - min) / range;
      const y = usableHeight - normalized * usableHeight;
      return `${(x + 1).toFixed(2)},${(y + 1).toFixed(2)}`;
    })
    .join(' ');
}

function formatPeriodLabel(period: string): string {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });
  const date = new Date(`${period}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return period;
  }
  return formatter.format(date);
}

function toTitle(value: string): string {
  return value
    .split(/[_\s-]+/)
    .map((chunk) => (chunk ? `${chunk[0].toUpperCase()}${chunk.slice(1)}` : chunk))
    .join(' ');
}

export default function DashboardView({
  accounts,
  recentTransactions,
  defaultCurrency,
  categories,
  contacts,
  onRefresh,
  refreshing,
  quickAdd,
  onNotify,
  reports
}: DashboardViewProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const totalIncome90 = reports.incomeVsExpense.reduce((sum, entry) => sum + entry.income, 0);
  const totalExpense90 = reports.incomeVsExpense.reduce((sum, entry) => sum + entry.expense, 0);
  const netWorthPoints: SparklinePoint[] = reports.netWorth.map((point) => ({
    label: point.date,
    value: point.amount
  }));
  const firstNetWorthPoint = netWorthPoints[0];
  const lastNetWorthPoint = netWorthPoints[netWorthPoints.length - 1];
  const netWorthChange =
    netWorthPoints.length > 1 && lastNetWorthPoint && firstNetWorthPoint
      ? lastNetWorthPoint.value - firstNetWorthPoint.value
      : 0;
  const topCategory = reports.spendingByCategory
    .slice()
    .sort((a, b) => b.amount - a.amount)[0];
  const incomeExpenseMax = reports.incomeVsExpense.reduce((max, entry) => Math.max(max, entry.income, entry.expense), 0);
  const budgetMax = reports.budgetVsActual.reduce((max, entry) => Math.max(max, entry.limit, entry.actual), 0);
  const spendingMax = reports.spendingByCategory.reduce((max, entry) => Math.max(max, entry.amount), 0);

  return (
    <>
      <PageHeader
        title="Finance Workspace"
        description="Capture everything from one place."
        actions={
          <div className="flex items-center gap-3">
            {refreshing && <span className="pill bg-blue-50 text-blue-600">Refreshing...</span>}
            <button className={buttonClasses.secondary} onClick={() => void onRefresh()}>
              Refresh
            </button>
          </div>
        }
      />

      <section className="card">
        <QuickAddPanel
          quickAdd={quickAdd}
          accounts={accounts}
          contacts={contacts}
          categories={categories}
          defaultCurrency={defaultCurrency}
          onNotify={onNotify}
          onRefreshSnapshot={onRefresh}
        />
      </section>

      <section className="card space-y-6">
        <h2 className={surfaceClasses.sectionTitle}>Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total balance</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{formatAmount(totalBalance, defaultCurrency)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">90-day income</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{formatAmount(totalIncome90, defaultCurrency)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">90-day spending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-800">{formatAmount(totalExpense90, defaultCurrency)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net worth change</p>
            <p className={`mt-2 text-2xl font-semibold ${netWorthChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatAmount(netWorthChange, defaultCurrency)}
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-6">
        <h2 className={surfaceClasses.sectionTitle}>Trends</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-slate-800">Income vs expense</h3>
              <span className={surfaceClasses.mutedText}>Last 90 days</span>
            </div>
            {reports.incomeVsExpense.length === 0 ? (
              <p className={surfaceClasses.mutedText}>Not enough data yet.</p>
            ) : (
              <div className="flex h-48 items-end gap-3">
                {reports.incomeVsExpense.map((entry) => {
                  const incomeHeight = incomeExpenseMax === 0 ? 0 : Math.round((entry.income / incomeExpenseMax) * 100);
                  const expenseHeight = incomeExpenseMax === 0 ? 0 : Math.round((entry.expense / incomeExpenseMax) * 100);
                  return (
                      <div key={entry.period} className="flex flex-1 flex-col items-center gap-2 text-xs text-slate-600">
                      <div className="flex w-full items-end justify-center gap-1">
                        <span
                          className="w-3 rounded-t bg-emerald-500"
                          style={{ height: `${incomeHeight}%` }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-3 rounded-t bg-rose-500"
                          style={{ height: `${expenseHeight}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {formatPeriodLabel(entry.period)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500" /> Income</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-rose-500" /> Expense</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-slate-800">Net worth</h3>
              <span className={surfaceClasses.mutedText}>Past 6 months</span>
            </div>
            {netWorthPoints.length === 0 ? (
              <p className={surfaceClasses.mutedText}>No history yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <svg width="100%" height={120} viewBox="0 0 240 120" preserveAspectRatio="none" role="img" aria-label="Net worth trend">
                  <polyline
                    fill="none"
                    stroke={chartColors.netWorth}
                    strokeWidth={2}
                    points={buildSparklinePath(netWorthPoints, 240, 120)}
                  />
                </svg>
              </div>
            )}
            <p className="text-sm text-slate-600">Current: {formatAmount(lastNetWorthPoint?.value ?? 0, defaultCurrency)}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-slate-800">Cashflow projection</h3>
              <span className={surfaceClasses.mutedText}>Next 3 months</span>
            </div>
            {reports.cashflowProjection.length === 0 ? (
              <p className={surfaceClasses.mutedText}>No projection yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <svg width="100%" height={120} viewBox="0 0 240 120" preserveAspectRatio="none" role="img" aria-label="Cashflow projection">
                  <polyline
                    fill="none"
                    stroke={chartColors.projection}
                    strokeWidth={2}
                    points={buildSparklinePath(
                      reports.cashflowProjection.map((point) => ({ label: point.date, value: point.projectedNet })),
                      240,
                      120
                    )}
                  />
                </svg>
              </div>
            )}
            <p className="text-sm text-slate-600">
              Ending balance: {formatAmount(
                reports.cashflowProjection.length > 0
                  ? reports.cashflowProjection[reports.cashflowProjection.length - 1].projectedNet
                  : 0,
                defaultCurrency
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-6">
  <h2 className={surfaceClasses.sectionTitle}>Recent transactions</h2>
        {recentTransactions.length === 0 ? (
          <p className={surfaceClasses.mutedText}>No recent transactions.</p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{transaction.description || 'Uncategorized'}</p>
                  <p className="text-xs text-slate-500">{transaction.date}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    transaction.type === 'income'
                      ? 'text-emerald-600'
                      : transaction.type === 'expense'
                      ? 'text-rose-600'
                      : 'text-blue-600'
                  }`}
                >
                  {formatAmount(transaction.amount, transaction.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-6">
  <h2 className={surfaceClasses.sectionTitle}>Detailed reports</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Spending by category</h3>
            {reports.spendingByCategory.length === 0 ? (
              <p className={surfaceClasses.mutedText}>Nothing spent in the selected period.</p>
            ) : (
              <div className="space-y-3">
                {reports.spendingByCategory.slice(0, 6).map((item) => {
                  const proportion = spendingMax === 0 ? 0 : (item.amount / spendingMax) * 100;
                  return (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{toTitle(item.category)}</span>
                        <span>{formatAmount(item.amount, item.currency)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slat-200">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${proportion}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-800">Budget vs actual</h3>
            {reports.budgetVsActual.length === 0 ? (
              <p className={surfaceClasses.mutedText}>Set up budgets to see progress.</p>
            ) : (
              <div className="space-y-3">
                {reports.budgetVsActual.slice(0, 6).map((item) => {
                  const actualPercent = budgetMax === 0 ? 0 : Math.min(100, (item.actual / budgetMax) * 100);
                  const limitPercent = budgetMax === 0 ? 0 : Math.min(100, (item.limit / budgetMax) * 100);
                  return (
                    <div key={`${item.budgetId}-${item.category}`} className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{item.label} — {item.category}</p>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slat-200">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-slat-400"
                          style={{ width: `${limitPercent}%` }}
                          aria-hidden="true"
                        />
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
                          style={{ width: `${actualPercent}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slat-500">
                        <span>Spent {formatAmount(item.actual, item.currency)}</span>
                        <span>Limit {formatAmount(item.limit, item.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-800">Credit card utilization</h3>
            {reports.creditCardUtilization.length === 0 ? (
              <p className={surfaceClasses.mutedText}>Add credit cards to monitor utilization.</p>
            ) : (
              <div className="space-y-3">
                {reports.creditCardUtilization.map((card) => {
                  const utilization = Math.min(100, Math.max(0, card.utilizationPercent));
                  const statementDate = new Date(card.statementEndDate);
                  const statementLabel = Number.isNaN(statementDate.getTime())
                    ? card.statementEndDate
                    : statementDate.toLocaleDateString();
                  return (
                    <div key={card.accountId}>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{card.accountName}</span>
                        <span>{utilization.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slat-200">
                        <div
                          className={`h-full rounded-full ${utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${utilization}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Statement ends {statementLabel}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
