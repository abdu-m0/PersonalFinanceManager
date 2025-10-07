# Database Implementation Guide

This guide will walk you through migrating from in-memory storage to a proper database using Prisma ORM.

## Phase 1: Setup & Installation

### Step 1: Install Dependencies

```bash
cd server
npm install --save prisma @prisma/client
npm install --save-dev @types/node
```

### Step 2: Initialize Prisma

```bash
npx prisma init --datasource-provider sqlite
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables

### Step 3: Update .env

```env
# Development
DATABASE_URL="file:./dev.db"

# Production (PostgreSQL)
# DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
```

## Phase 2: Define Database Schema

### Step 4: Create Prisma Schema

Edit `server/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Account {
  id            String   @id @default(uuid())
  name          String
  type          String   // bank, credit-card, mobile-wallet, cash, investment
  institution   String?
  lastFour      String?
  currency      String
  balance       Float
  color         String?
  icon          String?
  status        String   @default("active")
  
  // Credit card specific
  creditLimit       Float?
  availableCredit   Float?
  pendingBalance    Float?
  statementStartDay Int?
  statementEndDay   Int?
  dueDay           Int?
  apr              Float?
  annualFee        Float?
  gracePeriodDays  Int?
  
  transactions      Transaction[]
  fromTransfers     Transaction[] @relation("FromAccount")
  toTransfers       Transaction[] @relation("ToAccount")
  recurringItems    RecurringItem[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([status])
  @@index([currency])
}

model Transaction {
  id              String   @id @default(uuid())
  type            String   // income, expense, transfer
  date            String
  amount          Float
  currency        String
  status          String   @default("pending")
  postedAt        String?
  
  accountId       String?
  account         Account? @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  fromAccountId   String?
  fromAccount     Account? @relation("FromAccount", fields: [fromAccountId], references: [id])
  
  toAccountId     String?
  toAccount       Account? @relation("ToAccount", fields: [toAccountId], references: [id])
  
  counterAmount   Float?
  counterCurrency String?
  
  description     String?
  merchant        String?
  category        String?
  notes           String?
  
  contactId       String?
  contact         Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)
  
  referenceNo     String?
  approvalCode    String?
  dueDate         String?
  source          String?
  metadata        String?  // JSON stored as string
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([type])
  @@index([date])
  @@index([accountId])
  @@index([contactId])
  @@index([category])
  @@index([status])
}

model Contact {
  id          String   @id @default(uuid())
  name        String
  label       String?
  phone       String?
  email       String?
  avatarColor String?
  
  transactions Transaction[]
  loans        Loan[]
  recurringItems RecurringItem[]
  billSplitParticipants BillSplitParticipant[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([name])
}

model Loan {
  id           String   @id @default(uuid())
  label        String
  contactId    String
  contact      Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  direction    String   // borrowed, lent
  horizon      String   // short-term, long-term
  principal    Float
  currency     String
  interestRate Float
  termMonths   Int
  startDate    String
  status       String   @default("active")
  
  payments     LoanPayment[]
  schedule     String   // JSON stored as string
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([contactId])
  @@index([status])
  @@index([direction])
}

model LoanPayment {
  id        String   @id @default(uuid())
  loanId    String
  loan      Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
  
  date      String
  amount    Float
  currency  String
  note      String?
  
  createdAt DateTime @default(now())
  
  @@index([loanId])
  @@index([date])
}

model Budget {
  id           String   @id @default(uuid())
  label        String
  period       String   // monthly, weekly, custom
  startDate    String
  endDate      String?
  carryForward Boolean  @default(false)
  locked       Boolean  @default(false)
  
  categories   BudgetCategory[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([startDate])
  @@index([endDate])
}

model BudgetCategory {
  id           String   @id @default(uuid())
  budgetId     String
  budget       Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  category     String
  limit        Float
  carryForward Boolean  @default(false)
  
  @@index([budgetId])
  @@index([category])
}

model SavingsGoal {
  id              String   @id @default(uuid())
  label           String
  targetAmount    Float
  currentAmount   Float
  currency        String
  targetDate      String?
  priority        Int?
  description     String?
  
  contributions   SavingsContribution[]
  
  // Auto contribution settings
  autoAmount      Float?
  autoCurrency    String?
  autoCadence     String?
  autoInterval    Int?
  autoDayOfMonth  Int?
  nextContributionDate String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([targetDate])
  @@index([priority])
}

model SavingsContribution {
  id      String       @id @default(uuid())
  goalId  String
  goal    SavingsGoal  @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  date    String
  amount  Float
  currency String
  accountId String?
  
  createdAt DateTime @default(now())
  
  @@index([goalId])
  @@index([date])
}

model RecurringItem {
  id        String   @id @default(uuid())
  label     String
  type      String   // income, expense
  amount    Float
  currency  String
  
  nextRunDate String
  cadence     String   // daily, weekly, biweekly, monthly, quarterly, yearly, custom
  interval    Int?
  dayOfMonth  Int?
  
  accountId   String?
  account     Account? @relation(fields: [accountId], references: [id], onDelete: SetNull)
  
  category    String?
  contactId   String?
  contact     Contact? @relation(fields: [contactId], references: [id], onDelete: SetNull)
  
  autoCreateTransaction Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([nextRunDate])
  @@index([type])
}

model BillSplit {
  id          String   @id @default(uuid())
  description String
  date        String
  currency    String
  totalAmount Float
  payerContactId String
  status      String   // open, partial, settled
  
  participants BillSplitParticipant[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([status])
  @@index([date])
}

model BillSplitParticipant {
  id        String     @id @default(uuid())
  splitId   String
  split     BillSplit  @relation(fields: [splitId], references: [id], onDelete: Cascade)
  
  contactId String
  contact   Contact    @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  share     Float
  paid      Float
  
  @@index([splitId])
  @@index([contactId])
}

model Category {
  id   String @id @default(uuid())
  name String @unique
  
  createdAt DateTime @default(now())
  
  @@index([name])
}

model Settings {
  id              Int     @id @default(1)
  defaultCurrency String
  budgetingPeriod String
  budgetingStartDay Int
  allowBackdatedEdits Boolean
  
  // Reminders
  reminderCreditCard  Boolean @default(true)
  reminderLoans       Boolean @default(true)
  reminderBillSplits  Boolean @default(true)
  
  updatedAt DateTime @updatedAt
}
```

### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

### Step 6: Create Initial Migration

```bash
npx prisma migrate dev --name init
```

This creates the database tables.

## Phase 3: Create Repository Layer

### Step 7: Create Database Client

Create `server/src/data/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

### Step 8: Create Base Repository

Create `server/src/data/repositories/BaseRepository.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { prisma } from '../db';

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  abstract findAll(): Promise<T[]>;
  abstract findById(id: string): Promise<T | null>;
  abstract create(data: any): Promise<T>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
```

### Step 9: Create Account Repository

Create `server/src/data/repositories/AccountRepository.ts`:

```typescript
import { Account, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class AccountRepository extends BaseRepository<Account> {
  async findAll(): Promise<Account[]> {
    return this.prisma.account.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id }
    });
  }

  async findActive(): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({
      data
    });
  }

  async update(id: string, data: Prisma.AccountUpdateInput): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({
      where: { id }
    });
  }

  async updateBalance(id: string, amount: number): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: {
        balance: {
          increment: amount
        }
      }
    });
  }

  async updateCreditCard(
    id: string,
    updates: {
      pendingBalance?: number;
      availableCredit?: number;
    }
  ): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: updates
    });
  }
}
```

### Step 10: Create Transaction Repository

Create `server/src/data/repositories/TransactionRepository.ts`:

```typescript
import { Transaction, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class TransactionRepository extends BaseRepository<Transaction> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.TransactionWhereInput;
    orderBy?: Prisma.TransactionOrderByWithRelationInput;
  }): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      skip: options?.skip,
      take: options?.take,
      where: options?.where,
      orderBy: options?.orderBy || { date: 'desc' },
      include: {
        account: true,
        contact: true,
        fromAccount: true,
        toAccount: true
      }
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        contact: true
      }
    });
  }

  async findByAccountId(accountId: string, limit?: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { accountId },
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        contact: true
      }
    });
  }

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        date: {
