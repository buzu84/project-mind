export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6" role="status" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard…</span>
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl border border-gray-200 bg-white" />
        <div className="h-64 rounded-xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}
