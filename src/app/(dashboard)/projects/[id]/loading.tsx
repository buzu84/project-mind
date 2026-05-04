export default function ProjectDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading project">
      <span className="sr-only">Loading project…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-40 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

