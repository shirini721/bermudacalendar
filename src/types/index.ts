export enum EventCategory {
  School = 'school',
  Sports = 'sports',
  Medical = 'medical',
  Vacation = 'vacation',
  Birthday = 'birthday',
  Other = 'other',
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar_url: string | null;
  family_group_id: string | null;
  created_at: string;
  updated_at: string;
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
  created_by: string;
  family_group_id: string;
  recurrence_rule: string | null;
  rsvp_enabled: boolean;
  assigned_to: string[];
  created_at: string;
  updated_at: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'maybe' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface EventWithProfile extends Event {
  creator?: Profile;
  rsvps?: EventRSVP[];
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

export type RSVPStatus = 'going' | 'maybe' | 'declined';

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

export const MEMBER_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
];
