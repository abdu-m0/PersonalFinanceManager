export type Transaction = { id: number; date: string; description: string; amount: number; account?: string; type?: string; category?: string; notes?: string };
export type Category = { id: number; name: string };
export type Person = { id: number; name: string; label?: string; contact?: string };
export type Loan = { id: number; amount: number; counterparty?: number | null; startDate?: string; term?: string };
export type Receivable = { id: number; amount: number; personId?: number | null; dueDate?: string; status?: string };

export const stores = {
  transactions: [] as Transaction[],
  categories: [] as Category[],
  people: [] as Person[],
  loans: [] as Loan[],
  receivables: [] as Receivable[],
  // helper to create ids
  nextId(collection: { id: number }[]) {
    return collection.length ? collection[collection.length - 1].id + 1 : 1;
  }
};

// seed a couple of categories
stores.categories.push({ id: 1, name: 'General' });
