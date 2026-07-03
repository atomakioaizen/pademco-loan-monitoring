// Global loading skeleton — shown INSTANTLY on any page navigation
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-9 w-32 rounded-lg bg-slate-200" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white border border-slate-100 p-5 shadow-sm">
            <div className="h-4 w-24 rounded bg-slate-200 mb-3" />
            <div className="h-8 w-16 rounded bg-slate-200 mb-2" />
            <div className="h-3 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="h-5 w-36 rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-4 w-4 rounded bg-slate-200 flex-shrink-0" />
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-100 ml-auto" />
              <div className="h-4 w-16 rounded bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
