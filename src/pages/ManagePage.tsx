import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronRight, Pencil, Trash2, Star, Plus, Package } from 'lucide-react';
import { db } from '../db';
import type { Category, TrackableItem, Combo } from '../db';

export function ManagePage() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());
  const allItems = useLiveQuery(() => db.trackableItems.toArray());

  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TrackableItem | null>(null);

  const combos = useLiveQuery(() => db.combos.toArray());
  const [showComboForm, setShowComboForm] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const itemsByCat = allItems?.reduce(
    (acc, item) => {
      if (!acc[item.categoryId]) acc[item.categoryId] = [];
      acc[item.categoryId].push(item);
      return acc;
    },
    {} as Record<string, TrackableItem[]>
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text">Manage</h1>
        <button
          onClick={() => { setEditingCat(null); setShowCatForm(true); }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary hover:bg-primary-hover text-base rounded-lg active:scale-95 transition-all duration-200"
        >
          <Plus size={16} /> Category
        </button>
      </div>

      {categories?.map((cat) => (
        <div key={cat.id} className="mb-3">
          <div
            className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border cursor-pointer hover:bg-elevated transition-colors duration-200"
            onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
          >
            <div className="flex items-center gap-2">
              {expandedCat === cat.id ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
              <span className="font-medium text-text">{cat.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                cat.type === 'symptom' ? 'bg-symptom-surface text-symptom' : 'bg-habit-surface text-habit'
              }`}>
                {cat.type}
              </span>
              <span className="text-xs text-text-tertiary">
                {itemsByCat?.[cat.id]?.length ?? 0} items
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowCatForm(true); }}
                className="text-text-tertiary p-1.5 hover:bg-elevated rounded-lg transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${cat.name}" and all its items?`)) {
                    const catItems = itemsByCat?.[cat.id] ?? [];
                    const itemIds = catItems.map((i) => i.id);
                    await db.logEntries.where('itemId').anyOf(itemIds).delete();
                    await db.trackableItems.where('categoryId').equals(cat.id).delete();
                    await db.categories.delete(cat.id);
                  }
                }}
                className="text-symptom p-1.5 hover:bg-symptom-surface rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {expandedCat === cat.id && (
            <div className="ml-4 mt-1 space-y-1">
              {itemsByCat?.[cat.id]?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-elevated rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">
                      {item.icon ? `${item.icon} ` : ''}{item.name}
                    </span>
                    {item.isFavorite && (
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={async () => {
                        await db.trackableItems.update(item.id, {
                          isFavorite: !item.isFavorite,
                        });
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isFavorite
                          ? 'text-yellow-400 bg-yellow-400/10'
                          : 'text-text-tertiary hover:bg-elevated'
                      }`}
                    >
                      <Star size={14} className={item.isFavorite ? 'fill-yellow-400' : ''} />
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-text-tertiary p-1.5 hover:bg-surface rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete "${item.name}"?`)) {
                          await db.logEntries.where('itemId').equals(item.id).delete();
                          await db.trackableItems.delete(item.id);
                        }
                      }}
                      className="text-symptom p-1.5 hover:bg-symptom-surface rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setEditingItem(null); setShowItemForm(cat.id); }}
                className="w-full flex items-center justify-center gap-1 text-sm text-primary py-2 hover:bg-primary/10 rounded-lg transition-colors duration-200"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
          )}
        </div>
      ))}

      {showCatForm && (
        <CategoryFormModal
          category={editingCat}
          onClose={() => { setShowCatForm(false); setEditingCat(null); }}
        />
      )}

      {showItemForm && (
        <ItemFormModal
          categoryId={showItemForm}
          item={editingItem}
          onClose={() => { setShowItemForm(null); setEditingItem(null); }}
        />
      )}

      {editingItem && !showItemForm && (
        <ItemFormModal
          categoryId={editingItem.categoryId}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Combos Section */}
      <div className="mt-6 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">Combos</h2>
          <button
            onClick={() => { setEditingCombo(null); setShowComboForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary hover:bg-primary-hover text-base rounded-lg active:scale-95 transition-all duration-200"
          >
            <Plus size={16} /> Combo
          </button>
        </div>

        {(!combos || combos.length === 0) && (
          <p className="text-sm text-text-tertiary text-center py-4">
            No combos yet. Create one to log multiple items at once.
          </p>
        )}

        {combos?.map((combo) => (
          <div
            key={combo.id}
            className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border mb-2"
          >
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <span className="font-medium text-text">
                {combo.icon ? `${combo.icon} ` : ''}{combo.name}
              </span>
              <span className="text-xs text-text-tertiary">
                {combo.items.length} items
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { setEditingCombo(combo); setShowComboForm(true); }}
                className="text-text-tertiary p-1.5 hover:bg-elevated rounded-lg transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete combo "${combo.name}"?`)) {
                    await db.combos.delete(combo.id);
                  }
                }}
                className="text-symptom p-1.5 hover:bg-symptom-surface rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showComboForm && (
        <ComboFormModal
          combo={editingCombo}
          allItems={allItems ?? []}
          categories={categories ?? []}
          onClose={() => { setShowComboForm(false); setEditingCombo(null); }}
        />
      )}

    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<'habit' | 'symptom'>(category?.type ?? 'habit');

  const handleSave = async () => {
    if (!name.trim()) return;
    if (category) {
      await db.categories.update(category.id, { name: name.trim(), type });
    } else {
      const count = await db.categories.count();
      await db.categories.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        type,
        sortOrder: count,
        createdAt: new Date(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text mb-4">
          {category ? 'Edit Category' : 'New Category'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setType('habit')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                type === 'habit'
                  ? 'bg-habit-surface text-habit border-habit-border'
                  : 'bg-elevated text-text-secondary border-border'
              }`}
            >
              Habit
            </button>
            <button
              onClick={() => setType('symptom')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                type === 'symptom'
                  ? 'bg-symptom-surface text-symptom border-symptom-border'
                  : 'bg-elevated text-text-secondary border-border'
              }`}
            >
              Symptom
            </button>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-base rounded-xl font-medium active:scale-[0.98] transition-all duration-200"
          >
            {category ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemFormModal({
  categoryId,
  item,
  onClose,
}: {
  categoryId: string;
  item: TrackableItem | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [icon, setIcon] = useState(item?.icon ?? '');
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? true);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (item) {
      await db.trackableItems.update(item.id, {
        name: name.trim(),
        icon: icon || undefined,
        isFavorite,
      });
    } else {
      await db.trackableItems.add({
        id: crypto.randomUUID(),
        categoryId,
        name: name.trim(),
        icon: icon || undefined,
        isFavorite,
        createdAt: new Date(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text mb-4">
          {item ? 'Edit Item' : 'New Item'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Item name (e.g. Coffee, Headache)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <input
            type="text"
            placeholder="Icon emoji (optional, e.g. ☕)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded accent-primary"
            />
            Show on Quick Log (favorite)
          </label>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-base rounded-xl font-medium active:scale-[0.98] transition-all duration-200"
          >
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComboFormModal({
  combo,
  allItems,
  categories,
  onClose,
}: {
  combo: Combo | null;
  allItems: TrackableItem[];
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(combo?.name ?? '');
  const [icon, setIcon] = useState(combo?.icon ?? '');
  const [categoryId, setCategoryId] = useState(combo?.categoryId ?? categories[0]?.id ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(combo?.items.map((ci) => ci.itemId) ?? [])
  );
  const [newItemName, setNewItemName] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);

  // Use live query so newly created items appear immediately
  const liveItems = useLiveQuery(() => db.trackableItems.toArray());
  const currentItems = liveItems ?? allItems;

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: currentItems.filter((i) => i.categoryId === cat.id),
  })).filter((g) => g.items.length > 0);

  const toggle = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const createAndSelect = async () => {
    if (!newItemName.trim()) return;
    const id = crypto.randomUUID();
    await db.trackableItems.add({
      id,
      categoryId: categoryId || categories[0]?.id,
      name: newItemName.trim(),
      isFavorite: false,
      createdAt: new Date(),
    });
    setSelectedIds((prev) => new Set(prev).add(id));
    setNewItemName('');
    setShowNewItem(false);
  };

  const handleSave = async () => {
    if (!name.trim() || selectedIds.size === 0 || !categoryId) return;
    const items = [...selectedIds].map((id, i) => ({ itemId: id, sortOrder: i }));
    if (combo) {
      await db.combos.update(combo.id, { name: name.trim(), icon: icon || undefined, categoryId, items });
    } else {
      await db.combos.add({
        id: crypto.randomUUID(),
        categoryId,
        name: name.trim(),
        icon: icon || undefined,
        items,
        createdAt: new Date(),
      });
    }
    // Auto-unfavorite combo ingredients so they don't clutter Quick Log
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => db.trackableItems.update(id, { isFavorite: false })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 border-t border-border max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text mb-4">
          {combo ? 'Edit Combo' : 'New Combo'}
        </h3>
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <input
            type="text"
            placeholder="Combo name (e.g. Morning Smoothie)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Icon emoji (optional)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-24 px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Ingredients ({selectedIds.size})
            </span>
            <button
              onClick={() => setShowNewItem(!showNewItem)}
              className="text-xs text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> New item
            </button>
          </div>

          {showNewItem && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAndSelect()}
                autoFocus
                className="flex-1 px-3 py-2 bg-elevated border border-border rounded-lg text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={createAndSelect}
                disabled={!newItemName.trim()}
                className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 space-y-3 -mx-1 px-1">
            {itemsByCategory.map(({ category, items }) => (
              <div key={category.id}>
                <div className="text-xs text-text-tertiary mb-1">{category.name}</div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="rounded accent-primary"
                      />
                      <span className="text-sm text-text">
                        {item.icon ? `${item.icon} ` : ''}{item.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim() || selectedIds.size === 0 || !categoryId}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-base rounded-xl font-medium active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
          >
            {combo ? 'Save Changes' : 'Create Combo'}
          </button>
        </div>
      </div>
    </div>
  );
}

