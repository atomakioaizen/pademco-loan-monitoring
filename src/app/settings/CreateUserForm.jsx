"use client";

import { useState } from "react";

export default function CreateUserForm({ employees, action }) {
  const [role, setRole] = useState("AGENT");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.target);
    const res = await action(formData);

    if (res && res.error) {
      setError(res.error);
    } else {
      setSuccess("User account created successfully!");
      e.target.reset();
      setRole("VIEWER");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 self-start">
      <div>
        <h3 className="text-lg font-black text-slate-800">Create Portal Account</h3>
        <p className="text-xs text-slate-400 mt-1">
          Provision login credentials for admins, cashiers, or individual DENR employee viewers.
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
          <label htmlFor="user_name" className="block text-sm font-semibold text-slate-700">
            Account Holder Name
          </label>
          <input
            type="text"
            name="name"
            id="user_name"
            required
            placeholder="e.g., Jane Smith"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
          />
        </div>

        <div>
          <label htmlFor="user_username" className="block text-sm font-semibold text-slate-700">
            Login Username
          </label>
          <input
            type="text"
            name="username"
            id="user_username"
            required
            placeholder="e.g., janesmith"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
          />
        </div>

        <div>
          <label htmlFor="user_password" className="block text-sm font-semibold text-slate-700">
            Initial Password
          </label>
          <input
            type="password"
            name="password"
            id="user_password"
            required
            placeholder="••••••••"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
          />
        </div>

        <div>
          <label htmlFor="user_role" className="block text-sm font-semibold text-slate-700">
            Access Control Role
          </label>
          <select
            name="role"
            id="user_role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white"
          >
            <option value="AGENT">AGENT (Booking Agent / Ticketing)</option>
            <option value="CASHIER">CASHIER (Payments & Receipts)</option>
            <option value="BOOKKEEPER">BOOKKEEPER (Old Loans Encoder & Approver)</option>
          </select>
        </div>



        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer"
        >
          Provision Account
        </button>
      </form>
    </div>
  );
}
