import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Category, TrackableItem } from '../db';

export function ManagePage() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());
  const allItems = useLiveQuery(() => db.trackableItems.toArray());

  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showItemForm, setShowItemForm] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TrackableItem | null>(null);

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
        <h1 className="text-xl font-semibold text-gray-900">Manage</h1>
        <button
          onClick={() => { setEditingCat(null); setShowCatForm(true); }}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg active:scale-95 transition-transform"
        >
          + Category
        </button>
      </div>

      {categories?.map((cat) => (
        <div key={cat.id} className="mb-3">
          <div
            className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 cursor-pointer"
            onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{expandedCat === cat.id ? '▼' : '▶'}</span>
              <span className="font-medium text-gray-800">{cat.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                cat.type === 'symptom' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {cat.type}
              </span>
              <span className="text-xs text-gray-400">
                {itemsByCat?.[cat.id]?.length ?? 0} items
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowCatForm(true); }}
                className="text-xs text-gray-500 px-2 py-1 hover:bg-gray-100 rounded"
              >
                Edit
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
                className="text-xs text-red-500 px-2 py-1 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>

          {expandedCat === cat.id && (
            <div className="ml-4 mt-1 space-y-1">
              {itemsByCat?.[cat.id]?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {item.icon ? `${item.icon} ` : ''}{item.name}
                    </span>
                    {item.isFavorite && (
                      <span className="text-xs text-yellow-600">★</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={async () => {
                        await db.trackableItems.update(item.id, {
                          isFavorite: !item.isFavorite,
                        });
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        item.isFavorite
                          ? 'text-yellow-600 bg-yellow-50'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {item.isFavorite ? '★ Fav' : '☆ Fav'}
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-xs text-gray-500 px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete "${item.name}"?`)) {
                          await db.logEntries.where('itemId').equals(item.id).delete();
                          await db.trackableItems.delete(item.id);
                        }
                      }}
                      className="text-xs text-red-500 px-2 py-1 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setEditingItem(null); setShowItemForm(cat.id); }}
                className="w-full text-sm text-primary py-2 hover:bg-indigo-50 rounded-lg"
              >
                + Add Item
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

      <ExportSection />
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
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {category ? 'Edit Category' : 'New Category'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setType('habit')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                type === 'habit'
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              Habit
            </button>
            <button
              onClick={() => setType('symptom')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                type === 'symptom'
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              Symptom
            </button>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
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
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {item ? 'Edit Item' : 'New Item'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Item name (e.g. Coffee, Headache)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Icon emoji (optional, e.g. ☕)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded"
            />
            Show on Quick Log (favorite)
          </label>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
          >
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportSection() {
  const handleCSVExport = async () => {
    const Papa = await import('papaparse');
    const entries = await db.logEntries.orderBy('timestamp').toArray();
    const items = await db.trackableItems.toArray();
    const categories = await db.categories.toArray();

    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const rows = entries.map((entry) => {
      const item = itemMap[entry.itemId];
      const cat = item ? catMap[item.categoryId] : null;
      return {
        timestamp: new Date(entry.timestamp).toISOString(),
        category: cat?.name ?? '',
        category_type: cat?.type ?? '',
        item: item?.name ?? '',
        value: entry.value ?? '',
        unit: entry.unit ?? '',
        notes: entry.notes ?? '',
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJSONBackup = async () => {
    const data = {
      categories: await db.categories.toArray(),
      trackableItems: await db.trackableItems.toArray(),
      logEntries: await db.logEntries.toArray(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJSONRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.categories || !data.trackableItems || !data.logEntries) {
        alert('Invalid backup file');
        return;
      }

      if (!confirm('This will replace all current data. Continue?')) return;

      await db.categories.clear();
      await db.trackableItems.clear();
      await db.logEntries.clear();

      // Restore dates from ISO strings
      const entries = data.logEntries.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
      const cats = data.categories.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
      }));
      const items = data.trackableItems.map((i: any) => ({
        ...i,
        createdAt: new Date(i.createdAt),
      }));

      await db.categories.bulkAdd(cats);
      await db.trackableItems.bulkAdd(items);
      await db.logEntries.bulkAdd(entries);

      alert('Data restored successfully!');
    };
    input.click();
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
        Data Export & Backup
      </h2>
      <div className="space-y-2">
        <button
          onClick={handleCSVExport}
          className="w-full py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200"
        >
          📥 Export CSV
        </button>
        <button
          onClick={handleJSONBackup}
          className="w-full py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200"
        >
          💾 Backup (JSON)
        </button>
        <button
          onClick={handleJSONRestore}
          className="w-full py-2.5 text-sm text-gray-700 bg-gray-100 rounded-xl active:bg-gray-200"
        >
          📤 Restore from Backup
        </button>
      </div>
    </div>
  );
}
