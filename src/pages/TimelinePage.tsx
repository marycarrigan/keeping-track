import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function TimelinePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const dayStart = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d;
  }, [selectedDate]);

  const dayEnd = useMemo(() => {
    const d = new Date(selectedDate + 'T23:59:59.999');
    return d;
  }, [selectedDate]);

  const entries = useLiveQuery(
    () =>
      db.logEntries
        .where('timestamp')
        .between(dayStart, dayEnd, true, true)
        .reverse()
        .sortBy('timestamp'),
    [dayStart, dayEnd]
  );

  const items = useLiveQuery(() => db.trackableItems.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  const itemMap = useMemo(
    () => Object.fromEntries((items ?? []).map((i) => [i.id, i])),
    [items]
  );
  const catMap = useMemo(
    () => Object.fromEntries((categories ?? []).map((c) => [c.id, c])),
    [categories]
  );

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const deleteEntry = async (id: string) => {
    await db.logEntries.delete(id);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h1>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shiftDate(-1)}
          className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200"
        >
          ← Prev
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm text-gray-700 border border-gray-300 rounded-lg px-2 py-1.5"
        />
        <button
          onClick={() => shiftDate(1)}
          className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200"
        >
          Next →
        </button>
      </div>

      {(!entries || entries.length === 0) && (
        <p className="text-center text-gray-500 py-8">No entries for this day.</p>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => {
          const item = itemMap[entry.itemId];
          const cat = item ? catMap[item.categoryId] : null;
          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                cat?.type === 'symptom'
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-indigo-200 bg-indigo-50/50'
              }`}
            >
              <div className="text-xs text-gray-500 pt-0.5 w-16 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {item?.icon ? `${item.icon} ` : ''}
                    {item?.name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-400">{cat?.name}</span>
                </div>
                {entry.value != null && (
                  <span className="text-xs text-gray-500">
                    {entry.value}{entry.unit ?? ''}
                  </span>
                )}
                {entry.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-gray-400 hover:text-red-500 text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
