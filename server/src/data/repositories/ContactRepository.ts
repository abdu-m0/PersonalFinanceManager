import { Contact, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export default class ContactRepository extends BaseRepository<Contact> {
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.ContactWhereInput;
    orderBy?: Prisma.ContactOrderByWithRelationInput;
  }): Promise<Contact[]> {
    return this.prisma.contact.findMany(options);
  }

  async findById(id: string): Promise<Contact | null> {
    return this.prisma.contact.findUnique({
      where: { id },
      include: {
        transactions: true,
        loans: true,
        recurringItems: true,
        billSplitParticipants: true
      }
    });
  }

  async create(data: Prisma.ContactCreateInput): Promise<Contact> {
    return this.prisma.contact.create({ data });
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
