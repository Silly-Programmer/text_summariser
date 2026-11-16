export default function Loading() {
    return (
        <div className="animate-pulse" aria-busy="true" aria-label="Loading dashboard">
            <div className="h-8 w-40 rounded-md bg-secondary" />
            <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-secondary" />
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[82px] rounded-lg border bg-card" />
                ))}
            </div>
            <div className="mt-10 h-6 w-48 rounded-md bg-secondary" />
            <div className="mt-3 h-40 rounded-lg border border-dashed bg-card" />
        </div>
    );
}