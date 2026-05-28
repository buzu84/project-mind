export default function RoadmapLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6" role="status" aria-label="Loading roadmap">
      <span className="sr-only">Loading roadmap…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-gray-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="h-5 w-20 rounded bg-gray-200" />
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-gray-100" />
              <div className="h-16 rounded-lg bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

