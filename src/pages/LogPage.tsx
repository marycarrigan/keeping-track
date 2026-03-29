import { useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../db';
import type { TrackableItem, Category, Combo } from '../db';
import { LogDetailModal } from '../components/LogDetailModal';
import { QuickAddModal } from '../components/QuickAddModal';
import { ComboLogModal } from '../components/ComboLogModal';

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

  const combos = useLiveQuery(() => db.combos.toArray());

  const [detailItem, setDetailItem] = useState<TrackableItem | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [activeCombo, setActiveCombo] = useState<Combo | null>(null);
  const [recentItems, setRecentItems] = useState<Set<string>>(new Set());
  const [recentCombos, setRecentCombos] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flashRecent = useCallback((id: string, type: 'item' | 'combo') => {
    const setter = type === 'item' ? setRecentItems : setRecentCombos;
    setter((prev) => new Set(prev).add(id));

    // Clear any existing timer for this id
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);

    timersRef.current.set(id, setTimeout(() => {
      setter((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timersRef.current.delete(id);
    }, 1500));
  }, []);

  const quickLog = useCallback(async (item: TrackableItem) => {
    await db.logEntries.add({
      id: crypto.randomUUID(),
      itemId: item.id,
      timestamp: new Date(),
    });
    flashRecent(item.id, 'item');
  }, [flashRecent]);

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

  const isRecent = (itemId: string) => recentItems.has(itemId);
  const isRecentCombo = (comboId: string) => recentCombos.has(comboId);

  const handleComboLogged = (combo: Combo) => {
    setActiveCombo(null);
    flashRecent(combo.id, 'combo');
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text">Quick Log</h1>
        <span className="text-sm text-text-tertiary">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {(!favorites || favorites.length === 0) && (!combos || combos.length === 0) && (
        <div className="text-center py-12 text-text-tertiary">
          <p className="text-lg mb-2">No favorite items yet</p>
          <p className="text-sm text-text-secondary">
            Go to <strong className="text-text">Manage</strong> to add categories and items, then mark them as favorites
            to see quick-tap buttons here.
          </p>
        </div>
      )}

      {categories &&
        categoryMap &&
        itemsByCategory &&
        categories.map((cat) => {
          const items = itemsByCategory[cat.id] ?? [];
          const catCombos = combos?.filter((c) => c.categoryId === cat.id) ?? [];
          if (items.length === 0 && catCombos.length === 0) return null;
          return (
            <div key={cat.id} className="mb-4">
              <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                {cat.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {catCombos.map((combo) => (
                  <button
                    key={combo.id}
                    onClick={() => setActiveCombo(combo)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                      isRecentCombo(combo.id)
                        ? 'bg-success-surface text-success ring-2 ring-success/40'
                        : 'bg-primary/5 text-primary border border-dashed border-primary/30 hover:bg-primary/10'
                    }`}
                  >
                    {combo.icon ? `${combo.icon} ` : ''}{combo.name}
                    <span className="text-xs opacity-60 ml-1">({combo.items.length})</span>
                    {isRecentCombo(combo.id) && ' ✓'}
                  </button>
                ))}
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => quickLog(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setDetailItem(item);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                      isRecent(item.id)
                        ? 'bg-success-surface text-success ring-2 ring-success/40'
                        : cat.type === 'symptom'
                          ? 'bg-symptom-surface text-symptom border border-symptom-border hover:bg-symptom-surface/80'
                          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
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
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-base rounded-full shadow-[0_0_20px_var(--color-primary-glow)] flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-primary-hover"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {recentEntries && recentEntries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
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

      {activeCombo && (
        <ComboLogModal
          combo={activeCombo}
          onClose={() => handleComboLogged(activeCombo)}
        />
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
            className="flex items-center justify-between py-1.5 px-2 rounded-lg text-sm group"
          >
            <span className="text-text-secondary">
              {item?.icon ? `${item.icon} ` : ''}
              {item?.name ?? 'Unknown'}
              {entry.value != null && (
                <span className="text-text-tertiary ml-1">
                  ({entry.value}{entry.unit ?? ''})
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary text-xs">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <button
                onClick={() => db.logEntries.delete(entry.id)}
                className="text-text-tertiary hover:text-symptom transition-colors duration-200 p-0.5 rounded hover:bg-symptom-surface opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
