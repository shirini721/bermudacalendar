export enum EventCategory {
  School = 'school',
  Sports = 'sports',
  Medical = 'medical',
  Vacation = 'vacation',
  Birthday = 'birthday',
  Other = 'other',
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  category: EventCategory;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedEventRow {
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location?: string;
  description?: string;
  category: EventCategory;
  assigned_to?: string[];
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.School]: '#6366f1',
  [EventCategory.Sports]: '#10b981',
  [EventCategory.Medical]: '#ef4444',
  [EventCategory.Vacation]: '#f59e0b',
  [EventCategory.Birthday]: '#ec4899',
  [EventCategory.Other]: '#6b7280',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.School]: 'School',
  [EventCategory.Sports]: 'Sports',
  [EventCategory.Medical]: 'Medical',
  [EventCategory.Vacation]: 'Vacation',
  [EventCategory.Birthday]: 'Birthday',
  [EventCategory.Other]: 'Other',
};
