'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseSpreadsheet } from '@/lib/parseSpreadsheet';
import type { ParsedEventRow } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ImportUploadProps {
  familyGroupId: string;
  userId: string;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error';

export default function ImportUpload({ familyGroupId, userId }: ImportUploadProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [parsedEvents, setParsedEvents] = useState<ParsedEventRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('parsing');
    setErrorMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const events = parseSpreadsheet(buffer);

      if (events.length === 0) {
        throw new Error('No valid events found. Make sure your file has a "title" column and "start_date" column.');
      }

      setParsedEvents(events);
      setStatus('preview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to parse file');
      setStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.csv'],
    },
    maxFiles: 1,
    disabled: status === 'importing' || status === 'success',
  });

  async function handleConfirmImport() {
    setStatus('importing');
    setErrorMessage('');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: parsedEvents,
          familyGroupId,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Import failed');
      }

      setImportedCount(data.count ?? parsedEvents.length);
      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }

  function handleReset() {
    setStatus('idle');
    setFileName('');
    setParsedEvents([]);
    setErrorMessage('');
    setImportedCount(0);
  }

  function formatPreviewDate(isoStr: string): string {
    try {
      return format(new Date(isoStr), 'MMM d, yyyy');
    } catch {
      return isoStr;
    }
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Successful!</h3>
        <p className="text-gray-600 mb-6">
          {importedCount} event{importedCount !== 1 ? 's' : ''} have been added to your family calendar.
          Family members will receive an email notification.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={handleReset} className="btn-secondary">
            Import More
          </button>
          <a href="/calendar" className="btn-primary">
            View Calendar
          </a>
        </div>
      </div>
    );
  }

  // Preview state
  if (status === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            <span className="font-medium text-gray-900">{fileName}</span>
            <span className="text-sm text-gray-500">({parsedEvents.length} events found)</span>
          </div>
          <button onClick={handleReset} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Table */}
        <div className="overflow-auto max-h-96 rounded-lg border border-gray-200 mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Title</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Start</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">End</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Category</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Location</th>
                <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">All Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parsedEvents.map((ev, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate">
                    {ev.title}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {formatPreviewDate(ev.start_at)}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {formatPreviewDate(ev.end_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                      {CATEGORY_LABELS[ev.category]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">
                    {ev.location ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {ev.all_day ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {parsedEvents.length > 10 && (
          <p className="text-xs text-gray-500 mb-4">
            Showing all {parsedEvents.length} events. Scroll to see more.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            className="btn-primary"
          >
            <CheckCircle className="h-4 w-4" />
            Import {parsedEvents.length} Event{parsedEvents.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-brand-400 bg-brand-50'
            : 'border-gray-300 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50',
          status === 'parsing' && 'pointer-events-none opacity-70'
        )}
      >
        <input {...getInputProps()} />

        {status === 'parsing' ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
            <p className="text-gray-600 font-medium">Parsing {fileName}...</p>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div>
              <p className="font-medium text-red-700 mb-1">Failed to parse file</p>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleReset(); }}
              className="btn-secondary text-xs"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={clsx(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              isDragActive ? 'bg-brand-100' : 'bg-gray-200'
            )}>
              <Upload className={clsx(
                'h-8 w-8 transition-colors',
                isDragActive ? 'text-brand-600' : 'text-gray-500'
              )} />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your spreadsheet'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or <span className="text-brand-600 font-medium">browse to upload</span>
              </p>
            </div>
            <div className="flex gap-2 text-xs text-gray-400">
              <span className="rounded px-2 py-0.5 bg-gray-200">.xlsx</span>
              <span className="rounded px-2 py-0.5 bg-gray-200">.xls</span>
              <span className="rounded px-2 py-0.5 bg-gray-200">.csv</span>
            </div>
            <p className="text-xs text-gray-400">Max 500 events per import</p>
          </div>
        )}
      </div>
    </div>
  );
}
