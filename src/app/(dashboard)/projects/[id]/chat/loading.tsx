export default function ChatLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-6" role="status" aria-label="Loading chat">
      <span className="sr-only">Loading chat…</span>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="h-8 w-40 rounded bg-gray-200" />
      <div className="flex-1 space-y-4">
        <div className="flex justify-end"><div className="h-12 w-48 rounded-xl bg-gray-200" /></div>
        <div className="flex justify-start"><div className="h-20 w-64 rounded-xl bg-gray-100" /></div>
        <div className="flex justify-end"><div className="h-12 w-40 rounded-xl bg-gray-200" /></div>
        <div className="flex justify-start"><div className="h-16 w-56 rounded-xl bg-gray-100" /></div>
      </div>
      <div className="h-12 w-full rounded-xl border border-gray-200 bg-white" />
    </div>
  );
}

