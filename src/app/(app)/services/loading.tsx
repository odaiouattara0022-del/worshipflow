export default function ServicesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-28 bg-muted rounded mb-2" />
          <div className="h-4 w-48 bg-muted/60 rounded" />
        </div>
        <div className="h-9 w-36 bg-muted rounded" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-56 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-muted/40 rounded-full" />
            </div>
            <div className="flex gap-4 mt-3">
              <div className="h-4 w-20 bg-muted/40 rounded" />
              <div className="h-4 w-24 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
