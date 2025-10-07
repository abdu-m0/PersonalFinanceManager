export type CurrencyCode = string;

export type CurrencyAmount = {
  amount: number;
  currency: CurrencyCode;
};

export type Category = {
  id: string;
  name: string;
};

export type AccountType = "cash" | "bank" | "mobile-wallet" | "credit-card";
export type AccountStatus = "active" | "closed";

export type CreditCardDetails = {
  statementStartDay: number;
  statementEndDay: number;
  dueDay: number;
  creditLimit: number;
  apr: number;
  annualFee?: number;
  gracePeriodDays?: number;
  pendingBalance?: number;
  availableCredit?: number;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  lastFour?: string;
  currency: CurrencyCode;
  balance: number;
  color?: string;
  icon?: string;
  status: AccountStatus;
  creditCard?: CreditCardDetails;
};

export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "posted" | "pending";
export type TransactionSource = "manual" | "sms" | "csv" | "recurring" | "import";

export type RecurrenceRule = {
  cadence: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";
  interval?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  customCron?: string;
};

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  counterAmount?: number;
  counterCurrency?: CurrencyCode;
  description?: string;
  merchant?: string;
  category?: string;
  notes?: string;
  contactId?: string;
  referenceNo?: string;
  approvalCode?: string;
  dueDate?: string;
  postedAt?: string;
  pendingReason?: string;
  source?: TransactionSource;
  recurrenceRule?: RecurrenceRule;
  metadata: { [key: string]: string | number | boolean | null } | null;
};

export type Contact = {
  id: string;
  name: string;
  label?: string;
  email?: string;
  phone?: string;
};

export type LoanHorizon = "short-term" | "long-term";
export type LoanDirection = "borrowed" | "lent";
export type LoanStatus = "active" | "paid" | "overdue";

export type LoanPayment = {
  id: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  note?: string;
};

export type AmortizationEntry = {
  period: number;
  dueDate: string;
  interest: number;
  principal: number;
  balance: number;
};

export type Loan = {
  id: string;
  label: string;
  contactId: string;
  direction: LoanDirection;
  horizon: LoanHorizon;
  principal: number;
  currency: CurrencyCode;
  interestRate: number;
  termMonths: number;
  startDate: string;
  status: LoanStatus;
  payments: LoanPayment[];
  schedule: AmortizationEntry[];
};

export type BillSplitParticipant = {
  contactId: string;
  share: number;
  paid: number;
};

export type BillSplitStatus = "open" | "settled" | "partial";

export type BillSplit = {
  id: string;
  description: string;
  date: string;
  currency: CurrencyCode;
  totalAmount: number;
  payerContactId: string;
  participants: BillSplitParticipant[];
  status: BillSplitStatus;
};

export type ContactSummary = {
  contactId: string;
  name: string;
  totals: Array<{
    currency: CurrencyCode;
    owedToYou: number;
    youOwe: number;
    balance: number;
  }>;
};

export type BudgetPeriod = "monthly" | "weekly" | "custom";

export type BudgetCategoryAllocation = {
  id: string;
  category: string;
  limit: number;
  carryForward: boolean;
};

export type Budget = {
  id: string;
  label: string;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  locked: boolean;
  carryForward: boolean;
  categories: BudgetCategoryAllocation[];
};

export type BudgetProgress = {
  budgetId: string;
  category: string;
  currency: CurrencyCode;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
};

export type SavingsContribution = {
  id: string;
  date: string;
  amount: number;
  currency: CurrencyCode;
  accountId?: string;
  notes?: string;
};

export type AutoContributionPlan = {
  amount: number;
  currency: CurrencyCode;
  cadence: RecurrenceRule;
  nextContributionDate: string;
};

export type SavingsGoal = {
  id: string;
  label: string;
  targetAmount: number;
  currency: CurrencyCode;
  targetDate?: string;
  currentAmount: number;
  priority: number;
  description?: string;
  contributions: SavingsContribution[];
  autoContribution?: AutoContributionPlan;
};

export type RecurringItemType = "income" | "expense" | "transfer" | "payment";

export type RecurringItem = {
  id: string;
  label: string;
  type: RecurringItemType;
  amount: number;
  currency: CurrencyCode;
  nextRunDate: string;
  recurrence: RecurrenceRule;
  accountId?: string;
  toAccountId?: string;
  contactId?: string;
  category?: string;
  notes?: string;
  autoCreateTransaction: boolean;
};

export type CashflowForecastEntry = {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  balanceProjection: number;
  highlight?: "due" | "warning" | "ok";
  notes: string | null;
};

export type CashflowForecast = {
  currency: CurrencyCode;
  asOf: string;
  horizonDays: number;
  startingBalance: number;
  entries: CashflowForecastEntry[];
};

export type CategorySpending = {
  category: string;
  currency: CurrencyCode;
  amount: number;
};

export type IncomeExpenseTrendPoint = {
  period: string;
  income: number;
  expense: number;
  currency: CurrencyCode;
};

export type NetWorthPoint = {
  date: string;
  amount: number;
  currency: CurrencyCode;
};

export type CreditCardUtilizationPoint = {
  accountId: string;
  accountName: string;
  utilizationPercent: number;
  statementEndDate: string;
};

export type BudgetVsActualPoint = {
  budgetId: string;
  label: string;
  category: string;
  limit: number;
  actual: number;
  currency: CurrencyCode;
};

export type ForecastChartPoint = {
  date: string;
  projectedNet: number;
  currency: CurrencyCode;
};

export type ReportBundle = {
  timeframeStart: string;
  timeframeEnd: string;
  spendingByCategory: CategorySpending[];
  incomeVsExpense: IncomeExpenseTrendPoint[];
  netWorth: NetWorthPoint[];
  creditCardUtilization: CreditCardUtilizationPoint[];
  budgetVsActual: BudgetVsActualPoint[];
  cashflowProjection: ForecastChartPoint[];
};

export type FinanceSettings = {
  defaultCurrency: CurrencyCode;
  budgetingPeriod: BudgetPeriod;
  budgetingStartDay: number;
  allowBackdatedEdits: boolean;
  reminders: {
    creditCardDue: boolean;
    loanPayments: boolean;
    billSplits: boolean;
  };
};

export type FinanceSnapshot = {
  accounts: Account[];
  transactions: Transaction[];
  contacts: Contact[];
  loans: Loan[];
  billSplits: BillSplit[];
  budgets: Budget[];
  budgetProgress: BudgetProgress[];
  savingsGoals: SavingsGoal[];
  recurringItems: RecurringItem[];
  cashflowForecast: CashflowForecast;
  reports: ReportBundle;
  contactSummaries: ContactSummary[];
  settings: FinanceSettings;
  categories: Category[];
};