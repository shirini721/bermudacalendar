export type Person = 'pete' | 'parnia' | 'both' | null;

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  category: 'school' | 'sports' | 'medical' | 'vacation' | 'birthday' | 'other';
  color: string | null;
  person: Person;
  checklist: ChecklistItem[] | null;
  createdAt: string;
}

export const PERSON_COLORS: Record<NonNullable<Person>, string> = {
  pete: '#3b82f6',
  parnia: '#f43f5e',
  both: '#8b5cf6',
};

export const CATEGORY_COLORS: Record<CalEvent['category'], string> = {
  school: '#6366f1',
  sports: '#10b981',
  medical: '#ef4444',
  vacation: '#f59e0b',
  birthday: '#ec4899',
  other: '#6b7280',
};
