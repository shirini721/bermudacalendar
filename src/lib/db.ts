import fs from 'fs';
import path from 'path';
import type { Event } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'events.json');

export function readEvents(): Event[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Event[];
  } catch {
    return [];
  }
}

export function writeEvents(events: Event[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2));
}
