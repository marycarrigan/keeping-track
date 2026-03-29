import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Search, Plus } from 'lucide-react';
import { db } from '../db';
import type { TrackableItem, Category } from '../db';
import { LogDetailModal } from './LogDetailModal';

export function QuickAddModal({ onClose }: { onClose: () => void }) {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());
  const allItems = useLiveQuery(() => db.trackableItems.toArray());
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<TrackableItem | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('');
  const [newItemFavorite, setNewItemFavorite] = useState(true);

  const filtered = allItems?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const hasExactMatch = filtered?.some(
    (item) => item.name.toLowerCase() === search.toLowerCase()
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

  const openCreateForm = () => {
    setNewItemName(search.trim());
    setNewItemCategoryId(categories?.[0]?.id ?? '');
    setNewItemIcon('');
    setNewItemFavorite(true);
    setShowCreateForm(true);
  };

  const createItem = async () => {
    if (!newItemName.trim() || !newItemCategoryId) return;
    await db.trackableItems.add({
      id: crypto.randomUUID(),
      categoryId: newItemCategoryId,
      name: newItemName.trim(),
      icon: newItemIcon.trim() || undefined,
      isFavorite: newItemFavorite,
      createdAt: new Date(),
    });
    setShowCreateForm(false);
    setSearch(newItemName.trim());
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
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary transition-colors p-1 rounded-lg hover:bg-elevated"><X size={18} /></button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowCreateForm(false); }}
            autoFocus
            className="w-full pl-9 pr-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {search.trim() && !hasExactMatch && !showCreateForm && (
            <button
              onClick={openCreateForm}
              className="w-full flex items-center gap-2 px-3 py-3 hover:bg-elevated active:bg-elevated/80 rounded-xl text-left transition-colors duration-200 border border-dashed border-border mb-1"
            >
              <Plus size={16} className="text-primary" />
              <span className="text-sm text-primary">Create "{search.trim()}"</span>
            </button>
          )}

          {showCreateForm && (
            <div className="bg-elevated border border-border rounded-xl p-3 mb-2 space-y-2.5">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <select
                value={newItemCategoryId}
                onChange={(e) => setNewItemCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newItemIcon}
                onChange={(e) => setNewItemIcon(e.target.value)}
                placeholder="Icon emoji (optional, e.g. ☕)"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={newItemFavorite}
                  onChange={(e) => setNewItemFavorite(e.target.checked)}
                  className="rounded border-border"
                />
                Show on Quick Log
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={createItem}
                  disabled={!newItemName.trim() || !newItemCategoryId}
                  className="flex-1 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  Create Item
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showCreateForm && (!filtered || filtered.length === 0) && !search.trim() && (
            <p className="text-center text-text-tertiary py-4 text-sm">
              No items yet. Add some in Manage.
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
