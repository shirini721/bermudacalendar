import ImportUpload from '@/components/ImportUpload';

export default function ImportPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Events</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Upload a spreadsheet to import multiple events at once.
        </p>
      </div>

      <ImportUpload />

      <div className="mt-10">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Supported Formats</h2>

        <div className="card p-5 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Format 1 — Standard columns</h3>
            <p className="text-xs text-gray-500 mb-3">
              First row must be a header row. Columns can appear in any order.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Column</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Required?</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['title / name / event', 'Yes', 'Event title'],
                    ['start_date / start / date', 'Yes', 'Any parseable date/datetime'],
                    ['end_date / end', 'No', 'Defaults to start if omitted'],
                    ['location', 'No', ''],
                    ['description / notes', 'No', ''],
                    ['category', 'No', 'school | sports | medical | vacation | birthday | other'],
                    ['all_day / allday', 'No', 'true/false, yes/no, 1/0'],
                  ].map(([col, req, note]) => (
                    <tr key={col}>
                      <td className="border border-gray-200 px-3 py-2 font-mono text-brand-700">{col}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-600">{req}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Format 2 — Weekly tracker</h3>
            <p className="text-xs text-gray-500 mb-3">
              Two-column spreadsheet. Column A = week/period header (can include a 4-digit year).
              Column B = multi-line text where each event line starts with <code className="bg-gray-100 px-1 rounded">M/D</code> or <code className="bg-gray-100 px-1 rounded">M/DD</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Col A</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">Col B</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Week of 9/2/2025', '9/2 (Mon): First day of school\n9/4 (Wed): Soccer practice 4pm\n9/5 (Thu): Doctor appt 9:30am'],
                    ['Week of 9/8', '9/8 (Mon): Labor Day — no school\n9/10 (Wed): Tennis 6pm\n9/12 (Fri): Flight to NY 7:30am'],
                  ].map(([a, b]) => (
                    <tr key={a}>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700 align-top">{a}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-600 whitespace-pre-line">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Times like <code className="bg-gray-100 px-1 rounded">7:30am</code> or <code className="bg-gray-100 px-1 rounded">6:45pm</code> in the description are parsed as timed events.
              Categories are auto-detected from keywords.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
