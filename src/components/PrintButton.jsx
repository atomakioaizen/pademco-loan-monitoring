"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      type="button"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-all cursor-pointer"
      title="Print this report page"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print Report
    </button>
  );
}
