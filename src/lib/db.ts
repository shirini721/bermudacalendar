import fs from 'fs';
import path from 'path';
import type { CalEvent } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'events.json');

export function getEvents(): CalEvent[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: CalEvent[]): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
}
