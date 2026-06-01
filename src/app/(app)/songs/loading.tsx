export default function SongsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-24 bg-muted rounded mb-2" />
          <div className="h-4 w-40 bg-muted/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-muted rounded" />
      </div>

      <div className="h-9 w-full bg-muted rounded mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <div className="h-5 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted/60 rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-10 bg-muted/40 rounded-full" />
              <div className="h-5 w-16 bg-muted/40 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
