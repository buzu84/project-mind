export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" role="status" aria-label="Loading settings">
      <span className="sr-only">Loading settings…</span>
      <div>
        <div className="h-8 w-32 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-56 rounded bg-gray-200" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="h-5 w-28 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="h-10 w-full rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

