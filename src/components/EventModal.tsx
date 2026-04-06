'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { X, Trash2, MapPin, AlignLeft } from 'lucide-react';
import type { CalEvent } from '@/types';

type Category = CalEvent['category'];

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'school', label: 'School', color: '#6366f1' },
  { value: 'sports', label: 'Sports', color: '#10b981' },
  { value: 'medical', label: 'Medical', color: '#ef4444' },
  { value: 'vacation', label: 'Vacation', color: '#f59e0b' },
  { value: 'birthday', label: 'Birthday', color: '#ec4899' },
  { value: 'other', label: 'Other', color: '#6b7280' },
];

interface EventModalProps {
  event?: CalEvent | null;
  defaultDate?: string | null;
  onClose: () => void;
  onSave: (event: CalEvent) => void;
  onDelete?: (id: string) => void;
}

function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toTimeInput(iso: string | undefined): string {
  if (!iso || !iso.includes('T')) return '';
  return iso.slice(11, 16);
}

export default function EventModal({ event, defaultDate, onClose, onSave, onDelete }: EventModalProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState<Category>(event?.category ?? 'other');
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startDate, setStartDate] = useState(
    event ? toDateInput(event.start) : (defaultDate ?? toDateInput(new Date().toISOString()))
  );
  const [endDate, setEndDate] = useState(
    event ? toDateInput(event.end) : (defaultDate ?? toDateInput(new Date().toISOString()))
  );
  const [startTime, setStartTime] = useState(event ? toTimeInput(event.start) : '09:00');
  const [endTime, setEndTime] = useState(event ? toTimeInput(event.end) : '10:00');
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  function buildIso(date: string, time: string, isAllDay: boolean): string {
    if (!date) return new Date().toISOString();
    if (isAllDay || !time) return date;
    return `${date}T${time}:00`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!startDate) {
      setError('Start date is required.');
      return;
    }
    setError('');
    setSaving(true);

    const payload = {
      title: title.trim(),
      category,
      allDay,
      start: buildIso(startDate, startTime, allDay),
      end: buildIso(endDate || startDate, endTime || startTime, allDay),
      location: location.trim() || null,
      description: description.trim() || null,
      color: null,
    };

    try {
      let res: Response;
      if (isEditing && event) {
        res = await fetch(`/api/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      onSave(data.event);
      onClose();
    } catch {
      setError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete?.(event.id);
      onClose();
    } catch {
      setError('Failed to delete event. Please try again.');
      setSaving(false);
    }
  }

  const catInfo = CATEGORIES.find(c => c.value === category);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="label" htmlFor="ev-title">Title *</label>
            <input
              id="ev-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              placeholder="Event title"
              autoFocus
              required
            />
          </div>

          {/* Category pills */}
          <div>
            <span className="label">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                  style={
                    category === cat.value
                      ? { backgroundColor: cat.color, color: '#fff', borderColor: cat.color }
                      : { backgroundColor: 'transparent', color: cat.color, borderColor: cat.color }
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={allDay}
              onClick={() => setAllDay(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                allDay ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  allDay ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">All day</span>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ev-start-date">Start date</label>
              <input
                id="ev-start-date"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="ev-end-date">End date</label>
              <input
                id="ev-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Times */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="ev-start-time">Start time</label>
                <input
                  id="ev-start-time"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label" htmlFor="ev-end-time">End time</label>
                <input
                  id="ev-end-time"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="label" htmlFor="ev-location">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="ev-location"
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="input-field pl-9"
                placeholder="Optional location"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label" htmlFor="ev-notes">Notes</label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <textarea
                id="ev-notes"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="input-field pl-9 resize-none"
                placeholder="Optional notes or description"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isEditing && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-xs text-red-600 font-medium">Delete this event?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mr-auto p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {!confirmDelete && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary ml-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                  style={{ backgroundColor: catInfo?.color, borderColor: catInfo?.color }}
                >
                  {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add event'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
