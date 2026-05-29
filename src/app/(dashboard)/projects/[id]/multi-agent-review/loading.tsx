export default function MultiAgentReviewLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6" role="status" aria-label="Loading multi-agent review">
      <span className="sr-only">Loading multi-agent review…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-56 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-44 rounded-lg bg-gray-200" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="h-20 w-full rounded-lg bg-gray-100" />
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded bg-gray-200" />
            </div>
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

