# Database Implementation Guide - Part 2

## Phase 3: Create Repository Layer (Continued)

### Step 10: Create Transaction Repository (Continued)

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
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async findByCategory(category: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { category },
      orderBy: { date: 'desc' }
    });
  }

  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({
      data,
      include: {
        account: true,
        contact: true
      }
    });
  }

  async update(id: string, data: Prisma.TransactionUpdateInput): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        account: true,
        contact: true
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({
      where: { id }
    });
  }

  async countByType(type: string): Promise<number> {
    return this.prisma.transaction.count({
      where: { type }
    });
  }
}
```

### Step 11: Create Other Repositories

Similarly, create repositories for:
- `ContactRepository.ts`
- `LoanRepository.ts`
- `BudgetRepository.ts`
- `SavingsGoalRepository.ts`
- `RecurringItemRepository.ts`
- `BillSplitRepository.ts`
- `CategoryRepository.ts`

Example: `server/src/data/repositories/ContactRepository.ts`:

```typescript
import { Contact, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class ContactRepository extends BaseRepository<Contact> {
  async findAll(): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string): Promise<Contact | null> {
    return this.prisma.contact.findUnique({
      where: { id },
      include: {
        transactions: true,
        loans: true
      }
    });
  }

  async findByName(name: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
  }

  async create(data: Prisma.ContactCreateInput): Promise<Contact> {
    return this.prisma.contact.create({
      data
    });
  }

  async update(id: string, data: Prisma.ContactUpdateInput): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contact.delete({
      where: { id }
    });
  }
}
```

## Phase 4: Create Service Layer

### Step 12: Create Account Service

Create `server/src/services/AccountService.ts`:

```typescript
import { AccountRepository } from '../data/repositories/AccountRepository';
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { Account } from '@prisma/client';
import { prisma } from '../data/db';

export class AccountService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;

  constructor() {
    this.accountRepo = new AccountRepository();
    this.transactionRepo = new TransactionRepository();
  }

  async getAllAccounts(): Promise<Account[]> {
    return this.accountRepo.findAll();
  }

  async getAccountById(id: string): Promise<Account | null> {
    return this.accountRepo.findById(id);
  }

  async createAccount(data: {
    name: string;
    type: string;
    currency: string;
    balance?: number;
    institution?: string;
    status?: string;
    // ... other fields
  }): Promise<Account> {
    return this.accountRepo.create({
      name: data.name,
      type: data.type,
      currency: data.currency,
      balance: data.balance || 0,
      institution: data.institution,
      status: data.status || 'active'
      // ... map other fields
    });
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }

    return this.accountRepo.update(id, data);
  }

  async deleteAccount(id: string): Promise<void> {
    // Use transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Delete related transactions first (or handle with CASCADE)
      await tx.transaction.deleteMany({
        where: {
          OR: [
            { accountId: id },
            { fromAccountId: id },
            { toAccountId: id }
          ]
        }
      });

      // Delete the account
      await tx.account.delete({
        where: { id }
      });
    });
  }

  async getAccountBalance(id: string): Promise<number> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new Error('Account not found');
    }
    return account.balance;
  }

  async updateAccountBalance(id: string, amount: number): Promise<Account> {
    return this.accountRepo.updateBalance(id, amount);
  }
}
```

### Step 13: Create Transaction Service

Create `server/src/services/TransactionService.ts`:

```typescript
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { AccountRepository } from '../data/repositories/AccountRepository';
import { Transaction } from '@prisma/client';
import { prisma } from '../data/db';

export class TransactionService {
  private transactionRepo: TransactionRepository;
  private accountRepo: AccountRepository;

  constructor() {
    this.transactionRepo = new TransactionRepository();
    this.accountRepo = new AccountRepository();
  }

  async getAllTransactions(options?: {
    skip?: number;
    take?: number;
    accountId?: string;
    type?: string;
  }): Promise<Transaction[]> {
    const where: any = {};
    
    if (options?.accountId) {
      where.OR = [
        { accountId: options.accountId },
        { fromAccountId: options.accountId },
        { toAccountId: options.accountId }
      ];
    }
    
    if (options?.type) {
      where.type = options.type;
    }

    return this.transactionRepo.findAll({
      skip: options?.skip,
      take: options?.take,
      where
    });
  }

  async createTransaction(data: {
    type: string;
    amount: number;
    currency: string;
    date: string;
    accountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    description?: string;
    category?: string;
    contactId?: string;
    status?: string;
    // ... other fields
  }): Promise<Transaction> {
    // Use transaction to update balances atomically
    return await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          date: data.date,
          accountId: data.accountId,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          description: data.description,
          category: data.category,
          contactId: data.contactId,
          status: data.status || 'pending'
          // ... map other fields
        }
      });

      // Update account balances
      if (data.type === 'income' && data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: data.amount
            }
          }
        });
      } else if (data.type === 'expense' && data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              decrement: data.amount
            }
          }
        });
      } else if (data.type === 'transfer' && data.fromAccountId && data.toAccountId) {
        // Debit from account
        await tx.account.update({
          where: { id: data.fromAccountId },
          data: {
            balance: {
              decrement: data.amount
            }
          }
        });

        // Credit to account
        await tx.account.update({
          where: { id: data.toAccountId },
          data: {
            balance: {
              increment: data.amount
            }
          }
        });
      }

      return transaction;
    });
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    // You may need to recalculate account balances
    // depending on what changed
    return this.transactionRepo.update(id, data);
  }

  async deleteTransaction(id: string): Promise<void> {
    const transaction = await this.transactionRepo.findById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await prisma.$transaction(async (tx) => {
      // Reverse the balance changes
      if (transaction.type === 'income' && transaction.accountId) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              decrement: transaction.amount
            }
          }
        });
      } else if (transaction.type === 'expense' && transaction.accountId) {
        await tx.account.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              increment: transaction.amount
            }
          }
        });
      }
      // Handle transfer reversals...

      // Delete the transaction
      await tx.transaction.delete({
        where: { id }
      });
    });
  }
}
```

## Phase 5: Update API Routes

### Step 14: Update Account Routes

Modify `server/src/routes/accounts.ts`:

```typescript
import { Router } from 'express';
import { AccountService } from '../services/AccountService';

const router = Router();
const accountService = new AccountService();

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await accountService.getAllAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const account = await accountService.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const account = await accountService.createAccount(req.body);
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PATCH /api/accounts/:id
router.patch('/:id', async (req, res) => {
  try {
    const account = await accountService.updateAccount(req.params.id, req.body);
    res.json(account);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    await accountService.deleteAccount(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export { router as accountsRouter };
```

### Step 15: Update Transaction Routes

Similarly update `server/src/routes/transactions.ts`:

```typescript
import { Router } from 'express';
import { TransactionService } from '../services/TransactionService';

const router = Router();
const transactionService = new TransactionService();

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { skip, take, accountId, type } = req.query;
    
    const transactions = await transactionService.getAllTransactions({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      accountId: accountId as string,
      type: type as string
    });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PATCH /api/transactions/:id
router.patch('/:id', async (req, res) => {
  try {
    const transaction = await transactionService.updateTransaction(req.params.id, req.body);
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    await transactionService.deleteTransaction(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export { router as transactionsRouter };
```

## Phase 6: Create Snapshot Service

### Step 16: Create Snapshot Service

Create `server/src/services/SnapshotService.ts`:

```typescript
import { AccountRepository } from '../data/repositories/AccountRepository';
import { TransactionRepository } from '../data/repositories/TransactionRepository';
import { ContactRepository } from '../data/repositories/ContactRepository';
import { LoanRepository } from '../data/repositories/LoanRepository';
import { BudgetRepository } from '../data/repositories/BudgetRepository';
import { SavingsGoalRepository } from '../data/repositories/SavingsGoalRepository';
import { RecurringItemRepository } from '../data/repositories/RecurringItemRepository';
import { BillSplitRepository } from '../data/repositories/BillSplitRepository';
import { CategoryRepository } from '../data/repositories/CategoryRepository';
import { FinanceSnapshot } from '../types';

export class SnapshotService {
  private accountRepo: AccountRepository;
  private transactionRepo: TransactionRepository;
  private contactRepo: ContactRepository;
  private loanRepo: LoanRepository;
  private budgetRepo: BudgetRepository;
  private savingsGoalRepo: SavingsGoalRepository;
  private recurringItemRepo: RecurringItemRepository;
  private billSplitRepo: BillSplitRepository;
  private categoryRepo: CategoryRepository;

  constructor() {
    this.accountRepo = new AccountRepository();
    this.transactionRepo = new TransactionRepository();
    this.contactRepo = new ContactRepository();
    this.loanRepo = new LoanRepository();
    this.budgetRepo = new BudgetRepository();
    this.savingsGoalRepo = new SavingsGoalRepository();
    this.recurringItemRepo = new RecurringItemRepository();
    this.billSplitRepo = new BillSplitRepository();
    this.categoryRepo = new CategoryRepository();
  }

  async getFinanceSnapshot(): Promise<FinanceSnapshot> {
    // Fetch all data in parallel for better performance
    const [
      accounts,
      transactions,
      contacts,
      loans,
      budgets,
      savingsGoals,
      recurringItems,
      billSplits,
      categories
    ] = await Promise.all([
      this.accountRepo.findAll(),
      this.transactionRepo.findAll({ take: 1000 }), // Limit for performance
      this.contactRepo.findAll(),
      this.loanRepo.findAll(),
      this.budgetRepo.findAll(),
      this.savingsGoalRepo.findAll(),
      this.recurringItemRepo.findAll(),
      this.billSplitRepo.findAll(),
      this.categoryRepo.findAll()
    ]);

    // Calculate derived data
    const budgetProgress = this.calculateBudgetProgress(budgets, transactions);
    const cashflowForecast = this.buildCashflowForecast(accounts, recurringItems, loans);
    const reports = this.buildReports(transactions, accounts);
    const contactSummaries = this.getContactSummaries(contacts, transactions, loans, billSplits);

    return {
      accounts,
      transactions,
      contacts,
      loans,
      billSplits,
      budgets,
      budgetProgress,
      savingsGoals,
      recurringItems,
      cashflowForecast,
      reports,
      contactSummaries,
      settings: await this.getSettings(),
      categories
    };
  }

  private calculateBudgetProgress(budgets: any[], transactions: any[]) {
    // Implement budget progress calculation
    // Similar to current store.ts logic
    return [];
  }

  private buildCashflowForecast(accounts: any[], recurringItems: any[], loans: any[]) {
    // Implement cashflow forecast
    return {
      currency: 'MVR',
      asOf: new Date().toISOString(),
      horizonDays: 90,
      startingBalance: 0,
      entries: []
    };
  }

  private buildReports(transactions: any[], accounts: any[]) {
    // Implement reports
    return {
      timeframeStart: new Date().toISOString(),
      timeframeEnd: new Date().toISOString(),
      spendingByCategory: [],
      incomeVsExpense: [],
      netWorth: [],
      creditCardUtilization: [],
      budgetVsActual: [],
      cashflowProjection: []
    };
  }

  private getContactSummaries(contacts: any[], transactions: any[], loans: any[], billSplits: any[]) {
    // Implement contact summaries
    return [];
  }

  private async getSettings() {
    // Get settings from database
    return {
      defaultCurrency: 'MVR',
      budgetingPeriod: 'monthly',
      budgetingStartDay: 1,
      allowBackdatedEdits: false,
      reminders: {
        creditCardDue: true,
        loanPayments: true,
        billSplits: true
      }
    };
  }
}
```

### Step 17: Update Overview Route

Modify `server/src/routes/overview.ts`:

```typescript
import { Router } from 'express';
import { SnapshotService } from '../services/SnapshotService';

const router = Router();
const snapshotService = new SnapshotService();

router.get('/snapshot', async (req, res) => {
  try {
    const snapshot = await snapshotService.getFinanceSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export { router as overviewRouter };
```

## Phase 7: Data Migration

### Step 18: Create Seed Script

Create `server/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create initial settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      defaultCurrency: 'MVR',
      budgetingPeriod: 'monthly',
      budgetingStartDay: 1,
      allowBackdatedEdits: false,
      reminderCreditCard: true,
      reminderLoans: true,
      reminderBillSplits: true
    }
  });

  // Create sample accounts
  const account1 = await prisma.account.create({
    data: {
      name: 'MVR Current',
      type: 'bank',
      currency: 'MVR',
      balance: 8200,
      institution: 'Bank of Maldives',
      status: 'active'
    }
  });

  // Create sample contact
  const contact1 = await prisma.contact.create({
    data: {
      name: 'Aisha Ibrahim',
      avatarColor: '#2563eb'
    }
  });

  // Create sample transaction
  await prisma.transaction.create({
    data: {
      type: 'income',
      amount: 4800,
      currency: 'MVR',
      status: 'posted',
      date: new Date().toISOString(),
      accountId: account1.id,
      description: 'Salary',
      category: 'Salary',
      source: 'manual'
    }
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 19: Update package.json

Add seed script to `server/package.json`:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js",
    "test": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

## Next Steps

1. Run the migration: `npm run prisma:migrate`
2. Seed the database: `npm run prisma:seed`
3. Test the API endpoints with the new database
4. Gradually migrate remaining repository methods
5. Add caching layer (Redis) for snapshot endpoint
6. Implement proper error handling
7. Add database backup strategy

## Benefits Achieved

✅ Data persistence across restarts
✅ ACID transactions
✅ Optimized queries with indexes
✅ Scalable architecture
✅ Type-safe database access
✅ Easy migrations
✅ Better separation of concerns
