import * as XLSX from 'xlsx';
import type { CalEvent } from '@/types';

type Category = CalEvent['category'];

function categorize(text: string): Category {
  const lower = text.toLowerCase();
  if (/doctor|dentist|pediatric|vaccine|dr\.|physician|appointment|medical|clinic|hospital/.test(lower)) return 'medical';
  if (/flight|hotel|check.?in|check.?out|trip|travel|airport|airbnb|resort|cruise|vacation/.test(lower)) return 'vacation';
  if (/game|tennis|yoga|golf|kayak|boat|soccer|swim|practice|tournament|sport|league|lacrosse|hockey|basketball|baseball|softball|football|volleyball|ski|skiing/.test(lower)) return 'sports';
  if (/birthday|born|bday/.test(lower)) return 'birthday';
  if (/school|class|panel|conference|graduation|prom|exam|semester|homework|college|university|campus/.test(lower)) return 'school';
  return 'other';
}

function extractTime(text: string): { hour: number; minute: number } | null {
  const match = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
  if (!match) {
    const shortMatch = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (shortMatch) {
      let hour = parseInt(shortMatch[1], 10);
      const meridiem = shortMatch[2].toLowerCase();
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return { hour, minute: 0 };
    }
    return null;
  }
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

function buildDateString(year: number, month: number, day: number, time: { hour: number; minute: number } | null, allDay: boolean): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  if (allDay || !time) return `${year}-${mm}-${dd}`;
  const hh = String(time.hour).padStart(2, '0');
  const min = String(time.minute).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${min}:00`;
}

function makeEvent(month: number, day: number, year: number, desc: string): CalEvent {
  const timeInfo = extractTime(desc);
  const allDay = timeInfo === null;
  const start = buildDateString(year, month, day, timeInfo, allDay);
  const end = allDay
    ? start
    : buildDateString(year, month, day, { hour: timeInfo!.hour + 1, minute: timeInfo!.minute }, false);
  const title = (desc.split(/[,;\n]/)[0] || desc).trim().slice(0, 90) || `Event ${month}/${day}`;
  return {
    id: crypto.randomUUID(),
    title,
    description: desc || null,
    start,
    end,
    allDay,
    location: null,
    category: categorize(desc),
    color: null,
    person: null,
    checklist: null,
    createdAt: new Date().toISOString(),
  };
}

// Extract all date-prefixed events from a block of text.
// Lines like "11/26: ..." or "11/26 (Mon): ..." each become an event.
// Lines like "July 14 (Tuesday): ..." are also matched.
function extractEventsFromText(text: string, fallbackMonth: number, fallbackDay: number, year: number): Array<{ month: number; day: number; desc: string }> {
  const results: Array<{ month: number; day: number; desc: string }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const MONTH_MAP: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Numeric: 11/26: desc  or  11/26 (Mon): desc
    const numericMatch = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s*(?:\([^)]*\))?\s*[:\-]?\s*(.*)/);
    if (numericMatch) {
      const m = parseInt(numericMatch[1], 10);
      const d = parseInt(numericMatch[2], 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        let desc = numericMatch[3].trim();
        i++;
        // Collect continuation lines
        while (i < lines.length) {
          const next = lines[i];
          if (/^\d{1,2}\/\d{1,2}/.test(next) || /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/i.test(next)) break;
          if (next) desc += (desc ? ' ' : '') + next;
          i++;
        }
        results.push({ month: m, day: d, desc });
        continue;
      }
    }

    // Named month: "July 14 (Tuesday): desc"  or  "July 14: desc"
    const namedMatch = line.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*\([^)]*\))?\s*[:\-]?\s*(.*)/i);
    if (namedMatch) {
      const m = MONTH_MAP[namedMatch[1].toLowerCase()];
      const d = parseInt(namedMatch[2], 10);
      let desc = namedMatch[3].trim();
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (/^\d{1,2}\/\d{1,2}/.test(next) || /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d/i.test(next)) break;
        if (next) desc += (desc ? ' ' : '') + next;
        i++;
      }
      if (desc) results.push({ month: m, day: d, desc });
      continue;
    }

    // Weekday-only line like "(Tuesday): Parnia goes to paint tiles"
    const weekdayMatch = line.match(/^\([^)]*\)\s*[:\-]\s*(.*)/);
    if (weekdayMatch && weekdayMatch[1].trim()) {
      results.push({ month: fallbackMonth, day: fallbackDay, desc: weekdayMatch[1].trim() });
    }

    i++;
  }

  return results;
}

function parseCalendarSheet(rows: string[][]): CalEvent[] {
  const events: CalEvent[] = [];
  let currentYear = new Date().getFullYear();
  let lastMonth = -1;

  for (const row of rows) {
    const colA = String(row[0] || '').trim();
    const colB = String(row[1] || '').trim();

    // Extract explicit year from either column
    const yearMatch = (colA + ' ' + colB).match(/\b(20\d{2})\b/);
    if (yearMatch) currentYear = parseInt(yearMatch[1], 10);

    if (!colA && !colB) continue;

    // --- Pattern 1: col A has a date like "12/2" or "9/5/2025", col B has description ---
    const colADateMatch = colA.split('\n')[0].trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (colADateMatch && colB) {
      const month = parseInt(colADateMatch[1], 10);
      const day = parseInt(colADateMatch[2], 10);
      if (colADateMatch[3]) {
        let yr = parseInt(colADateMatch[3], 10);
        if (yr < 100) yr += 2000;
        currentYear = yr;
      }
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Track year rollover
        if (lastMonth >= 11 && month <= 3) currentYear++;
        lastMonth = month;

        // col B may contain multiple sub-events with their own dates
        const subEvents = extractEventsFromText(colB, month, day, currentYear);
        if (subEvents.length > 0) {
          for (const se of subEvents) {
            if (lastMonth >= 11 && se.month <= 3) currentYear++;
            lastMonth = se.month;
            if (se.desc) events.push(makeEvent(se.month, se.day, currentYear, se.desc));
          }
        } else {
          // Treat the whole col B as one event on the col A date
          const desc = colB.replace(/\n/g, ' ').trim();
          // Strip leading weekday like "(Monday): "
          const cleaned = desc.replace(/^\([^)]*\)\s*[:\-]\s*/, '').trim();
          if (cleaned) events.push(makeEvent(month, day, currentYear, cleaned));
        }
        continue;
      }
    }

    // --- Pattern 2: col B starts with a date like "11/26: ..." ---
    if (colB) {
      const subEvents = extractEventsFromText(colB, -1, -1, currentYear);
      for (const se of subEvents) {
        if (se.month < 1) continue;
        if (lastMonth >= 11 && se.month <= 3) currentYear++;
        lastMonth = se.month;
        if (se.desc) events.push(makeEvent(se.month, se.day, currentYear, se.desc));
      }
    }
  }

  return events;
}

function isStandardFormat(headers: string[]): boolean {
  const hLower = headers.map(h => String(h || '').toLowerCase().trim());
  const hasTitle = hLower.some(h => h.includes('title') || h.includes('name') || h.includes('event') || h.includes('subject'));
  const hasDate = hLower.some(h => h.includes('start') || h.includes('date') || h.includes('begin'));
  return hasTitle && hasDate;
}

function parseStandardFormat(rows: string[][], headers: string[]): CalEvent[] {
  const events: CalEvent[] = [];
  const hLower = headers.map(h => String(h || '').toLowerCase().trim());

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = hLower.findIndex(h => h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const titleIdx = idx(['title', 'name', 'event', 'subject']);
  const startIdx = idx(['start_date', 'start date', 'start', 'date', 'begin']);
  const endIdx = idx(['end_date', 'end date', 'end', 'finish']);
  const locationIdx = idx(['location', 'place', 'venue']);
  const descIdx = idx(['description', 'desc', 'notes', 'note', 'details']);
  const categoryIdx = idx(['category', 'cat', 'type']);
  const allDayIdx = idx(['all_day', 'all day', 'allday']);

  for (const row of rows) {
    if (!row || row.every(c => !c)) continue;
    const title = titleIdx >= 0 ? String(row[titleIdx] || '').trim() : '';
    if (!title) continue;
    const rawStart = startIdx >= 0 ? String(row[startIdx] || '').trim() : '';
    const rawEnd = endIdx >= 0 ? String(row[endIdx] || '').trim() : rawStart;
    if (!rawStart) continue;

    const parseDate = (raw: string): string => {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString();
      return raw;
    };

    const start = parseDate(rawStart);
    const end = rawEnd ? parseDate(rawEnd) : start;
    const rawCategory = categoryIdx >= 0 ? String(row[categoryIdx] || '').toLowerCase().trim() : '';
    const validCategories: Category[] = ['school', 'sports', 'medical', 'vacation', 'birthday', 'other'];
    const category: Category = validCategories.includes(rawCategory as Category)
      ? (rawCategory as Category)
      : categorize(title + ' ' + (descIdx >= 0 ? String(row[descIdx] || '') : ''));

    const rawAllDay = allDayIdx >= 0 ? String(row[allDayIdx] || '').toLowerCase() : '';
    const allDay = rawAllDay === 'true' || rawAllDay === 'yes' || rawAllDay === '1'
      ? true : rawAllDay === 'false' || rawAllDay === 'no' || rawAllDay === '0'
        ? false : !rawStart.includes(':');

    events.push({
      id: crypto.randomUUID(),
      title,
      description: descIdx >= 0 ? (String(row[descIdx] || '').trim() || null) : null,
      start,
      end,
      allDay,
      location: locationIdx >= 0 ? (String(row[locationIdx] || '').trim() || null) : null,
      category,
      color: null,
      person: null,
      checklist: null,
      createdAt: new Date().toISOString(),
    });
  }

  return events;
}

export function parseSpreadsheet(buffer: ArrayBuffer): CalEvent[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: true });

  // Prefer a sheet named "Calendar" if present
  const calendarSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'calendar') ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[calendarSheetName];

  const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  if (rawRows.length === 0) return [];

  // Check if first non-empty row looks like standard column headers
  const firstRow = rawRows[0];
  if (isStandardFormat(firstRow)) {
    return parseStandardFormat(rawRows.slice(1), firstRow);
  }

  // Otherwise treat as the tracker/calendar format
  return parseCalendarSheet(rawRows);
}
