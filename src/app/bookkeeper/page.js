import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import BookkeeperConsoleClient from "./BookkeeperConsoleClient";
import { redirect } from "next/navigation";
import {
  encodeOldLoanAction,
  deleteOldLoanAction,
  reviewRequestAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookkeeper Console - PADEMCO",
};

export default async function BookkeeperPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "BOOKKEEPER" && session.role !== "ADMIN") redirect("/");

  // Fetch all required data in parallel
  const [employees, oldLoans, requests] = await Promise.all([
    db.employee.findMany({
      where: {
        status: "ACTIVE",
        user: {
          role: "VIEWER",
          status: "APPROVED"
        }
      },
      include: { office: true },
      orderBy: { fullName: "asc" },
    }),
    db.oldLoan.findMany({
      include: {
        employee: {
          include: { office: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.oldLoanRequest.findMany({
      include: {
        employee: {
          include: { office: true },
        },
        requestedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary font-sans leading-tight">Bookkeeper Operations</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Encode borrowers with undocumented pre-existing loans and manage override request approvals.
          </p>
        </div>

        <BookkeeperConsoleClient
          employees={employees}
          oldLoans={oldLoans}
          requests={requests}
          encodeOldLoanAction={encodeOldLoanAction}
          deleteOldLoanAction={deleteOldLoanAction}
          reviewRequestAction={reviewRequestAction}
        />
      </div>
    </AppLayout>
  );
}
