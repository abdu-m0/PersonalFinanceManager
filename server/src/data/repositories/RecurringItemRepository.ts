import { RecurringItem, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class RecurringItemRepository extends BaseRepository<RecurringItem> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.RecurringItemWhereInput;
    orderBy?: Prisma.RecurringItemOrderByWithRelationInput;
  }): Promise<RecurringItem[]> {
    return this.prisma.recurringItem.findMany(options);
  }

  async findById(id: string): Promise<RecurringItem | null> {
    return this.prisma.recurringItem.findUnique({
      where: { id },
      include: {
        account: true,
        contact: true
      }
    });
  }

  async create(data: Prisma.RecurringItemCreateInput): Promise<RecurringItem> {
    return this.prisma.recurringItem.create({ data });
  }

  async update(id: string, data: Prisma.RecurringItemUpdateInput): Promise<RecurringItem> {
    return this.prisma.recurringItem.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurringItem.delete({
      where: { id }
    });
  }
}
