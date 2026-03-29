import { db } from './database';

const DEFAULT_CATEGORIES = [
  { id: 'cat-food', name: 'Food', type: 'habit' as const, sortOrder: 0, createdAt: new Date() },
  { id: 'cat-drinks', name: 'Drinks', type: 'habit' as const, sortOrder: 1, createdAt: new Date() },
  { id: 'cat-symptoms', name: 'Symptoms', type: 'symptom' as const, sortOrder: 2, createdAt: new Date() },
  { id: 'cat-exercise', name: 'Exercise', type: 'habit' as const, sortOrder: 3, createdAt: new Date() },
];

export async function seedDefaultData() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }
}
