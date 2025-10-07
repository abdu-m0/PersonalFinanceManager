import React from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Account, Transaction, FinanceSnapshot } from '../types';
import PageHeader from './common/PageHeader';
import { ReusableTable } from './common/ReusableTable';
import { formatAmount, formatDate } from '../utils/formatting';
import { ArrowLeft } from 'lucide-react';

type AccountLedgerViewProps = {
  snapshot: FinanceSnapshot;
  onPostTransaction: (transactionId: string) => Promise<void>;
};

export default function AccountLedgerView({ snapshot, onPostTransaction }: AccountLedgerViewProps) {
  const { accountId } = useParams<{ accountId: string }>();
  const account = snapshot.accounts.find(a => a.id === accountId);

  if (!account) {
    return (
      <div>
        <PageHeader title="Account Not Found" />
        <p>The requested account could not be found.</p>
        <Link to="/accounts" className="text-blue-600 hover:underline">
          Back to Accounts
        </Link>
      </div>
    );
  }

  const transactions = snapshot.transactions.filter(
    t => t.accountId === accountId || t.toAccountId === accountId || t.fromAccountId === accountId
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const columns = [
    { key: 'date', header: 'Date', render: (t: Transaction) => formatDate(t.date) },
    { key: 'description', header: 'Description' },
    { 
      key: 'amount', 
      header: 'Amount', 
      render: (t: Transaction) => {
        const isDebit = t.type === 'expense' || (t.type === 'transfer' && t.fromAccountId === accountId);
        const amount = isDebit ? -t.amount : t.amount;
        const color = isDebit ? 'text-red-600' : 'text-green-600';
        return <span className={color}>{formatAmount(amount, t.currency)}</span>;
      } 
    },
    { key: 'category', header: 'Category' },
    { 
      key: 'status', 
      header: 'Status',
      render: (t: Transaction) => {
        const statusColor = t.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>{t.status}</span>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t: Transaction) => {
        if (t.status === 'pending') {
          return (
            <button
              onClick={() => onPostTransaction(t.id)}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Post
            </button>
          );
        }
        return null;
      }
    }
  ];

  return (
    <div>
      <Link to="/accounts" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} />
        Back to Accounts
      </Link>
      <PageHeader title={account.name} description={`Ledger view for ${account.type} account`} />
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold">Current Balance: {formatAmount(account.balance, account.currency)}</h3>
      </div>

      <ReusableTable
        columns={columns}
        data={transactions}
        rowKey="id"
        emptyMessage="No transactions found for this account."
      />
    </div>
  );
}
