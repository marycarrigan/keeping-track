import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { TrackableItem, Category } from '../db';
import { LogDetailModal } from '../components/LogDetailModal';
import { QuickAddModal } from '../components/QuickAddModal';

export function LogPage() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());
  const allItems = useLiveQuery(() => db.trackableItems.toArray());
  const favorites = allItems?.filter((item) => item.isFavorite);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const recentEntries = useLiveQuery(
    () =>
      db.logEntries
        .where('timestamp')
        .aboveOrEqual(todayStart)
        .reverse()
        .sortBy('timestamp'),
    []
  );

  const [detailItem, setDetailItem] = useState<TrackableItem | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [recentItems, setRecentItems] = useState<Map<string, number>>(new Map());

  const quickLog = useCallback(async (item: TrackableItem) => {
    await db.logEntries.add({
      id: crypto.randomUUID(),
      itemId: item.id,
      timestamp: new Date(),
    });
    setRecentItems((prev) => {
      const next = new Map(prev);
      next.set(item.id, Date.now());
      return next;
    });
  }, []);

  const itemsByCategory = favorites?.reduce(
    (acc, item) => {
      if (!acc[item.categoryId]) acc[item.categoryId] = [];
      acc[item.categoryId].push(item);
      return acc;
    },
    {} as Record<string, TrackableItem[]>
  );

  const categoryMap = categories?.reduce(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {} as Record<string, Category>
  );

  const isRecent = (itemId: string) => {
    const ts = recentItems.get(itemId);
    return ts && Date.now() - ts < 2000;
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Quick Log</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {(!favorites || favorites.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No favorite items yet</p>
          <p className="text-sm">
            Go to <strong>Manage</strong> to add categories and items, then mark them as favorites
            to see quick-tap buttons here.
          </p>
        </div>
      )}

      {categories &&
        categoryMap &&
        itemsByCategory &&
        categories.map((cat) => {
          const items = itemsByCategory[cat.id];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat.id} className="mb-4">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {cat.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => quickLog(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setDetailItem(item);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                      isRecent(item.id)
                        ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                        : cat.type === 'symptom'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {item.icon ? `${item.icon} ` : ''}
                    {item.name}
                    {isRecent(item.id) && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

      <button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg text-2xl flex items-center justify-center active:scale-95 transition-transform"
      >
        +
      </button>

      {recentEntries && recentEntries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Logged Today ({recentEntries.length})
          </h2>
          <RecentEntriesList entries={recentEntries} />
        </div>
      )}

      {detailItem && (
        <LogDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}

      {showQuickAdd && (
        <QuickAddModal onClose={() => setShowQuickAdd(false)} />
      )}
    </div>
  );
}

function RecentEntriesList({ entries }: { entries: import('../db').LogEntry[] }) {
  const items = useLiveQuery(() => db.trackableItems.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  if (!items || !categories) return null;

  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-1">
      {entries.slice(0, 10).map((entry) => {
        const item = itemMap[entry.itemId];
        return (
          <div
            key={entry.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg text-sm"
          >
            <span className="text-gray-700">
              {item?.icon ? `${item.icon} ` : ''}
              {item?.name ?? 'Unknown'}
              {entry.value != null && (
                <span className="text-gray-500 ml-1">
                  ({entry.value}{entry.unit ?? ''})
                </span>
              )}
            </span>
            <span className="text-gray-400 text-xs">
              {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
