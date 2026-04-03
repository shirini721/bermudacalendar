import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ImportUpload from '@/components/ImportUpload';
import { FileSpreadsheet, CheckCircle, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SUPPORTED_COLUMNS = [
  { name: 'title', required: true, description: 'Event title/name', example: 'Soccer Practice' },
  { name: 'start_date', required: true, description: 'Start date', example: '2024-06-15 or 06/15/2024' },
  { name: 'end_date', required: false, description: 'End date (defaults to start_date)', example: '2024-06-15' },
  { name: 'start_time', required: false, description: 'Start time (leave blank for all-day)', example: '09:00 or 9:00 AM' },
  { name: 'end_time', required: false, description: 'End time', example: '10:30 or 10:30 AM' },
  { name: 'all_day', required: false, description: 'All day event (yes/no/true/false)', example: 'yes' },
  { name: 'location', required: false, description: 'Event location', example: 'Central Park' },
  { name: 'description', required: false, description: 'Event description or notes', example: 'Bring cleats' },
  { name: 'category', required: false, description: 'school, sports, medical, vacation, birthday, other', example: 'sports' },
  { name: 'assigned_to', required: false, description: 'Comma-separated names or emails', example: 'John, Emma' },
];

export default async function ImportPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.family_group_id) redirect('/auth/login?setup=family');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Import Events</h1>
          </div>
          <p className="text-gray-600">
            Import events in bulk from Excel (.xlsx, .xls) or CSV files. Preview your data before importing.
          </p>
        </div>

        {/* Upload Component */}
        <div className="card p-6 mb-6">
          <ImportUpload familyGroupId={profile.family_group_id} userId={user.id} />
        </div>

        {/* Instructions */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Supported Columns</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Your spreadsheet can include any of the following columns. The first row should be a header row.
            Column names are case-insensitive.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">Column Name</th>
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">Required</th>
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">Description</th>
                  <th className="text-left font-semibold text-gray-700 pb-2">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SUPPORTED_COLUMNS.map(col => (
                  <tr key={col.name}>
                    <td className="py-2 pr-4">
                      <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-brand-700">
                        {col.name}
                      </code>
                    </td>
                    <td className="py-2 pr-4">
                      {col.required ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium text-xs">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Required
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Optional</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{col.description}</td>
                    <td className="py-2 text-gray-500 font-mono text-xs">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl bg-brand-50 border border-brand-200 p-5">
          <h3 className="font-semibold text-brand-900 mb-2">Tips for best results</h3>
          <ul className="text-sm text-brand-800 space-y-1.5 list-disc list-inside">
            <li>Use ISO date format (YYYY-MM-DD) for most reliable parsing</li>
            <li>For all-day events, leave start_time and end_time blank</li>
            <li>Category values should be: school, sports, medical, vacation, birthday, or other</li>
            <li>If category is unrecognized, it defaults to &quot;other&quot;</li>
            <li>Maximum 500 events per import</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
