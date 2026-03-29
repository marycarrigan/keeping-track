import { Download, Upload, Save } from 'lucide-react';
import { db } from '../db';

export function DataPage() {
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
      combos: await db.combos.toArray(),
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
      await db.combos.clear();

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

      // Restore combos (backwards-compatible with old backups)
      if (data.combos) {
        const combos = data.combos.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }));
        await db.combos.bulkAdd(combos);
      }

      alert('Data restored successfully!');
    };
    input.click();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-text mb-4">Data</h1>

      <div className="space-y-2">
        <button
          onClick={handleCSVExport}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-elevated rounded-xl active:bg-border hover:bg-border transition-colors duration-200"
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          onClick={handleJSONBackup}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-elevated rounded-xl active:bg-border hover:bg-border transition-colors duration-200"
        >
          <Save size={16} /> Backup (JSON)
        </button>
        <button
          onClick={handleJSONRestore}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-text-secondary bg-elevated rounded-xl active:bg-border hover:bg-border transition-colors duration-200"
        >
          <Upload size={16} /> Restore from Backup
        </button>
      </div>
    </div>
  );
}
