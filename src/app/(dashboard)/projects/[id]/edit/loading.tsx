export default function EditProjectLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" role="status" aria-label="Loading edit project">
      <span className="sr-only">Loading edit project…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="h-6 w-32 rounded bg-gray-200" />
        <div className="h-4 w-56 rounded bg-gray-200" />
        <div className="space-y-3">
          <div className="h-10 w-full rounded-lg bg-gray-100" />
          <div className="h-24 w-full rounded-lg bg-gray-100" />
          <div className="h-10 w-full rounded-lg bg-gray-100" />
          <div className="h-10 w-full rounded-lg bg-gray-100" />
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-9 w-20 rounded-lg bg-gray-200" />
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

