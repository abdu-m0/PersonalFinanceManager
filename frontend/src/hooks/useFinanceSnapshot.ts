import { useState, useCallback } from 'react';
import { Account, Budget, Contact, FinanceSnapshot, Loan, RecurringItem, SavingsGoal, Transaction } from '../types';
import { fetchJson } from '../utils/api';

export function useFinanceSnapshot() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      // Fetch all data in parallel from the new database-backed endpoints
      const [
        accounts,
        transactions,
        contacts,
        loans,
        budgets,
        savingsGoals,
        recurringItems,
        // Keep fetching the snapshot for calculated data until those are migrated
        snapshotData,
      ] = await Promise.all([
        fetchJson<Account[]>('/api/accounts'),
        fetchJson<Transaction[]>('/api/transactions'),
        fetchJson<Contact[]>('/api/contacts'),
        fetchJson<Loan[]>('/api/loans'),
        fetchJson<Budget[]>('/api/budgets'),
        fetchJson<SavingsGoal[]>('/api/savings'),
        fetchJson<RecurringItem[]>('/api/recurring'),
        fetchJson<FinanceSnapshot>('/api/snapshot'),
      ]);
      
      // Merge all data into a single snapshot object
      const mergedSnapshot: FinanceSnapshot = {
        ...snapshotData,
        accounts,
        transactions,
        contacts,
        loans,
        budgets,
        savingsGoals,
        recurringItems,
      };

      setSnapshot(mergedSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  return {
    snapshot,
    loading,
    refreshing,
    error,
    loadSnapshot
  };
}