export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;        // ISO string
  end: string;          // ISO string
  allDay: boolean;
  location: string | null;
  category: 'school' | 'sports' | 'medical' | 'vacation' | 'birthday' | 'other';
  color: string | null;
  createdAt: string;
}
