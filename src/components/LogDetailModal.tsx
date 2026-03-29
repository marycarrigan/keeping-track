import { useState } from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-surface w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">
            {item.icon ? `${item.icon} ` : ''}{item.name}
          </h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary transition-colors p-1 rounded-lg hover:bg-elevated"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Value (e.g. 3)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <input
              type="text"
              placeholder="Unit (e.g. /10, oz)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-28 px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 bg-elevated border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
          />

          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-base rounded-xl font-medium active:scale-[0.98] transition-all duration-200"
          >
            Log Entry
          </button>
        </div>
      </div>
    </div>
  );
}
