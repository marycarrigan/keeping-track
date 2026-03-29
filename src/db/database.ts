import Dexie, { type EntityTable } from 'dexie';
import type { Category, TrackableItem, LogEntry, Combo } from './types';

const db = new Dexie('DataTracker') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  trackableItems: EntityTable<TrackableItem, 'id'>;
  logEntries: EntityTable<LogEntry, 'id'>;
  combos: EntityTable<Combo, 'id'>;
};

db.version(1).stores({
  categories: 'id, name, type, sortOrder',
  trackableItems: 'id, categoryId, name, isFavorite',
  logEntries: 'id, itemId, timestamp',
});

db.version(2).stores({
  categories: 'id, name, type, sortOrder',
  trackableItems: 'id, categoryId, name, isFavorite',
  logEntries: 'id, itemId, timestamp',
  combos: 'id, categoryId, name',
});

export { db };
