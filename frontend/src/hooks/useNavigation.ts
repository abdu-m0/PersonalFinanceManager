import {
  AreaChart,
  Gauge,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LucideIcon,
  PiggyBank,
  Repeat,
  Settings,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

export type View = 'dashboard' | 'accounts' | 'loans' | 'contacts' | 'budgeting' | 'savings' | 'cashflow' | 'recurring' | 'settings' | 'incomes';

export type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

export const main: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', href: '/accounts', icon: Wallet },
    { name: 'Cash Flow', href: '/cashflow', icon: TrendingUp },
    { name: 'Loans', href: '/loans', icon: Landmark },
    { name: 'Planning', href: '/planning', icon: PiggyBank },
    { name: 'Recurring', href: '/recurring-items', icon: Repeat },
  ];

export const secondary: NavigationItem[] = [
    { name: 'Contacts', href: '/contacts', icon: Users },
]

export function useNavigation() {
  return {
    main,
    secondary
  };
}
