"use client";

import { useState } from "react";

export default function AgentCommissionSettingsForm({ initialRate, action }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.target);
    const res = await action(formData);

    loadingDelay(); // simulate small aesthetic response delay
    setLoading(false);
    if (res && res.error) {
      setError(res.error);
    } else {
      setSuccess("General booking agent commission rate updated successfully!");
      // Briefly flash success state
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    }
  };

  // Helper delay to give standard premium loading state feel
  const loadingDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 self-start">
      <div>
        <h3 className="text-lg font-black text-slate-800">Agent Commission settings</h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure the general system-wide commission rate for all booking agents (applies to same-level employees uniformly).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-xs bg-rose-50 border border-rose-100 text-danger p-3.5 rounded-xl font-bold animate-pulse">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs bg-emerald-50 border border-emerald-100 text-success p-3.5 rounded-xl font-bold">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="agent_commission_rate" className="block text-sm font-semibold text-slate-700">
            General Commission Rate per Booking (₱)
          </label>
          <input
            type="number"
            name="agent_commission_rate"
            id="agent_commission_rate"
            required
            defaultValue={initialRate || "75"}
            min="0"
            step="1"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono font-bold"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer disabled:opacity-50"
        >
          {loading ? "Saving settings..." : "Save Commission settings"}
        </button>
      </form>
    </div>
  );
}
