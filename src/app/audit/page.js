import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Audit Trail - PADEMCO",
};

export default async function AuditTrailPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  // Load all audit logs with user info
  const auditLogs = await db.auditLog.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">System Audit Trail</h1>
          <p className="text-sm text-slate-500">
            Real-time chronological log of all administrator and cashier actions, modifications, logins, and bookings.
          </p>
        </div>

        {/* Audit Log Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Chronological Security Action logs
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-mono">
              {auditLogs.length} entries
            </span>
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
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-sans font-medium">
                      No security audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.createdAt.toLocaleString("en-US", {
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
                          {log.user?.role || "SYSTEM"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border tracking-wide font-sans ${
                            log.action === "LOGIN"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : log.action === "PAYMENT"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : log.action === "CREATE"
                              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                              : log.action === "DELETE"
                              ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
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
      </div>
    </AppLayout>
  );
}
