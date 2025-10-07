import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from './common/PageHeader';
import { buttonClasses, surfaceClasses } from '../styles/classes';
import { Modal } from './common/Modal';
import { formatAmount, formatDate } from '../utils/formatting';
import type { Account, Transaction } from '../types';
import { AccountForm, type AccountFormState } from './common/AccountForm';
import { ReusableTable } from './common/ReusableTable';

type AccountsViewProps = {
  accounts: Account[];
  transactions: Transaction[];
  defaultCurrency: string;
  onCreateAccount: (account: AccountFormState) => Promise<void>;
  onUpdateAccount: (accountId: string, updates: Partial<AccountFormState>) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onPostTransaction?: (transactionId: string) => Promise<void>;
};

export default function AccountsView({
  accounts,
  transactions,
  defaultCurrency,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onPostTransaction
}: AccountsViewProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState('');
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 50;

  const handleCreateAccount = async (accountData: AccountFormState) => {
    try {
      setStatus('Creating account...');
      await onCreateAccount(accountData);
      setStatus('');
      setShowAddAccountForm(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  const handleUpdateAccount = async (accountData: AccountFormState) => {
    if (!editingAccount) return;
    try {
      setStatus('Saving...');
      await onUpdateAccount(editingAccount.id, accountData);
      setEditingAccount(null);
      setStatus('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  // Memoize sorting and pagination to avoid heavy work on every render
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(sortedTransactions.length / transactionsPerPage)), [sortedTransactions.length]);

  const paginatedTransactions = React.useMemo(() => {
    return sortedTransactions.slice((currentPage - 1) * transactionsPerPage, currentPage * transactionsPerPage);
  }, [sortedTransactions, currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const transactionColumns = [
    { key: 'date', header: 'Date', render: (t: Transaction) => formatDate(t.date) },
    {
      key: 'account',
      header: 'Account',
      render: (t: Transaction) => {
        if (t.type === 'transfer') {
          const from = accounts.find(a => a.id === t.fromAccountId)?.name ?? 'Unknown';
          const to = accounts.find(a => a.id === t.toAccountId)?.name ?? 'Unknown';
          return `${from} → ${to}`;
        }
        return accounts.find(a => a.id === t.accountId)?.name ?? 'Unknown';
      }
    },
    { key: 'description', header: 'Description', render: (t: Transaction) => t.description || 'N/A' },
    { key: 'amount', header: 'Amount', render: (t: Transaction) => {
      const color = t.type === 'income' ? 'text-green-600' : t.type === 'expense' ? 'text-red-600' : 'text-slate-600';
      return <span className={color}>{formatAmount(t.amount, t.currency)}</span>;
    } },
    { key: 'category', header: 'Category', render: (t: Transaction) => t.category || 'Uncategorized' },
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
      render: (t: Transaction) => (
        t.status === 'pending' ? (
          <button
            className={`${buttonClasses.secondary} px-2 py-1 text-sm`}
            aria-label={`Post transaction ${t.id}`}
            onClick={async () => {
              if (!onPostTransaction) return;
              try {
                await onPostTransaction(t.id);
              } catch (e) {
                // parent will handle notifications
              }
            }}
          >
            Post
          </button>
        ) : null
      )
    }
  ];

  return (
    <>
      <PageHeader title="Accounts" description="Manage where money lives and track balances." />

      <Modal isOpen={showAddAccountForm} onClose={() => setShowAddAccountForm(false)} title="Add New Account">
        <AccountForm
          onSubmit={handleCreateAccount}
          defaultCurrency={defaultCurrency}
          status={status}
          submitText="Create account"
        />
      </Modal>

      <section className="card space-y-6">
        <div className="flex justify-between items-center">
          <h2 className={surfaceClasses.sectionTitle}>Your accounts</h2>
          <button className={buttonClasses.primary} onClick={() => { setEditingAccount(null); setShowAddAccountForm(true); }}>
            Add New Account
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className={surfaceClasses.mutedText}>No accounts yet. Create your first account above.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-slat-200 bg-white p-5 shadow-sm">
                {editingAccount?.id === account.id ? (
                  <AccountForm
                    onSubmit={handleUpdateAccount}
                    onCancel={() => setEditingAccount(null)}
                    account={account}
                    defaultCurrency={defaultCurrency}
                    status={status}
                    submitText="Save changes"
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/accounts/${account.id}`} className="text-lg font-semibold text-slat-800 hover:underline">{account.name}</Link>
                        <p className="text-xs uppercase tracking-wide text-slat-500">
                          {account.type} · {account.institution || 'No institution'} · {account.currency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={buttonClasses.secondary}
                          onClick={() => setEditingAccount(account)}
                        >
                          Edit
                        </button>
                        <button
                          className={buttonClasses.danger}
                          onClick={() => {
                            if (window.confirm('Delete this account?')) {
                              void onDeleteAccount(account.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <p className="text-3xl font-semibold text-slat-800">{formatAmount(account.balance, account.currency)}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-8">
        <h2 className={surfaceClasses.sectionTitle}>All Transactions</h2>
        <ReusableTable
          columns={transactionColumns}
          data={paginatedTransactions}
          rowKey="id"
          emptyMessage="No transactions found."
        />
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={buttonClasses.secondary}
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={buttonClasses.secondary}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </>
  );
}
