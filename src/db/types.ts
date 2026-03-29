export interface Category {
  id: string;
  name: string;
  type: 'habit' | 'symptom';
  sortOrder: number;
  createdAt: Date;
}

export interface TrackableItem {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  isFavorite: boolean;
  createdAt: Date;
}

export interface LogEntry {
  id: string;
  itemId: string;
  timestamp: Date;
  value?: number;
  unit?: string;
  notes?: string;
}

export interface ComboItem {
  itemId: string;
  sortOrder: number;
}

export interface Combo {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  items: ComboItem[];
  createdAt: Date;
}
