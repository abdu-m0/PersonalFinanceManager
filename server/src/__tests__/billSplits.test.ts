import { createBillSplit } from '../services/billSplits';
import { prisma } from '../data/db';

jest.mock('../data/db', () => ({
  prisma: {
    contact: {
      findUnique: jest.fn(),
      create: jest.fn()
    },
    billSplit: {
      create: jest.fn()
    }
  }
}));

describe('createBillSplit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when payer is missing from participants', async () => {
    const input = {
      description: 'Dinner',
      date: '2025-10-07',
      currency: 'USD',
      totalAmount: 100,
      payerContactId: 'alice',
      participants: [
        { contactId: 'bob', share: 50, paid: 0 },
        { contactId: 'carol', share: 50, paid: 0 }
      ]
    } as any;

    await expect(createBillSplit(input)).rejects.toThrow('Payer must be included among participants');
  });
});
