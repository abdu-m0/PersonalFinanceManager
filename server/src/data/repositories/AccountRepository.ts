import { Account, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class AccountRepository extends BaseRepository<Account> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.AccountWhereInput;
    orderBy?: Prisma.AccountOrderByWithRelationInput;
  }): Promise<Account[]> {
    return this.prisma.account.findMany(options);
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            date: 'desc'
          },
          take: 50
        }
      }
    });
  }

  async create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
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
}
