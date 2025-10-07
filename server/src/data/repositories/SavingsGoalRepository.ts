import { BaseRepository } from './BaseRepository';

export default class SavingsGoalRepository extends BaseRepository<any> {
  async findAll(): Promise<any[]> {
    return this.prisma.savingsGoal.findMany({ include: { contributions: true } });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.savingsGoal.findUnique({
      where: { id },
      include: {
        contributions: true
      }
    });
  }

  async create(data: any): Promise<any> {
    return this.prisma.savingsGoal.create({ data, include: { contributions: true } });
  }

  async update(id: string, data: any): Promise<any> {
    return this.prisma.savingsGoal.update({ where: { id }, data, include: { contributions: true } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savingsGoal.delete({
      where: { id }
    });
  }
}
