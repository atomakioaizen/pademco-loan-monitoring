"use client";

import { useState } from "react";

export default function CooperativeSettingsForm({ settings, action }) {
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

    setLoading(false);
    if (res && res.error) {
      setError(res.error);
    } else {
      setSuccess("Cooperative configuration settings updated successfully!");
      // Briefly flash success state
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800">Cooperative Defaults</h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure default interest rates, payment terms, and cooperative branding info.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
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

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Cooperative Identity
          </h4>
          
          <div>
            <label htmlFor="org_name" className="block text-sm font-semibold text-slate-700">
              Organization Official Name
            </label>
            <input
              type="text"
              name="org_name"
              id="org_name"
              required
              defaultValue={settings.org_name || "PADEMCO Multi-Purpose Cooperative"}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="org_address" className="block text-sm font-semibold text-slate-700">
              Office Address / Location
            </label>
            <input
              type="text"
              name="org_address"
              id="org_address"
              required
              defaultValue={settings.org_address || "DENR Compound, Daet, Camarines Norte"}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brand_color" className="block text-sm font-semibold text-slate-700">
                Primary Brand Color (Hex)
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  name="brand_color"
                  id="brand_color"
                  defaultValue={settings.brand_color || "#1e3a8a"}
                  className="h-10 w-14 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                />
                <span className="text-xs text-slate-500">Pick a color</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                System Logo Image
              </label>
              <div className="mt-2.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {settings.system_logo ? (
                  <div 
                    className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-cover bg-center bg-no-repeat shadow-sm bg-slate-100"
                    style={{ backgroundImage: `url('${settings.system_logo}')` }}
                    title="Current System Logo"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="file"
                    name="logo_file"
                    id="logo_file"
                    accept="image/*"
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">Or use image URL:</span>
                    <input
                      type="text"
                      name="system_logo"
                      id="system_logo"
                      placeholder="e.g., https://example.com/logo.png"
                      defaultValue={settings.system_logo || ""}
                      className="w-full rounded-xl border border-slate-300 px-3 py-1.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            Loan Policy Formulas & Constraints
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="service_fee" className="block text-sm font-semibold text-slate-700">
                Cooperative Service Fee / Markup (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="service_fee"
                id="service_fee"
                required
                defaultValue={settings.service_fee || "500.00"}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="interest_rate" className="block text-sm font-semibold text-slate-700">
                Interest Rate per Month (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="interest_rate"
                id="interest_rate"
                required
                defaultValue={settings.interest_rate || "1.00"}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rebooking_fee" className="block text-sm font-semibold text-slate-700">
                Rebooking Fee / Administrative Markup (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="rebooking_fee"
                id="rebooking_fee"
                required
                defaultValue={settings.rebooking_fee || "200.00"}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="max_active_flights" className="block text-sm font-semibold text-slate-700">
                Maximum Active Flights Limit
              </label>
              <input
                type="number"
                min="1"
                step="1"
                name="max_active_flights"
                id="max_active_flights"
                required
                defaultValue={settings.max_active_flights || "4"}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-700">
              Cooperative Loan Policies & Constraints Summary:
            </p>
            <ul className="list-disc list-inside space-y-1.5 font-semibold text-slate-800">
              <li>
                Maximum Flight Capacity: <span className="text-rose-700 font-bold">{settings.max_active_flights || "4"} active flights</span> maximum per employee.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? "Saving Settings..." : "Save Identity settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
