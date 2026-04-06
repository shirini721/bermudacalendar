'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, FileText, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { Event } from '@/types';
import { EventCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import clsx from 'clsx';

interface EventModalProps {
  event?: Event | null;
  defaultStart?: Date;
  onClose: () => void;
  onSaved: (event: Event) => void;
  onDeleted?: (eventId: string) => void;
}

function formatDateLocal(isoString: string): string {
  return isoString.substring(0, 10);
}

function formatTimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventModal({ event, defaultStart, onClose, onSaved, onDeleted }: EventModalProps) {
  const isEditing = !!event;

  const defaultStartDate = event ? formatDateLocal(event.start_at)
    : defaultStart ? format(defaultStart, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const defaultEndDate = event ? formatDateLocal(event.end_at)
    : defaultStart ? format(defaultStart, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [startTime, setStartTime] = useState(event && !event.all_day ? formatTimeLocal(event.start_at) : '09:00');
  const [endTime, setEndTime] = useState(event && !event.all_day ? formatTimeLocal(event.end_at) : '10:00');
  const [allDay, setAllDay] = useState(event?.all_day ?? true);
  const [category, setCategory] = useState<EventCategory>(event?.category ?? EventCategory.Other);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const start_at = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const end_at = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;

    const payload = { title: title.trim(), description: description.trim() || null, location: location.trim() || null, start_at, end_at, all_day: allDay, category };

    try {
      const res = await fetch(isEditing ? `/api/events/${event.id}` : '/api/events', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save event');
      onSaved(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event || !onDeleted) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted(event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="label">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Soccer Practice" className="input-field text-base font-medium" required autoFocus />
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Category</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(EventCategory).map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={clsx('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                    category === cat ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}
                  style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">All Day Event</span>
            </div>
            <button type="button" role="switch" aria-checked={allDay} onClick={() => setAllDay(!allDay)}
              className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200', allDay ? 'bg-brand-600' : 'bg-gray-200')}>
              <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200', allDay ? 'translate-x-4' : 'translate-x-0')} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className="input-field" required />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="input-field" required />
            </div>
            {!allDay && (
              <>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field" />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Central Park" className="input-field" />
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any notes or details..." rows={3} className="input-field resize-none" />
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex items-center gap-3 pt-1">
            {isEditing && onDeleted && (
              confirmDelete
                ? <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger">{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
                : <button type="button" onClick={() => setConfirmDelete(true)} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">Delete</button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
