export default function DecisionDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" role="status" aria-label="Loading decision">
      <span className="sr-only">Loading decision…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-gray-200" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="h-5 w-36 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

