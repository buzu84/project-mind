export default function FeaturesLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading features">
      <span className="sr-only">Loading features…</span>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded-lg bg-gray-200" />
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded bg-gray-200" />
                <div className="h-5 w-16 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-3 h-3 w-64 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

