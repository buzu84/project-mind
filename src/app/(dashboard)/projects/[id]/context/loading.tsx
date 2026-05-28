export default function ContextLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" role="status" aria-label="Loading project context">
      <span className="sr-only">Loading project context…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div>
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-72 rounded bg-gray-200" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="h-5 w-36 rounded bg-gray-200" />
          <div className="h-24 w-full rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

