export default function FeedbackLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6" role="status" aria-label="Loading feedback">
      <span className="sr-only">Loading feedback…</span>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="h-8 w-56 rounded bg-gray-200" />
      <div className="h-32 rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-3 h-20 w-full rounded bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded bg-gray-200" />
            </div>
            <div className="mt-3 h-3 w-72 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

