import * as XLSX from 'xlsx';
import { EventCategory, type ParsedEventRow } from '@/types';

type RawRow = Record<string, unknown>;

// ─── Standard column-based format helpers ────────────────────────────────────

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '_').trim();
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
    const mdy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  }
  return null;
}

function parseTime(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hms = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hms) return `${hms[1].padStart(2, '0')}:${hms[2]}`;
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
  if (typeof value === 'string') return ['yes', 'true', '1', 'y'].includes(value.toLowerCase().trim());
  return false;
}

function parseCategory(value: unknown): EventCategory {
  if (!value) return EventCategory.Other;
  const str = String(value).toLowerCase().trim();
  const map: Record<string, EventCategory> = {
    school: EventCategory.School, sports: EventCategory.Sports, sport: EventCategory.Sports,
    medical: EventCategory.Medical, health: EventCategory.Medical, doctor: EventCategory.Medical,
    vacation: EventCategory.Vacation, holiday: EventCategory.Vacation,
    birthday: EventCategory.Birthday, bday: EventCategory.Birthday, other: EventCategory.Other,
  };
  return map[str] ?? EventCategory.Other;
}

function buildDateTime(dateStr: string, timeStr: string | null): string {
  if (!timeStr) return `${dateStr}T00:00:00.000Z`;
  return `${dateStr}T${timeStr}:00`;
}

// ─── Weekly tracker format helpers ───────────────────────────────────────────

// Matches: "12/2", "12/2 (Monday):", "12/2:", "1/27 Wednesday train..." etc.
const DATE_LINE_RE = /^(\d{1,2})\/(\d{1,2})(?:\s*\([^)]*\))?[:\s]/;

// Extract first time mention from a description, e.g. "7:30am", "6:45pm", "3:01pm"
const TIME_IN_TEXT_RE = /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i;

function guessCategory(text: string): EventCategory {
  const t = text.toLowerCase();
  if (/doctor|pediatric|appointment|appt|gyno|physical|dentist|vaccine|shot|ob-gyn|medical|hospital|clinic/.test(t)) return EventCategory.Medical;
  if (/birthday|born|bday/.test(t)) return EventCategory.Birthday;
  if (/flight|hotel|check.?in|check.?out|depart|arrive|trip|travel|airbnb|resort|drive to|pick up car|rental/.test(t)) return EventCategory.Vacation;
  if (/game|basketball|football|tennis|yoga|golf|run|workout|soccer|sports|kayak|boat|bird tour|archery/.test(t)) return EventCategory.Sports;
  if (/school|class|panel|conference|lecture|seminar|event|summit|colloquy/.test(t)) return EventCategory.School;
  return EventCategory.Other;
}

function extractTimeFromText(text: string): string | null {
  const m = text.match(TIME_IN_TEXT_RE);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2];
  const meridiem = m[3].toLowerCase();
  if (meridiem === 'pm' && hours !== 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function makeDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Detect if the sheet looks like the "weekly tracker" format:
 * 2 columns, column B contains multi-line text with M/D date patterns.
 */
function isWeeklyTrackerFormat(rawRows: unknown[][]): boolean {
  if (rawRows.length < 2) return false;
  let dateLineCount = 0;
  for (const row of rawRows.slice(0, 20)) {
    const b = String(row[1] ?? '');
    if (b.includes('\n')) {
      const lines = b.split('\n');
      for (const line of lines) {
        if (DATE_LINE_RE.test(line.trim())) dateLineCount++;
      }
    }
    // Also check if col A looks like a date/week reference
    const a = String(row[0] ?? '');
    if (/\d{1,2}\/\d{1,2}/.test(a)) dateLineCount++;
  }
  return dateLineCount >= 3;
}

/**
 * Extract an explicit 4-digit year from a cell string.
 */
function extractYear(text: string): number | null {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1]) : null;
}

/**
 * Parse the "weekly tracker" 2-column format.
 * Col A = week/period header; Col B = multi-line event descriptions.
 */
function parseWeeklyTracker(rawRows: unknown[][]): ParsedEventRow[] {
  const events: ParsedEventRow[] = [];

  // Find the earliest explicit year in any column A header
  let currentYear = new Date().getFullYear();
  for (const row of rawRows) {
    const y = extractYear(String(row[0] ?? ''));
    if (y) { currentYear = y; break; }
    const y2 = extractYear(String(row[1] ?? ''));
    if (y2) { currentYear = y2; break; }
  }
  // If no explicit year found, assume data starts ~1 year ago (common for trackers)
  // We'll let the month-rollover logic handle the rest.

  let lastMonth = 0;

  for (const row of rawRows) {
    const colA = String(row[0] ?? '').trim();
    const colB = String(row[1] ?? '').trim();

    // Check if col A itself contains an explicit year anchor
    const yearAnchor = extractYear(colA) ?? extractYear(colB);
    if (yearAnchor) currentYear = yearAnchor;

    // Also check col A for a simple date like "12/5" or "4/17" as the week marker
    const colADateMatch = colA.match(/^(\d{1,2})\/(\d{1,2})/);
    if (colADateMatch) {
      const headerMonth = parseInt(colADateMatch[1]);
      // Detect year rollover from the week headers themselves
      if (lastMonth > 10 && headerMonth <= 3) currentYear++;
      if (headerMonth > lastMonth + 1 && lastMonth !== 0 && headerMonth < lastMonth) currentYear++;
      lastMonth = Math.max(lastMonth, headerMonth);
    }

    const text = colB || colA;
    if (!text) continue;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^(\d{1,2})\/(\d{1,2})(?:\s*\([^)]*\))?[:\s](.+)/s);
      if (!match) continue;

      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const rawDesc = match[3].replace(/^[:\s]+/, '').trim();

      // Detect year rollover: if month drops significantly (e.g. Dec→Jan)
      if (lastMonth > 10 && month <= 3) currentYear++;

      lastMonth = month;

      const dateStr = makeDateISO(currentYear, month, day);

      // Extract first time from the description for a more precise event time
      const timeStr = extractTimeFromText(rawDesc);

      // Title = first sentence/clause (up to first period, newline, or 80 chars)
      const titleRaw = rawDesc.split(/\n/)[0].replace(/["]+/g, '').trim();
      const title = titleRaw.length > 90 ? titleRaw.substring(0, 87) + '…' : titleRaw;

      const startAt = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00.000Z`;
      const endAt = timeStr
        ? `${dateStr}T${timeStr}:00` // same time; calendar will show as point event
        : `${dateStr}T23:59:59.000Z`;

      events.push({
        title: title || `Event ${month}/${day}`,
        description: rawDesc,
        start_at: startAt,
        end_at: endAt,
        all_day: !timeStr,
        location: undefined,
        category: guessCategory(rawDesc),
        assigned_to: undefined,
      });
    }
  }

  return events;
}

// ─── Standard column-based parser ────────────────────────────────────────────

function parseStandardFormat(rows: RawRow[]): ParsedEventRow[] {
  const results: ParsedEventRow[] = [];

  for (const rawRow of rows) {
    const row: RawRow = {};
    for (const [key, val] of Object.entries(rawRow)) {
      row[normalizeKey(key)] = val;
    }

    const title = String(row['title'] ?? row['name'] ?? row['event'] ?? '').trim();
    if (!title) continue;

    const startDateStr = parseDate(row['start_date'] ?? row['date'] ?? row['start']);
    if (!startDateStr) continue;

    const endDateStr = parseDate(row['end_date'] ?? row['end'] ?? '') ?? startDateStr;
    const startTimeStr = parseTime(row['start_time'] ?? row['time'] ?? '');
    const endTimeStr = parseTime(row['end_time'] ?? '');
    const allDay = row['all_day'] !== undefined ? parseBool(row['all_day']) : !startTimeStr;

    const startAt = allDay ? `${startDateStr}T00:00:00.000Z` : buildDateTime(startDateStr, startTimeStr);
    const endAt = allDay ? `${endDateStr}T23:59:59.000Z` : buildDateTime(endDateStr, endTimeStr ?? startTimeStr);

    const location = String(row['location'] ?? row['place'] ?? '').trim() || undefined;
    const description = String(row['description'] ?? row['notes'] ?? row['note'] ?? '').trim() || undefined;
    const category = parseCategory(row['category'] ?? row['type'] ?? '');
    const assignedRaw = String(row['assigned_to'] ?? row['assigned'] ?? row['member'] ?? '').trim();
    const assigned_to = assignedRaw ? assignedRaw.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    results.push({ title, start_at: startAt, end_at: endAt, all_day: allDay, location, description, category, assigned_to });
  }

  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseSpreadsheet(fileBuffer: ArrayBuffer): ParsedEventRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read as raw 2D array to check format
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length === 0) return [];

  if (isWeeklyTrackerFormat(rawRows)) {
    return parseWeeklyTracker(rawRows).slice(0, 500);
  }

  // Fall back to standard column format
  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return parseStandardFormat(rows).slice(0, 500);
}
