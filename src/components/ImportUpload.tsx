'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseSpreadsheet } from '@/lib/parseSpreadsheet';
import type { CalEvent } from '@/types';

const CATEGORY_COLORS: Record<CalEvent['category'], string> = {
  school: '#6366f1',
  sports: '#10b981',
  medical: '#ef4444',
  vacation: '#f59e0b',
  birthday: '#ec4899',
  other: '#6b7280',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ImportUpload() {
  const [parsed, setParsed] = useState<CalEvent[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setParseError('');
    setImportedCount(null);
    setParsed(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const events = parseSpreadsheet(buffer);
      if (events.length === 0) {
        setParseError('No events found in the file. Check that your file matches one of the supported formats.');
      } else {
        setParsed(events);
      }
    } catch (err) {
      console.error(err);
      setParseError('Failed to parse the file. Make sure it is a valid .xlsx, .xls, or .csv file.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  async function handleImport() {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: parsed }),
      });
      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();
      setImportedCount(data.count);
      setParsed(null);
      setFileName('');
    } catch {
      setParseError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setParsed(null);
    setFileName('');
    setParseError('');
    setImportedCount(null);
  }

  return (
    <div className="space-y-6">
      {/* Success */}
      {importedCount !== null && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Successfully imported {importedCount} event{importedCount !== 1 ? 's' : ''}!
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Head to the <a href="/calendar" className="underline font-medium">Calendar</a> to see them.
            </p>
          </div>
          <button onClick={handleReset} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!parsed && importedCount === null && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-brand-400 bg-brand-50'
              : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-brand-500' : 'text-gray-300'}`} />
          {isDragActive ? (
            <p className="text-brand-600 font-medium">Drop it here!</p>
          ) : (
            <>
              <p className="text-gray-600 font-medium">Drag & drop your spreadsheet here</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse</p>
              <p className="text-xs text-gray-400 mt-3">Supports .xlsx, .xls, .csv</p>
            </>
          )}
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{parseError}</p>
          <button onClick={handleReset} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview */}
      {parsed && parsed.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-gray-800">{fileName}</span>
              <span className="text-xs text-gray-400">— {parsed.length} events found</span>
            </div>
            <button onClick={handleReset} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">All day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsed.slice(0, 50).map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-900 max-w-xs truncate">{ev.title}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(ev.start)}</td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[ev.category] }}
                      >
                        {ev.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{ev.allDay ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 50 && (
              <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                Showing first 50 of {parsed.length} events.
              </p>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Review the events above, then click Import to add them to your calendar.
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary"
            >
              {importing ? 'Importing…' : `Import ${parsed.length} event${parsed.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
