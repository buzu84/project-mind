export default function UsageLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6" role="status" aria-label="Loading usage history">
      <span className="sr-only">Loading usage history…</span>
      <div>
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 w-16 rounded bg-gray-200" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-gray-100 px-4 py-3 flex gap-6">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-4 w-16 rounded bg-gray-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

