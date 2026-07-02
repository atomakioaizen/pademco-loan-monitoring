"use client";

import { useState, useTransition, useEffect } from "react";

export default function DeleteButton({
  id,
  action,
  confirmMessage,
  label = "Delete",
  className = "text-danger hover:text-danger-dark font-semibold text-xs transition-colors p-1 px-2.5 rounded-lg hover:bg-danger-light cursor-pointer border border-transparent hover:border-danger-light disabled:opacity-50",
}) {
  const [isPending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  // Auto-disarm after 4 seconds if user doesn't confirm
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const handleClick = (e) => {
    e.preventDefault();
    setInlineError(null);

    if (!armed) {
      setArmed(true);
      return;
    }

    // Second click — execute deletion
    setArmed(false);
    const formData = new FormData();
    formData.append("id", id);

    startTransition(async () => {
      const res = await action(formData);
      if (res && res.error) {
        setInlineError(res.error);
      }
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {inlineError && (
        <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 max-w-[200px] text-right leading-snug">
          {inlineError}
        </span>
      )}
      <form onSubmit={(e) => e.preventDefault()} className="inline">
        <button
          type="button"
          disabled={isPending}
          onClick={handleClick}
          className={
            armed
              ? "text-white bg-danger border border-danger font-black text-xs transition-all p-1 px-3 rounded-lg cursor-pointer animate-pulse shadow-md shadow-danger/30"
              : className
          }
        >
          {isPending
            ? "Processing..."
            : armed
            ? "⚠️ Tap Again to Confirm"
            : label}
        </button>
      </form>
    </span>
  );
}
