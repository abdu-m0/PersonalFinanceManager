import React, { lazy } from 'react';

const importWithDefault = <T,>(path: string) =>
  lazy(async () => {
    const module = await import(path);
    const Component = (module.default || Object.values(module)[0]) as React.ComponentType<T>;
    return { default: Component };
  });

export const DashboardView = lazy(() => import('./DashboardView'));
export const AccountsView = lazy(() => import('./AccountsView'));
export const LoansView = lazy(() => import('./LoansView'));
export const ContactsView = lazy(() => import('./ContactsView'));
export const SettingsView = lazy(() => Promise.resolve({ default: () => null }));
export const AmortizationScheduleView = importWithDefault('./AmortizationScheduleView');
export const AccountLedgerView = lazy(() => import('./AccountLedgerView'));
export const PlanningView = lazy(() => import('./PlanningView'));
export const RecurringItemsView = lazy(() => import('./RecurringItemsView'));
export const CashflowView = lazy(() => import('./CashflowView'));
export const QuickAddPanel = lazy(() => import('./QuickAddPanel'));
export const TopNavbar = lazy(() => import('./TopNavbar'));
export const ErrorBoundary = lazy(() => import('./ErrorBoundary'));

