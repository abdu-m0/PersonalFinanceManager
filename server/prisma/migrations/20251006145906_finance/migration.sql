-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "institution" TEXT,
    "lastFour" TEXT,
    "currency" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "creditLimit" REAL,
    "availableCredit" REAL,
    "pendingBalance" REAL,
    "statementStartDay" INTEGER,
    "statementEndDay" INTEGER,
    "dueDay" INTEGER,
    "apr" REAL,
    "annualFee" REAL,
    "gracePeriodDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postedAt" TEXT,
    "accountId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "counterAmount" REAL,
    "counterCurrency" TEXT,
    "description" TEXT,
    "merchant" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "contactId" TEXT,
    "referenceNo" TEXT,
    "approvalCode" TEXT,
    "dueDate" TEXT,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "avatarColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "principal" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "interestRate" REAL NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "schedule" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit" REAL NOT NULL,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BudgetCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "targetDate" TEXT,
    "priority" INTEGER,
    "description" TEXT,
    "autoAmount" REAL,
    "autoCurrency" TEXT,
    "autoCadence" TEXT,
    "autoInterval" INTEGER,
    "autoDayOfMonth" INTEGER,
    "nextContributionDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SavingsContribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavingsContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "nextRunDate" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "interval" INTEGER,
    "dayOfMonth" INTEGER,
    "accountId" TEXT,
    "category" TEXT,
    "contactId" TEXT,
    "autoCreateTransaction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringItem_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillSplit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "payerContactId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BillSplitParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "splitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "share" REAL NOT NULL,
    "paid" REAL NOT NULL,
    CONSTRAINT "BillSplitParticipant_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "BillSplit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillSplitParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "defaultCurrency" TEXT NOT NULL,
    "budgetingPeriod" TEXT NOT NULL,
    "budgetingStartDay" INTEGER NOT NULL,
    "allowBackdatedEdits" BOOLEAN NOT NULL,
    "reminderCreditCard" BOOLEAN NOT NULL DEFAULT true,
    "reminderLoans" BOOLEAN NOT NULL DEFAULT true,
    "reminderBillSplits" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_currency_idx" ON "Account"("currency");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_contactId_idx" ON "Transaction"("contactId");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Contact_name_idx" ON "Contact"("name");

-- CreateIndex
CREATE INDEX "Loan_contactId_idx" ON "Loan"("contactId");

-- CreateIndex
CREATE INDEX "Loan_status_idx" ON "Loan"("status");

-- CreateIndex
CREATE INDEX "Loan_direction_idx" ON "Loan"("direction");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_idx" ON "LoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "LoanPayment_date_idx" ON "LoanPayment"("date");

-- CreateIndex
CREATE INDEX "Budget_startDate_idx" ON "Budget"("startDate");

-- CreateIndex
CREATE INDEX "Budget_endDate_idx" ON "Budget"("endDate");

-- CreateIndex
CREATE INDEX "BudgetCategory_budgetId_idx" ON "BudgetCategory"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetCategory_category_idx" ON "BudgetCategory"("category");

-- CreateIndex
CREATE INDEX "SavingsGoal_targetDate_idx" ON "SavingsGoal"("targetDate");

-- CreateIndex
CREATE INDEX "SavingsGoal_priority_idx" ON "SavingsGoal"("priority");

-- CreateIndex
CREATE INDEX "SavingsContribution_goalId_idx" ON "SavingsContribution"("goalId");

-- CreateIndex
CREATE INDEX "SavingsContribution_date_idx" ON "SavingsContribution"("date");

-- CreateIndex
CREATE INDEX "RecurringItem_nextRunDate_idx" ON "RecurringItem"("nextRunDate");

-- CreateIndex
CREATE INDEX "RecurringItem_type_idx" ON "RecurringItem"("type");

-- CreateIndex
CREATE INDEX "BillSplit_status_idx" ON "BillSplit"("status");

-- CreateIndex
CREATE INDEX "BillSplit_date_idx" ON "BillSplit"("date");

-- CreateIndex
CREATE INDEX "BillSplitParticipant_splitId_idx" ON "BillSplitParticipant"("splitId");

-- CreateIndex
CREATE INDEX "BillSplitParticipant_contactId_idx" ON "BillSplitParticipant"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");
