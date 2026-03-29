import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db } from '../db';

type DateRange = '7d' | '30d' | '90d';

function getDateRange(range: DateRange): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case '7d': d.setDate(d.getDate() - 7); break;
    case '30d': d.setDate(d.getDate() - 30); break;
    case '90d': d.setDate(d.getDate() - 90); break;
  }
  return d;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: '#1a1d27',
    border: '1px solid #2e3348',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
};

export function TrendsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const rangeStart = useMemo(() => getDateRange(range), [range]);

  const entries = useLiveQuery(
    () => db.logEntries.where('timestamp').aboveOrEqual(rangeStart).toArray(),
    [rangeStart]
  );
  const items = useLiveQuery(() => db.trackableItems.toArray());
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray());

  const itemMap = useMemo(
    () => Object.fromEntries((items ?? []).map((i) => [i.id, i])),
    [items]
  );
  const catMap = useMemo(
    () => Object.fromEntries((categories ?? []).map((c) => [c.id, c])),
    [categories]
  );

  // Count entries per item
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries?.forEach((e) => {
      counts[e.itemId] = (counts[e.itemId] ?? 0) + 1;
    });
    return counts;
  }, [entries]);

  // Sort items by count descending
  const rankedItems = useMemo(() => {
    return Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => ({ id, count, item: itemMap[id] }))
      .filter((r) => r.item);
  }, [itemCounts, itemMap]);

  // Daily data for selected item
  const dailyData = useMemo(() => {
    if (!selectedItemId || !entries) return [];

    const itemEntries = entries.filter((e) => e.itemId === selectedItemId);
    const dayMap: Record<string, { count: number; totalValue: number; valueCount: number }> = {};

    // Initialize all days in range
    const now = new Date();
    for (let d = new Date(rangeStart); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      dayMap[key] = { count: 0, totalValue: 0, valueCount: 0 };
    }

    itemEntries.forEach((e) => {
      const key = new Date(e.timestamp).toISOString().split('T')[0];
      if (!dayMap[key]) dayMap[key] = { count: 0, totalValue: 0, valueCount: 0 };
      dayMap[key].count++;
      if (e.value != null) {
        dayMap[key].totalValue += e.value;
        dayMap[key].valueCount++;
      }
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: formatDate(new Date(date + 'T12:00:00')),
        count: data.count,
        avgValue: data.valueCount > 0 ? Math.round((data.totalValue / data.valueCount) * 10) / 10 : null,
      }));
  }, [selectedItemId, entries, rangeStart]);

  const selectedItem = selectedItemId ? itemMap[selectedItemId] : null;
  const selectedCat = selectedItem ? catMap[selectedItem.categoryId] : null;
  const hasValues = dailyData.some((d) => d.avgValue != null);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-text mb-4">Trends</h1>

      <div className="flex gap-2 mb-4">
        {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
              range === r
                ? 'bg-primary text-base shadow-[0_0_12px_var(--color-primary-glow)]'
                : 'bg-elevated text-text-secondary hover:bg-border'
            }`}
          >
            {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {rankedItems.length === 0 && (
        <p className="text-center text-text-tertiary py-8">No data in this range.</p>
      )}

      {/* Item selector */}
      <div className="space-y-1 mb-6">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
          Select an item to view trends
        </h2>
        {rankedItems.map(({ id, count, item }) => {
          const cat = catMap[item!.categoryId];
          return (
            <button
              key={id}
              onClick={() => setSelectedItemId(id === selectedItemId ? null : id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm text-left transition-all duration-200 ${
                id === selectedItemId
                  ? 'bg-primary/15 border border-primary/30'
                  : 'bg-surface hover:bg-elevated'
              }`}
            >
              <span className="text-text">
                {item?.icon ? `${item.icon} ` : ''}{item?.name}
                <span className="text-text-tertiary ml-1.5 text-xs">{cat?.name}</span>
              </span>
              <span className="text-text-tertiary text-xs">{count}x</span>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      {selectedItem && dailyData.length > 0 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              {selectedItem.icon ? `${selectedItem.icon} ` : ''}
              {selectedItem.name} — Frequency
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={range === '7d' ? 0 : range === '30d' ? 4 : 13}
                    stroke="#2e3348"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} stroke="#2e3348" />
                  <Tooltip {...darkTooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill={selectedCat?.type === 'symptom' ? '#f87171' : '#818cf8'}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {hasValues && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">
                Average Value / Severity
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={range === '7d' ? 0 : range === '30d' ? 4 : 13}
                      stroke="#2e3348"
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#2e3348" />
                    <Tooltip {...darkTooltipStyle} />
                    <Line
                      dataKey="avgValue"
                      stroke={selectedCat?.type === 'symptom' ? '#f87171' : '#818cf8'}
                      strokeWidth={2}
                      dot={{ r: 2, fill: selectedCat?.type === 'symptom' ? '#f87171' : '#818cf8' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
