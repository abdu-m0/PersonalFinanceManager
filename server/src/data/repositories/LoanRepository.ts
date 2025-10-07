import { Loan, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class LoanRepository extends BaseRepository<Loan> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.LoanWhereInput;
    orderBy?: Prisma.LoanOrderByWithRelationInput;
  }): Promise<Loan[]> {
    return this.prisma.loan.findMany({
      ...options,
      include: { payments: true, contact: true },
      orderBy: options?.orderBy || { createdAt: 'desc' }
    });
  }

  async findById(id: string): Promise<Loan | null> {
    return this.prisma.loan.findUnique({
      where: { id },
      include: {
        contact: true,
        payments: true
      }
    });
  }

  async create(data: Prisma.LoanCreateInput): Promise<Loan> {
    return this.prisma.loan.create({ data, include: { payments: true } });
  }

  async update(id: string, data: Prisma.LoanUpdateInput): Promise<Loan> {
    return this.prisma.loan.update({
      where: { id },
      data,
      include: { payments: true, contact: true }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.loan.delete({
      where: { id }
    });
  }
}
