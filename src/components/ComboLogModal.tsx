import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Search, Minus } from 'lucide-react';
import { db } from '../db';
import type { Combo } from '../db';

interface Props {
  combo: Combo;
  onClose: () => void;
}

export function ComboLogModal({ combo, onClose }: Props) {
  const allItems = useLiveQuery(() => db.trackableItems.toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());

  const itemMap = useMemo(
    () => Object.fromEntries((allItems ?? []).map((i) => [i.id, i])),
    [allItems]
  );
  const catMap = useMemo(
    () => Object.fromEntries((categories ?? []).map((c) => [c.id, c])),
    [categories]
  );

  // Default ingredients that still exist
  const defaultIngredients = useMemo(
    () => combo.items.filter((ci) => itemMap[ci.itemId]).sort((a, b) => a.sortOrder - b.sortOrder),
    [combo.items, itemMap]
  );

  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(combo.items.map((ci) => ci.itemId))
  );
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const toggleDefault = (itemId: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const removeExtra = (itemId: string) => {
    setExtraIds((prev) => prev.filter((id) => id !== itemId));
  };

  const addExtra = (itemId: string) => {
    setExtraIds((prev) => [...prev, itemId]);
    setShowSearch(false);
    setSearch('');
  };

  // Items available to add as extras (not already in defaults or extras)
  const defaultItemIds = new Set(combo.items.map((ci) => ci.itemId));
  const extraIdSet = new Set(extraIds);
  const searchResults = allItems?.filter(
    (item) =>
      !defaultItemIds.has(item.id) &&
      !extraIdSet.has(item.id) &&
      item.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCount = [...enabledIds].filter((id) => defaultItemIds.has(id)).length + extraIds.length;

  const handleLog = async () => {
    const enabledDefaults = [...enabledIds].filter((id) => defaultItemIds.has(id));
    const allItemIds = [...enabledDefaults, ...extraIds];
    if (allItemIds.length === 0) return;
    const now = new Date();
    await db.logEntries.bulkAdd(
      allItemIds.map((itemId) => ({
        id: crypto.randomUUID(),
        itemId,
        timestamp: now,
      }))
    );
    onClose();
  };

  if (!allItems || !categories) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 border-t border-border max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-text">
            {combo.icon ? `${combo.icon} ` : ''}{combo.name}
          </h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary transition-colors p-1 rounded-lg hover:bg-elevated">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 mb-3">
          {/* Default ingredients */}
          {defaultIngredients.map((ci) => {
            const item = itemMap[ci.itemId];
            if (!item) return null;
            const cat = catMap[item.categoryId];
            const enabled = enabledIds.has(ci.itemId);
            return (
              <label
                key={ci.itemId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  enabled ? 'bg-elevated' : 'bg-elevated/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleDefault(ci.itemId)}
                  className="rounded accent-primary shrink-0"
                />
                <span className={`text-sm flex-1 transition-all duration-200 ${
                  enabled ? 'text-text' : 'text-text-tertiary line-through'
                }`}>
                  {item.icon ? `${item.icon} ` : ''}{item.name}
                </span>
                <span className="text-xs text-text-tertiary">{cat?.name}</span>
              </label>
            );
          })}

          {/* Extra items */}
          {extraIds.map((id) => {
            const item = itemMap[id];
            if (!item) return null;
            const cat = catMap[item.categoryId];
            return (
              <div
                key={id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-dashed border-primary/20"
              >
                <span className="text-sm text-text flex-1">
                  {item.icon ? `${item.icon} ` : ''}{item.name}
                </span>
                <span className="text-xs text-text-tertiary">{cat?.name}</span>
                <button
                  onClick={() => removeExtra(id)}
                  className="text-text-tertiary hover:text-symptom p-0.5 rounded transition-colors"
                >
                  <Minus size={14} />
                </button>
              </div>
            );
          })}

          {/* Add extra ingredient */}
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-center gap-1 text-sm text-primary py-2.5 hover:bg-primary/10 rounded-xl transition-colors duration-200 border border-dashed border-primary/20"
            >
              <Plus size={16} /> Add ingredient
            </button>
          ) : (
            <div className="space-y-1 pt-1">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="max-h-32 overflow-y-auto">
                {searchResults?.slice(0, 10).map((item) => {
                  const cat = catMap[item.categoryId];
                  return (
                    <button
                      key={item.id}
                      onClick={() => addExtra(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-elevated rounded-lg text-left transition-colors"
                    >
                      <span className="text-sm text-text">
                        {item.icon ? `${item.icon} ` : ''}{item.name}
                      </span>
                      <span className="text-xs text-text-tertiary">{cat?.name}</span>
                    </button>
                  );
                })}
                {search && searchResults?.length === 0 && (
                  <p className="text-xs text-text-tertiary text-center py-2">No items found</p>
                )}
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearch(''); }}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors px-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLog}
          disabled={totalCount === 0}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-base rounded-xl font-medium active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
        >
          Log {totalCount} item{totalCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
