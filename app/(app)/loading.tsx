// Shown instantly while any page inside the app is loading (and prefetched with the sidebar links),
// so clicking a section responds at once instead of freezing until the server has finished.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-secondary" />
      <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-secondary" />
      <div className="mt-8 overflow-hidden rounded-lg border bg-card">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
            <div className="hidden h-5 w-5 rounded bg-secondary sm:block" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-secondary" />
              <div className="h-3 w-1/3 rounded bg-secondary" />
            </div>
            <div className="h-6 w-16 rounded-full bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  );
}
