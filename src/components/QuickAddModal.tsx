import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TrackableItem, Category } from '../db';
import { LogDetailModal } from './LogDetailModal';

export function QuickAddModal({ onClose }: { onClose: () => void }) {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());
  const allItems = useLiveQuery(() => db.trackableItems.toArray());
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<TrackableItem | null>(null);

  const filtered = allItems?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const catMap = categories?.reduce(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {} as Record<string, Category>
  );

  const quickLog = async (item: TrackableItem) => {
    await db.logEntries.add({
      id: crypto.randomUUID(),
      itemId: item.id,
      timestamp: new Date(),
    });
    onClose();
  };

  if (detailItem) {
    return (
      <LogDetailModal
        item={detailItem}
        onClose={() => {
          setDetailItem(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 max-h-[80vh] flex flex-col border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-text">Log an Item</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary text-xl transition-colors">&times;</button>
        </div>

        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary mb-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />

        <div className="overflow-y-auto flex-1">
          {(!filtered || filtered.length === 0) && (
            <p className="text-center text-text-tertiary py-4 text-sm">
              {search ? 'No items found' : 'No items yet. Add some in Manage.'}
            </p>
          )}
          {filtered?.map((item) => {
            const cat = catMap?.[item.categoryId];
            return (
              <button
                key={item.id}
                onClick={() => quickLog(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDetailItem(item);
                }}
                className="w-full flex items-center justify-between px-3 py-3 hover:bg-elevated active:bg-elevated/80 rounded-xl text-left transition-colors duration-200"
              >
                <span className="text-sm text-text">
                  {item.icon ? `${item.icon} ` : ''}{item.name}
                </span>
                <span className="text-xs text-text-tertiary">{cat?.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
