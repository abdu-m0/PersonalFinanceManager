import { Transaction, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class TransactionRepository extends BaseRepository<Transaction> {
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
    // Ensure metadata is stored as a string (schema uses String? for JSON)
    const safeData: any = { ...data };
    if (safeData.metadata && typeof safeData.metadata !== 'string') {
      try {
        safeData.metadata = JSON.stringify(safeData.metadata);
      } catch (e) {
        // fallback: remove metadata if it can't be serialized
        delete safeData.metadata;
      }
    }
    // Some callers may accidentally include a `billSplit` nested object which is not
    // a relation on Transaction — strip it to avoid Prisma validation errors.
    if (safeData.billSplit !== undefined) {
      delete safeData.billSplit;
    }

    return this.prisma.transaction.create({
      data: safeData,
      include: {
        account: true,
        contact: true
      }
    });
  }

  // Use a permissive input type here because Prisma generated types may vary across versions
  async update(id: string, data: any): Promise<Transaction> {
    const safeData: any = { ...data };
    if (safeData.metadata && typeof safeData.metadata !== 'string') {
      try {
        safeData.metadata = JSON.stringify(safeData.metadata);
      } catch (e) {
        delete safeData.metadata;
      }
    }
    if (safeData.billSplit !== undefined) {
      delete safeData.billSplit;
    }

    return this.prisma.transaction.update({
      where: { id },
      data: safeData,
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