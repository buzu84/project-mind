export default function DecisionsLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading decisions">
      <span className="sr-only">Loading decisions…</span>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="h-9 w-36 rounded-lg bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded bg-gray-200" />
              <div className="h-5 w-16 rounded bg-gray-200" />
            </div>
            <div className="mt-3 h-4 w-56 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

