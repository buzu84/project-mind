export default function PrdDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading PRD">
      <span className="sr-only">Loading PRD…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-56 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="h-5 w-40 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

