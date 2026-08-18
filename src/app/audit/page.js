import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import AuditTableClient from "./AuditTableClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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

        {/* Audit Log Table Client with Search */}
        <AuditTableClient auditLogs={auditLogs} />
      </div>
    </AppLayout>
  );
}
