import { normalizeSchedule, dbLoanToGqlLoan } from '../data/store';

describe('normalizeSchedule', () => {
  it('returns same array when given an array', () => {
    const arr = [{ period: 1, dueDate: '2025-10-10', interest: 1, principal: 9, balance: 91 }];
    expect(normalizeSchedule(arr)).toEqual(arr);
  });

  it('parses JSON string into array', () => {
    const arr = [{ period: 1, dueDate: '2025-10-10', interest: 1, principal: 9, balance: 91 }];
    const json = JSON.stringify(arr);
    expect(normalizeSchedule(json)).toEqual(arr);
  });

  it('wraps single object into array', () => {
    const obj = { period: 1, dueDate: '2025-10-10', interest: 1, principal: 9, balance: 91 };
    expect(normalizeSchedule(obj)).toEqual([obj]);
  });

  it('returns empty array for malformed string', () => {
    expect(normalizeSchedule('not a json')).toEqual([]);
  });
});

describe('dbLoanToGqlLoan', () => {
  it('converts db loan with schedule string to Loan with array schedule', () => {
    const dbLoan = {
      id: 'loan1',
      label: 'Test loan',
      contactId: 'c1',
      direction: 'borrowed',
      horizon: 'short-term',
      principal: 100,
      currency: 'USD',
      interestRate: 1,
      termMonths: 12,
      startDate: '2025-10-01',
      status: 'active',
      payments: [],
      schedule: JSON.stringify([{ period: 1, dueDate: '2025-11-01', interest: 1, principal: 9, balance: 91 }])
    } as any;

    const loan = dbLoanToGqlLoan(dbLoan);
    expect(Array.isArray(loan.schedule)).toBe(true);
    expect(loan.schedule[0].dueDate).toBe('2025-11-01');
  });
});
