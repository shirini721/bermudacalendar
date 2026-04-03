import * as XLSX from 'xlsx';
import { EventCategory, type ParsedEventRow } from '@/types';

type RawRow = Record<string, unknown>;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '_').trim();
}

function parseDate(value: unknown): string | null {
  if (!value) return null;

  // XLSX serial number (Excel date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${date.y}-${month}-${day}`;
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }

    // MM/DD/YYYY or MM-DD-YYYY
    const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (mdy) {
      return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
    }

    // Try native Date parse
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substring(0, 10);
    }
  }

  return null;
}

function parseTime(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'number') {
    // XLSX time fraction: 0.5 = 12:00 PM
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // HH:MM or HH:MM:SS
    const hms = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hms) {
      return `${hms[1].padStart(2, '0')}:${hms[2]}`;
    }

    // 12h format: 9:00 AM, 10:30 PM
    const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
      let hours = parseInt(ampm[1], 10);
      const minutes = ampm[2];
      const meridiem = ampm[3].toUpperCase();
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }

  return null;
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['yes', 'true', '1', 'y'].includes(lower);
  }
  return false;
}

function parseCategory(value: unknown): EventCategory {
  if (!value) return EventCategory.Other;
  const str = String(value).toLowerCase().trim();
  const map: Record<string, EventCategory> = {
    school: EventCategory.School,
    sports: EventCategory.Sports,
    sport: EventCategory.Sports,
    medical: EventCategory.Medical,
    health: EventCategory.Medical,
    doctor: EventCategory.Medical,
    vacation: EventCategory.Vacation,
    holiday: EventCategory.Vacation,
    birthday: EventCategory.Birthday,
    bday: EventCategory.Birthday,
    other: EventCategory.Other,
  };
  return map[str] ?? EventCategory.Other;
}

function buildDateTime(dateStr: string, timeStr: string | null): string {
  if (!timeStr) {
    return `${dateStr}T00:00:00.000Z`;
  }
  // Return as local time string that can be stored as-is
  return `${dateStr}T${timeStr}:00`;
}

export function parseSpreadsheet(fileBuffer: ArrayBuffer): ParsedEventRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) return [];

  const results: ParsedEventRow[] = [];

  for (const rawRow of rows) {
    // Normalize keys
    const row: RawRow = {};
    for (const [key, val] of Object.entries(rawRow)) {
      row[normalizeKey(key)] = val;
    }

    const title = String(row['title'] ?? row['name'] ?? row['event'] ?? '').trim();
    if (!title) continue; // Skip rows without a title

    const startDateStr = parseDate(row['start_date'] ?? row['date'] ?? row['start']);
    if (!startDateStr) continue; // Skip rows without a date

    const endDateStr = parseDate(row['end_date'] ?? row['end'] ?? '') ?? startDateStr;

    const startTimeStr = parseTime(row['start_time'] ?? row['time'] ?? '');
    const endTimeStr = parseTime(row['end_time'] ?? '');

    const allDay = row['all_day'] !== undefined
      ? parseBool(row['all_day'])
      : !startTimeStr;

    const startAt = allDay
      ? `${startDateStr}T00:00:00.000Z`
      : buildDateTime(startDateStr, startTimeStr);

    const endAt = allDay
      ? `${endDateStr}T23:59:59.000Z`
      : buildDateTime(endDateStr, endTimeStr ?? startTimeStr);

    const location = String(row['location'] ?? row['place'] ?? '').trim() || undefined;
    const description = String(row['description'] ?? row['notes'] ?? row['note'] ?? '').trim() || undefined;
    const category = parseCategory(row['category'] ?? row['type'] ?? '');

    // Parse assigned_to as comma-separated list
    const assignedRaw = String(row['assigned_to'] ?? row['assigned'] ?? row['member'] ?? '').trim();
    const assigned_to = assignedRaw
      ? assignedRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    results.push({
      title,
      start_at: startAt,
      end_at: endAt,
      all_day: allDay,
      location,
      description,
      category,
      assigned_to,
    });
  }

  return results.slice(0, 500); // Enforce max limit
}
