import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
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
      <h1 className="text-xl font-semibold text-text mb-4">Timeline</h1>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shiftDate(-1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary bg-elevated rounded-lg active:bg-border transition-colors duration-200"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm text-text bg-elevated border border-border rounded-lg px-2 py-1.5 [color-scheme:dark]"
        />
        <button
          onClick={() => shiftDate(1)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary bg-elevated rounded-lg active:bg-border transition-colors duration-200"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {(!entries || entries.length === 0) && (
        <p className="text-center text-text-tertiary py-8">No entries for this day.</p>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => {
          const item = itemMap[entry.itemId];
          const cat = item ? catMap[item.categoryId] : null;
          const isSymptom = cat?.type === 'symptom';
          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 p-3 rounded-xl border-l-2 bg-surface ${
                isSymptom
                  ? 'border-l-symptom'
                  : 'border-l-primary'
              }`}
            >
              <div className="text-xs text-text-tertiary pt-0.5 w-16 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">
                    {item?.icon ? `${item.icon} ` : ''}
                    {item?.name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-text-tertiary">{cat?.name}</span>
                </div>
                {entry.value != null && (
                  <span className="text-xs text-text-secondary">
                    {entry.value}{entry.unit ?? ''}
                  </span>
                )}
                {entry.notes && (
                  <p className="text-xs text-text-tertiary mt-0.5">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-text-tertiary hover:text-symptom shrink-0 transition-colors duration-200 p-1 rounded-lg hover:bg-symptom-surface"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
