export default function FeedbackLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6" role="status" aria-label="Loading feedback">
      <span className="sr-only">Loading feedback…</span>

      {/* Back link */}
      <div className="h-4 w-24 rounded bg-gray-200" />

      {/* Heading row: title + badge */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-56 rounded bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
        </div>
        <div className="h-4 w-80 max-w-full rounded bg-gray-200" />
      </div>

      {/* Add Feedback button placeholder */}
      <div className="h-9 w-36 rounded-lg bg-gray-200" />

      {/* Document cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-4 w-48 max-w-full rounded bg-gray-200" />
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                </div>
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-3/4 rounded bg-gray-200" />
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 sm:ml-4">
                <div className="h-4 w-8 rounded bg-gray-200" />
                <div className="h-4 w-12 rounded bg-gray-200" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

