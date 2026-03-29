import { useState } from 'react';
import { db } from '../db';
import type { TrackableItem } from '../db';

interface Props {
  item: TrackableItem;
  onClose: () => void;
}

export function LogDetailModal({ item, onClose }: Props) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    await db.logEntries.add({
      id: crypto.randomUUID(),
      itemId: item.id,
      timestamp: new Date(),
      value: value ? Number(value) : undefined,
      unit: unit || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {item.icon ? `${item.icon} ` : ''}{item.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Value (e.g. 3)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Unit (e.g. /10, oz)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-28 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />

          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
          >
            Log Entry
          </button>
        </div>
      </div>
    </div>
  );
}
