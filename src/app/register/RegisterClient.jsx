"use client";

import { useState, useTransition } from "react";
import { registerAction } from "./actions";
import Link from "next/link";

const PALAWAN_OFFICES = [
  "PENRO Palawan",
  "CENRO Coron",
  "CENRO Brookes Point",
  "CENRO Puerto Princesa",
  "CENRO Quezon",
  "CENRO Roxas",
  "CENRO Taytay",
];

export default function RegisterClient() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.target);

    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await registerAction(null, formData);
      if (result && result.error) {
        setError(result.error);
      } else if (result && result.success) {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md space-y-8 text-center bg-white/5 backdrop-blur-xl px-8 py-10 shadow-2xl rounded-3xl border border-white/10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-400/30 text-emerald-400 shadow-lg shadow-emerald-500/20">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Registration Submitted!</h2>
          <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
            <p>Your account has been successfully created and is now <strong className="text-amber-400">Pending Admin Approval</strong>.</p>
            <p className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs font-semibold text-slate-400">
              For security, the coop admin must verify and approve your registration details before you can access the system.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex w-full justify-center rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-8">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-400/30 shadow-lg shadow-blue-500/20 mb-4">
            <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">PADEMCO</h2>
          <p className="mt-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
            Loaner Self-Registration Portal
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Create your account to request airline ticket loans
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/5 backdrop-blur-xl px-8 py-8 shadow-2xl rounded-3xl border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/30 p-4 animate-pulse">
                <p className="text-sm font-medium text-rose-300">⚠️ {error}</p>
              </div>
            )}

            {/* Section 1: Account Credentials */}
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center text-[10px]">🔑</span>
                Account Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name (LN, FN MN) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all font-semibold text-sm"
                    placeholder="e.g. Dela Cruz, Juan Santos"
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Desired Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. juandelacruz"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Re-enter Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Employee / DENR Information */}
            <div>
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center text-[10px]">📋</span>
                Employee / DENR Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Employee ID - OPTIONAL */}
                <div>
                  <label htmlFor="employeeId" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Employee ID{" "}
                    <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="employeeId"
                    name="employeeId"
                    type="text"
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all font-mono text-sm"
                    placeholder="e.g. EMP-2026-001 (leave blank if unknown)"
                  />
                </div>

                {/* Office / Station - Hardcoded Palawan */}
                <div>
                  <label htmlFor="officeName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Office / Station <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="officeName"
                    name="officeName"
                    required
                    disabled={isPending}
                    className="block w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                  >
                    <option value="">Select Office / Station</option>
                    {PALAWAN_OFFICES.map((office) => (
                      <option key={office} value={office}>
                        {office}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="position" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Position <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="position"
                    name="position"
                    type="text"
                    required
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. Administrative Officer V"
                  />
                </div>
                <div>
                  <label htmlFor="contactNumber" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="contactNumber"
                    name="contactNumber"
                    type="text"
                    required
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. 09171234567"
                  />
                </div>
                <div>
                  <label htmlFor="birthDate" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Birth Date
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. juan@denr.gov.ph"
                  />
                </div>
                <div>
                  <label htmlFor="govIdType" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Government ID Type
                  </label>
                  <input
                    id="govIdType"
                    name="govIdType"
                    type="text"
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. GSIS, UMID, PRC"
                  />
                </div>
                <div>
                  <label htmlFor="govIdNumber" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Government ID Number
                  </label>
                  <input
                    id="govIdNumber"
                    name="govIdNumber"
                    type="text"
                    autoComplete="off"
                    disabled={isPending}
                    className="block w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 text-white transition-all text-sm"
                    placeholder="e.g. CRN-0111-1234567-8"
                  />
                </div>
              </div>
            </div>

            {/* Note & Action Buttons */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-4">
                <span className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  ⚠️ Note on Approvals
                </span>
                <span className="block text-[11px] text-amber-300/80 font-semibold leading-relaxed">
                  Upon clicking submit, your registration request will go to the PADEMCO Admin for verification. You will be able to log in as soon as they manually approve your profile details.
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 cursor-pointer text-center"
                >
                  {isPending ? "Submitting Request..." : "Register & Submit"}
                </button>
                <Link
                  href="/login"
                  className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3.5 text-sm font-semibold text-slate-300 transition-all focus:outline-none text-center"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} PADEMCO Multi-Purpose Cooperative. All rights reserved.
        </div>
      </div>
    </main>
  );
}
