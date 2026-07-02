import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import CommissionsDashboardClient from "./CommissionsDashboardClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Agent Commissions Hub - PADEMCO",
};

export default async function CommissionsPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "VIEWER") redirect("/");

  // Handle Async SearchParams in Next.js
  const resolvedSearchParams = await searchParams;
  
  // Format current month (e.g. "2026-05")
  const today = new Date();
  const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const selectedMonth = resolvedSearchParams.month || currentMonthYear;

  const [yearStr, monthStr] = selectedMonth.split("-");
  const year = parseInt(yearStr) || today.getFullYear();
  const month = (parseInt(monthStr) || (today.getMonth() + 1)) - 1;

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // 1. Fetch all Booking Agents (users with role: "AGENT")
  // If the logged in user is an AGENT, they can ONLY view themselves for confidentiality
  const agentQueryFilter = session.role === "AGENT"
    ? { role: "AGENT", id: session.id }
    : { role: "AGENT" };

  const agents = await db.user.findMany({
    where: agentQueryFilter,
    select: {
      id: true,
      username: true,
      name: true,
      commissionRate: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all system settings to get the general commission rate
  const settingsList = await db.systemSetting.findMany();
  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  const generalRateStr = settings.agent_commission_rate;
  const generalRate = generalRateStr ? parseFloat(generalRateStr) : 75.0;

  // 2. Load Bookings and Payout Statuses for each agent for the selected month period
  const agentsData = await Promise.all(
    agents.map(async (agent) => {
      // Get all bookings made by this agent in the selected month
      const bookings = await db.booking.findMany({
        where: {
          bookedById: agent.id,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          isArchived: false,
        },
        include: {
          employee: {
            include: { office: true },
          },
          airline: true,
          loan: true,
          histories: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get any existing commission payment status for this agent and month
      const payment = await db.agentCommissionPayment.findUnique({
        where: {
          agentId_monthYear: {
            agentId: agent.id,
            monthYear: selectedMonth,
          },
        },
      });

      const totalBookings = bookings.length;
      const fullyPaidBookingsCount = bookings.filter(b => b.loan && b.loan.status === "FULLY_PAID").length;
      const totalRebookings = bookings.reduce((sum, b) => sum + b.histories.length, 0);
      
      // Calculate commission: use the locked amount if paid, otherwise calculate in real-time based on fully paid bookings
      const activeRate = payment ? payment.paidRate : generalRate;
      const commissionAmount = payment ? payment.amount : (fullyPaidBookingsCount * activeRate);

      return {
        ...agent,
        bookings,
        totalBookings,
        fullyPaidBookingsCount,
        totalRebookings,
        commissionAmount,
        commissionRate: activeRate,
        paymentStatus: payment ? "PAID" : "UNPAID",
        paymentDetails: payment ? {
          paidAt: payment.paidAt,
          paidById: payment.paidById,
          paidRate: payment.paidRate,
          amount: payment.amount,
          remarks: payment.remarks,
        } : null,
      };
    })
  );

  // Server Action to mark commission as Paid
  async function markAsPaidAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "CASHIER")) {
      throw new Error("Unauthorized");
    }

    const agentId = formData.get("agentId");
    const monthYear = formData.get("monthYear");
    const rate = parseFloat(formData.get("rate") || "0");
    const amount = parseFloat(formData.get("amount") || "0");
    const bookingCount = parseInt(formData.get("bookingCount") || "0");
    const remarks = formData.get("remarks")?.trim() || "";

    if (!agentId || !monthYear || isNaN(rate) || isNaN(amount)) {
      return { error: "Missing required payment fields." };
    }

    try {
      const agent = await db.user.findUnique({ where: { id: agentId } });
      if (!agent) return { error: "Agent not found." };

      await db.agentCommissionPayment.upsert({
        where: {
          agentId_monthYear: {
            agentId,
            monthYear,
          },
        },
        update: {
          status: "PAID",
          paidAt: new Date(),
          paidById: session.id,
          paidRate: rate,
          amount,
          bookingCount,
          remarks,
        },
        create: {
          agentId,
          monthYear,
          status: "PAID",
          paidAt: new Date(),
          paidById: session.id,
          paidRate: rate,
          amount,
          bookingCount,
          remarks,
        },
      });

      await logAction(
        session.id,
        "PAYMENT",
        "USER",
        `Marked commission for agent "${agent.name}" for period ${monthYear} as PAID (Amount: ₱${amount.toLocaleString()}, Bookings: ${bookingCount}, Rate: ₱${rate}).`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to process commission payment." };
    }

    revalidatePath("/commissions");
  }

  // Server Action to revert payment back to Unpaid
  async function revertToUnpaidAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "CASHIER")) {
      throw new Error("Unauthorized");
    }

    const agentId = formData.get("agentId");
    const monthYear = formData.get("monthYear");

    if (!agentId || !monthYear) {
      return { error: "Missing required reference fields." };
    }

    try {
      const agent = await db.user.findUnique({ where: { id: agentId } });
      if (!agent) return { error: "Agent not found." };

      await db.agentCommissionPayment.delete({
        where: {
          agentId_monthYear: {
            agentId,
            monthYear,
          },
        },
      });

      await logAction(
        session.id,
        "UPDATE",
        "USER",
        `Reverted commission status for agent "${agent.name}" for period ${monthYear} to UNPAID.`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to revert commission status." };
    }

    revalidatePath("/commissions");
  }

  return (
    <AppLayout user={session}>
      <CommissionsDashboardClient
        agentsData={agentsData}
        session={session}
        selectedMonth={selectedMonth}
        markAsPaidAction={markAsPaidAction}
        revertToUnpaidAction={revertToUnpaidAction}
      />
    </AppLayout>
  );
}
