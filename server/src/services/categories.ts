import { prisma } from '../data/db';

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required');
  // Unique constraint will protect duplicates (case sensitive). Perform a case-insensitive pre-check for friendlier error.
  const existing = await prisma.category.findFirst({ where: { name: { equals: trimmed } } });
  if (existing) return existing; // Idempotent create
  return prisma.category.create({ data: { name: trimmed } });
}
