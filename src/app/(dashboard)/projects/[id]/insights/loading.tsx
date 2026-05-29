export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading insights">
      <span className="sr-only">Loading insights…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-44 rounded-lg bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded bg-gray-200" />
              <div className="h-5 w-16 rounded bg-gray-200" />
            </div>
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

