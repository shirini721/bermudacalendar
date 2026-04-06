'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { X, MapPin, AlignLeft, Plus, Trash2, CheckSquare } from 'lucide-react';
import type { CalEvent, ChecklistItem, Person } from '@/types';
import { PERSON_COLORS, CATEGORY_COLORS } from '@/types';

type Category = CalEvent['category'];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'sports', label: 'Sports' },
  { value: 'medical', label: 'Medical' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'other', label: 'Other' },
];

const PEOPLE: { value: Person; label: string }[] = [
  { value: 'pete', label: 'Pete' },
  { value: 'parnia', label: 'Parnia' },
  { value: 'both', label: 'Both' },
  { value: null, label: 'Neither' },
];

function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toTimeInput(iso: string | undefined): string {
  if (!iso || !iso.includes('T')) return '';
  return iso.slice(11, 16);
}

function buildIso(date: string, time: string, allDay: boolean): string {
  if (!date) return new Date().toISOString();
  if (allDay || !time) return date;
  return `${date}T${time}:00`;
}

interface Props {
  event?: CalEvent | null;
  defaultDate?: string | null;
  onClose: () => void;
  onSave: (event: CalEvent) => void;
  onDelete?: (id: string) => void;
}

export default function EventModal({ event, defaultDate, onClose, onSave, onDelete }: Props) {
  const isEditing = !!event;
  const today = toDateInput(new Date().toISOString());

  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState<Category>(event?.category ?? 'other');
  const [person, setPerson] = useState<Person>(event?.person ?? null);
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startDate, setStartDate] = useState(event ? toDateInput(event.start) : (defaultDate ?? today));
  const [endDate, setEndDate] = useState(event ? toDateInput(event.end) : (defaultDate ?? today));
  const [startTime, setStartTime] = useState(event ? toTimeInput(event.start) : '09:00');
  const [endTime, setEndTime] = useState(event ? toTimeInput(event.end) : '10:00');
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event?.checklist ?? []);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  function addChecklistItem() {
    const text = newItem.trim();
    if (!text) return;
    setChecklist(prev => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewItem('');
  }

  function toggleItem(id: string) {
    setChecklist(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }

  function removeItem(id: string) {
    setChecklist(prev => prev.filter(i => i.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setError('');
    setSaving(true);

    const payload = {
      title: title.trim(),
      category,
      person,
      allDay,
      start: buildIso(startDate, startTime, allDay),
      end: buildIso(endDate || startDate, endTime || startTime, allDay),
      location: location.trim() || null,
      description: description.trim() || null,
      checklist: checklist.length > 0 ? checklist : null,
      color: null,
    };

    try {
      const url = isEditing ? `/api/events/${event.id}` : '/api/events';
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      onSave(data.event);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDelete?.(event.id);
      onClose();
    } catch {
      setError('Failed to delete. Please try again.');
      setSaving(false);
    }
  }

  const showChecklist = category === 'vacation' || checklist.length > 0;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-gray-900">{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="label" htmlFor="ev-title">Title *</label>
            <input id="ev-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="input-field" placeholder="Event title" autoFocus required />
          </div>

          {/* Person */}
          <div>
            <span className="label">Who</span>
            <div className="flex gap-2">
              {PEOPLE.map(p => {
                const color = p.value ? PERSON_COLORS[p.value] : '#9ca3af';
                const selected = person === p.value;
                return (
                  <button key={String(p.value)} type="button" onClick={() => setPerson(p.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                    style={selected
                      ? { backgroundColor: color, color: '#fff', borderColor: color }
                      : { backgroundColor: 'transparent', color: color, borderColor: color }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <span className="label">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const color = CATEGORY_COLORS[cat.value];
                const selected = category === cat.value;
                return (
                  <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                    style={selected
                      ? { backgroundColor: color, color: '#fff', borderColor: color }
                      : { backgroundColor: 'transparent', color: color, borderColor: color }}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <button type="button" role="switch" aria-checked={allDay} onClick={() => setAllDay(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${allDay ? 'bg-brand-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${allDay ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700">All day</span>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ev-start">Start date</label>
              <input id="ev-start" type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
                className="input-field" required />
            </div>
            <div>
              <label className="label" htmlFor="ev-end">End date</label>
              <input id="ev-end" type="date" value={endDate} min={startDate}
                onChange={e => setEndDate(e.target.value)} className="input-field" />
            </div>
            {!allDay && (
              <>
                <div>
                  <label className="label">Start time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">End time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field" />
                </div>
              </>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="label flex items-center gap-1"><MapPin className="w-3 h-3" />Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="input-field" placeholder="e.g. JFK Airport" />
          </div>

          {/* Notes */}
          <div>
            <label className="label flex items-center gap-1"><AlignLeft className="w-3 h-3" />Notes</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input-field resize-none" rows={3} placeholder="Any details..." />
          </div>

          {/* Packing List — shown for vacation or if items exist */}
          {showChecklist && (
            <div>
              <label className="label flex items-center gap-1.5 mb-2">
                <CheckSquare className="w-3 h-3" />
                Packing List
                {checklist.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">
                    {checklist.filter(i => i.done).length}/{checklist.length} packed
                  </span>
                )}
              </label>

              {checklist.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {checklist.map(item => (
                    <li key={item.id} className="flex items-center gap-2 group">
                      <button type="button" onClick={() => toggleItem(item.id)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-brand-600 border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}>
                        {item.done && <span className="text-white text-[10px]">✓</span>}
                      </button>
                      <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.text}
                      </span>
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                  className="input-field flex-1" placeholder="Add item (e.g. passports)" />
                <button type="button" onClick={addChecklistItem}
                  className="btn-secondary px-3 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isEditing && onDelete && (
              confirmDelete
                ? <button type="button" onClick={handleDelete} disabled={saving}
                    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                    {saving ? 'Deleting…' : 'Confirm delete'}
                  </button>
                : <button type="button" onClick={() => setConfirmDelete(true)}
                    className="btn-secondary text-red-500 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
