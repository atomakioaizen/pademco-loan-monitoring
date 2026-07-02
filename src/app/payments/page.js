import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import PaymentsConsoleClient from "./PaymentsConsoleClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export const metadata = {
  title: "Payments & Collections - PADEMCO",
};

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CASHIER") redirect("/");

  // Load all recorded payments with relations
  const payments = await db.payment.findMany({
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
  });

  // Load all active loans with outstanding balance for the payment form dropdown
  const activeLoansRaw = await db.loan.findMany({
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
  });

  // Fetch dynamic settings from database
  const settingsList = await db.systemSetting.findMany();
  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  const maxActiveFlights = parseInt(settings.max_active_flights || "4");

  // Calculate outstanding flight counts dynamically for each employee
  const activeBookings = await db.booking.findMany({
    where: {
      isArchived: false,
      loan: {
        status: { not: "FULLY_PAID" }
      }
    },
    select: { employeeId: true, flightCount: true }
  });

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

  // Server Action to record payment
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
      // Validate OR duplicate
      const existingOR = await db.payment.findUnique({
        where: { receiptNumber },
      });

      if (existingOR) {
        return { error: "This Official Receipt (OR) Number has already been used." };
      }

      const paymentDate = new Date(paymentDateStr);

      // Perform transaction to deduct balance and save payment
      const result = await db.$transaction(async (tx) => {
        const loan = await tx.loan.findUnique({
          where: { id: loanId },
        });

        if (!loan) throw new Error("Loan account not found.");

        // Load dynamic settings from database inside the transaction
        const settingsList = await tx.systemSetting.findMany();
        const settings = settingsList.reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        // Calculate expected payment amount (principal + penalty if overdue)
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

        // Validate that the paid amount matches the required expected amount (including penalty)
        if (amountPaid < expectedAmount) {
          throw new Error(
            `Payment of ₱${amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} is less than the required full settlement of ₱${expectedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`
          );
        }

        // Since only full settlement is allowed, the outstanding balance is always reduced to 0
        const newBalance = 0;
        const newStatus = "FULLY_PAID";

        // 1. Create payment record
        const payment = await tx.payment.create({
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

        // 2. Update loan balances
        await tx.loan.update({
          where: { id: loanId },
          data: {
            remainingBalance: newBalance,
            status: newStatus,
          },
        });

        await logAction(
          session.id,
          "PAYMENT",
          "LOAN",
          `Recorded payment of ₱${amountPaid} under OR# ${receiptNumber} for Loan ID: ${loanId}`
        );

        return payment;
      });

    } catch (e) {
      console.error(e);
      return { error: e.message || "Failed to process payment." };
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
        />
      </div>
    </AppLayout>
  );
}
