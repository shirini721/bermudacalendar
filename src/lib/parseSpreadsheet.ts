import * as XLSX from 'xlsx';
import type { CalEvent } from '@/types';

type Category = CalEvent['category'];

function categorize(text: string): Category {
  const lower = text.toLowerCase();
  if (/doctor|dentist|pediatric|vaccine|dr\.|physician|appointment|medical|clinic|hospital/.test(lower)) return 'medical';
  if (/flight|hotel|check.?in|check.?out|trip|travel|airport|airbnb|resort|cruise|vacation/.test(lower)) return 'vacation';
  if (/game|tennis|yoga|golf|kayak|boat|soccer|swim|swim|practice|tournament|sport|league|lacrosse|hockey|basketball|baseball|softball|football|volleyball|ski|skiing/.test(lower)) return 'sports';
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
  if (allDay || !time) {
    return `${year}-${mm}-${dd}`;
  }
  const hh = String(time.hour).padStart(2, '0');
  const min = String(time.minute).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${min}:00`;
}

function isWeeklyTrackerFormat(rows: string[][]): boolean {
  if (rows.length < 3) return false;
  let datePatternCount = 0;
  for (const row of rows) {
    const cellB = row[1] || '';
    const lines = cellB.split('\n');
    for (const line of lines) {
      if (/^\d{1,2}\/\d{1,2}/.test(line.trim())) {
        datePatternCount++;
      }
    }
  }
  return datePatternCount >= 3;
}

function parseWeeklyTracker(rows: string[][]): CalEvent[] {
  const events: CalEvent[] = [];
  let currentYear = new Date().getFullYear();
  let lastMonth = -1;

  for (const row of rows) {
    const colA = String(row[0] || '').trim();
    const colB = String(row[1] || '').trim();

    // Try to extract explicit year from col A
    const yearMatch = colA.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1], 10);
    }

    if (!colB) continue;

    const lines = colB.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      // Match lines like: 9/5 or 9/15 or 9/5 (Mon): or 9/5 (Monday) -
      const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})(?:\s*\([^)]*\))?\s*[:\-]?\s*(.*)/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1], 10);
        const day = parseInt(dateMatch[2], 10);
        let descLines = dateMatch[3] ? [dateMatch[3].trim()] : [];

        // Collect continuation lines that don't start with a new date pattern
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (/^\d{1,2}\/\d{1,2}/.test(next)) break;
          if (next) descLines.push(next);
          i++;
        }

        // Track month transitions for year increment
        if (lastMonth >= 11 && month <= 3) {
          currentYear++;
        }
        lastMonth = month;

        const fullDesc = descLines.join(' ').trim();
        const timeInfo = extractTime(fullDesc);
        const allDay = timeInfo === null;

        const startStr = buildDateString(currentYear, month, day, timeInfo, allDay);
        const endStr = allDay
          ? buildDateString(currentYear, month, day, null, true)
          : buildDateString(currentYear, month, day, { hour: timeInfo!.hour + 1, minute: timeInfo!.minute }, false);

        const title = (fullDesc.split(/[,\n]/)[0] || fullDesc).trim().slice(0, 90) || `Event ${month}/${day}`;

        events.push({
          id: crypto.randomUUID(),
          title,
          description: fullDesc || null,
          start: startStr,
          end: endStr,
          allDay,
          location: null,
          category: categorize(fullDesc),
          color: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        i++;
      }
    }
  }

  return events;
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

    // Try to parse dates
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
      ? true
      : rawAllDay === 'false' || rawAllDay === 'no' || rawAllDay === '0'
        ? false
        : !rawStart.includes(':');

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
      createdAt: new Date().toISOString(),
    });
  }

  return events;
}

export function parseSpreadsheet(buffer: ArrayBuffer): CalEvent[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get as array of arrays with raw strings
  const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  if (rawRows.length === 0) return [];

  // Check for weekly tracker format
  if (isWeeklyTrackerFormat(rawRows)) {
    return parseWeeklyTracker(rawRows);
  }

  // Standard format: first row is headers
  const headers = rawRows[0];
  const dataRows = rawRows.slice(1);
  return parseStandardFormat(dataRows, headers);
}
