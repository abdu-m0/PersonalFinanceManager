import { Budget, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class BudgetRepository extends BaseRepository<Budget> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.BudgetWhereInput;
    orderBy?: Prisma.BudgetOrderByWithRelationInput;
  }): Promise<Budget[]> {
    const { where, orderBy, skip, take } = options || {};
    return this.prisma.budget.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { categories: true },
    });
  }

  async findById(id: string): Promise<Budget | null> {
    return this.prisma.budget.findUnique({
      where: { id },
      include: {
        categories: true
      }
    });
  }

  async create(data: any): Promise<Budget> {
    const { categories, ...budgetData } = data;
    return this.prisma.budget.create({
      data: {
        ...budgetData,
        categories: {
          create: categories,
        },
      },
      include: {
        categories: true,
      },
    });
  }

  async update(id: string, data: any): Promise<Budget> {
    const { categories, ...budgetData } = data;
    const updateData: any = budgetData;

    if (categories) {
      await this.prisma.budgetCategory.deleteMany({ where: { budgetId: id } });
      updateData.categories = {
        create: categories.map((c: any) => ({ category: c.category, limit: c.limit, carryForward: c.carryForward })),
      };
    }

    return this.prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        categories: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.budget.delete({
      where: { id }
    });
  }
}
