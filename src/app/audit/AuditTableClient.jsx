"use client";

import React, { useState } from "react";

export default function AuditTableClient({ auditLogs }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();

    const timestamp = new Date(log.createdAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).toLowerCase();

    const userName = (log.user?.name || "").toLowerCase();
    const userRole = (log.user?.role || "SYSTEM").toLowerCase();
    const username = (log.user?.username || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const resource = (log.resource || "").toLowerCase();
    const details = (log.details || "").toLowerCase();

    return (
      timestamp.includes(term) ||
      userName.includes(term) ||
      userRole.includes(term) ||
      username.includes(term) ||
      action.includes(term) ||
      resource.includes(term) ||
      details.includes(term)
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Chronological Security Action logs
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Audit logs clearly detailing every action performed per account.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor, account, action, module, or details..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-primary bg-white text-slate-900 font-medium"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-2 rounded-xl font-mono whitespace-nowrap">
            {filteredLogs.length} / {auditLogs.length} entries
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-bold">
            <tr>
              <th scope="col" className="px-6 py-3.5">Timestamp</th>
              <th scope="col" className="px-6 py-3.5">Actor / User</th>
              <th scope="col" className="px-6 py-3.5">Action</th>
              <th scope="col" className="px-6 py-3.5">Module</th>
              <th scope="col" className="px-6 py-3.5">Detailed Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-sans font-medium">
                  {searchTerm ? "No security action logs match your search term." : "No security audit logs found."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                    {new Date(log.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="block font-bold text-slate-800 font-sans">
                      {log.user?.name || "System"}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans mt-0.5">
                      {log.user?.role || "SYSTEM"} {log.user?.username ? `(${log.user.username})` : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black border tracking-wide font-sans ${
                        log.action === "LOGIN"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : log.action === "PAYMENT"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : log.action === "CREATE"
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : log.action === "DELETE"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-sans font-medium break-all whitespace-pre-wrap max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
