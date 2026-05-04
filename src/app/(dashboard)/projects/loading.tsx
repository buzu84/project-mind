export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading projects">
      <span className="sr-only">Loading projects…</span>
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="h-10 w-32 rounded-lg bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-3 h-3 w-80 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

