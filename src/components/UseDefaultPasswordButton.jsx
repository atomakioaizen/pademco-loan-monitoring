"use client";

export default function UseDefaultPasswordButton({ targetId }) {
  return (
    <button
      type="button"
      onClick={() => {
        const pwEl = document.getElementById(targetId);
        if (pwEl) { pwEl.value = "employee123"; pwEl.type = "text"; }
      }}
      className="ml-3 shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-2 rounded-xl transition-all cursor-pointer"
    >
      Use Default
    </button>
  );
}
