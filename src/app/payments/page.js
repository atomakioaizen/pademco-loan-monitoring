import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import PaymentsConsoleClient from "./PaymentsConsoleClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments & Collections - PADEMCO",
};

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CASHIER") redirect("/");

  // Fetch all required data for payments in parallel
  const [
    payments,
    activeLoansRaw,
    settingsList,
    activeBookings,
    oldLoansRaw,
  ] = await Promise.all([
    db.payment.findMany({
      include: {
        loan: {
          include: {
            booking: {
              include: { employee: { include: { office: true } } },
            },
          },
        },
        cashier: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.loan.findMany({
      where: {
        remainingBalance: { gt: 0 },
      },
      include: {
        booking: {
          include: { employee: true },
        },
      },
      orderBy: {
        booking: {
          employee: {
            fullName: "asc",
          },
        },
      },
    }),
    db.systemSetting.findMany(),
    db.booking.findMany({
      where: {
        isArchived: false,
        loan: {
          status: { not: "FULLY_PAID" }
        }
      },
      select: { employeeId: true, flightCount: true }
    }),
    // Old loans with their payment history
    db.oldLoan.findMany({
      include: {
        employee: { include: { office: true } },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: {
        employee: { fullName: "asc" },
      },
    }),
  ]);

  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  const maxActiveFlights = parseInt(settings.max_active_flights || "4");

  const flightCountMap = activeBookings.reduce((acc, curr) => {
    acc[curr.employeeId] = (acc[curr.employeeId] || 0) + curr.flightCount;
    return acc;
  }, {});

  const activeLoans = activeLoansRaw.map((loan) => ({
    ...loan,
    booking: {
      ...loan.booking,
      employee: {
        ...loan.booking.employee,
        outstandingFlights: flightCountMap[loan.booking.employeeId] || 0,
      },
    },
  }));

  // Serialize old loans for client (keep only what's needed)
  const oldLoans = oldLoansRaw.map((ol) => ({
    id: ol.id,
    employeeId: ol.employeeId,
    employeeName: ol.employee.fullName,
    employeeOffice: ol.employee.office.name,
    totalOldLoans: ol.totalOldLoans,
    estimatedAmount: ol.estimatedAmount,
    dateSince: ol.dateSince.toISOString(),
    remarks: ol.remarks,
    totalPaid: ol.payments.reduce((sum, p) => sum + p.amount, 0),
    payments: ol.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentType: p.paymentType,
      remarks: p.remarks,
      receiptNumber: p.receiptNumber,
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  // Server Action to record regular loan payment
  async function recordPayment(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "CASHIER") {
      throw new Error("Unauthorized");
    }

    const loanId = formData.get("loanId");
    const receiptNumber = formData.get("receiptNumber")?.trim();
    const amountPaid = parseFloat(formData.get("amountPaid") || "0");
    const paymentDateStr = formData.get("paymentDate");
    const paymentMethod = formData.get("paymentMethod") || "CASH";
    const remarks = formData.get("remarks")?.trim();

    if (!loanId || !receiptNumber || amountPaid <= 0 || !paymentDateStr) {
      return { error: "Please fill in all required fields." };
    }

    try {
      const existingOR = await db.payment.findUnique({ where: { receiptNumber } });
      if (existingOR) {
        return { error: "This Official Receipt (OR) Number has already been used." };
      }

      const paymentDate = new Date(paymentDateStr);

      await db.$transaction(async (tx) => {
        const loan = await tx.loan.findUnique({ where: { id: loanId } });
        if (!loan) throw new Error("Loan account not found.");

        const settingsList = await tx.systemSetting.findMany();
        const settings = settingsList.reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});

        let expectedAmount = loan.remainingBalance;
        const today = new Date(paymentDate);
        const dueDate = new Date(loan.dueDate);
        const isOverdue = loan.status === "OVERDUE" || dueDate < today;
        if (isOverdue) {
          const sy = dueDate.getFullYear(), sm = dueDate.getMonth(), sd = dueDate.getDate();
          const ey = today.getFullYear(), em = today.getMonth(), ed = today.getDate();
          let monthsDelayed = (ey - sy) * 12 + (em - sm);
          if (ed > sd) monthsDelayed += 1;
          monthsDelayed = Math.max(1, monthsDelayed);
          const penalty = loan.remainingBalance * 0.01 * monthsDelayed;
          expectedAmount = loan.remainingBalance + penalty;
        }

        if (amountPaid < expectedAmount) {
          throw new Error(
            `Payment of ₱${amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} is less than the required full settlement of ₱${expectedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`
          );
        }

        await tx.payment.create({
          data: {
            loanId,
            receiptNumber,
            amountPaid,
            paymentDate,
            paymentMethod,
            remarks,
            cashierId: session.id,
          },
        });

        await tx.loan.update({
          where: { id: loanId },
          data: { remainingBalance: 0, status: "FULLY_PAID" },
        });

        await logAction(
          session.id,
          "PAYMENT",
          "LOAN",
          `Recorded payment of ₱${amountPaid} under OR# ${receiptNumber} for Loan ID: ${loanId}`
        );
      });

    } catch (e) {
      console.error(e);
      return { error: e.message || "Failed to process payment." };
    }

    revalidatePath("/payments");
  }

  // Server Action to record Old Loan payment (FULL or PARTIAL — cashier decides)
  async function recordOldLoanPayment(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "CASHIER") {
      throw new Error("Unauthorized");
    }

    const oldLoanId = formData.get("oldLoanId");
    const receiptNumber = formData.get("receiptNumber")?.trim();
    const amount = parseFloat(formData.get("amount") || "0");
    const paymentType = formData.get("paymentType") || "FULL"; // "FULL" | "PARTIAL"
    const remarks = formData.get("remarks")?.trim();

    if (!oldLoanId || !receiptNumber || amount <= 0) {
      return { error: "Please fill in all required fields." };
    }

    try {
      const existingOR = await db.oldLoanPayment.findFirst({
        where: { receiptNumber },
      });
      if (existingOR) {
        return { error: `OR# ${receiptNumber} has already been used.` };
      }

      const oldLoan = await db.oldLoan.findUnique({ where: { id: oldLoanId } });
      if (!oldLoan) {
        return { error: "Old loan record not found." };
      }

      await db.oldLoanPayment.create({
        data: {
          oldLoanId,
          amount,
          paymentType,
          remarks,
          receiptNumber,
          paidById: session.id,
        },
      });

      await logAction(
        session.id,
        "PAYMENT",
        "OLD_LOAN",
        `Cashier recorded ${paymentType} old loan payment of ₱${amount} (OR# ${receiptNumber}) for Old Loan ID: ${oldLoanId}`
      );
    } catch (e) {
      console.error(e);
      return { error: e.message || "Failed to record old loan payment." };
    }

    revalidatePath("/payments");
  }

  const strictInstallments = "no";

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">Payments & OR Registry</h1>
          <p className="text-sm text-slate-500">
            Log official receipts for employee installment payments. Balances and loan statuses are updated in real-time.
          </p>
        </div>

        <PaymentsConsoleClient
          payments={payments}
          activeLoans={activeLoans}
          maxActiveFlights={maxActiveFlights}
          strictInstallments={strictInstallments}
          action={recordPayment}
          oldLoans={oldLoans}
          oldLoanAction={recordOldLoanPayment}
        />
      </div>
    </AppLayout>
  );
}
