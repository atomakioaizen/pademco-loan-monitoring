"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function encodeOldLoanAction(formData) {
  const session = await getSession();
  if (!session || session.role !== "BOOKKEEPER") {
    return { error: "Only Bookkeepers can perform encoding and edit actions. Admin access is view-only." };
  }

  const recordId = formData.get("id")?.trim() || null;
  const employeeId = formData.get("employeeId");
  const ticketDateStr = formData.get("ticketDate");
  const checkNumber = formData.get("checkNumber")?.trim() || null;
  const drAmount = parseFloat(formData.get("drAmount") || "0");
  const markupAmount = parseFloat(formData.get("markupAmount") || "0");
  const totalTicketAmountRaw = formData.get("totalTicketAmount");
  const totalTicketAmount = totalTicketAmountRaw ? parseFloat(totalTicketAmountRaw) : (drAmount + markupAmount);
  const penaltyAmount = parseFloat(formData.get("penaltyAmount") || "0");
  const paymentDateStr = formData.get("paymentDateStr")?.trim() || null;
  const orNumber = formData.get("orNumber")?.trim() || null;
  const paidTotal = parseFloat(formData.get("paidTotal") || "0");
  const unpaidBalanceRaw = formData.get("unpaidBalance");
  const unpaidBalance = unpaidBalanceRaw ? parseFloat(unpaidBalanceRaw) : Math.max(0, totalTicketAmount + penaltyAmount - paidTotal);
  const remarks = formData.get("remarks")?.trim() || null;

  if (!employeeId || !totalTicketAmount || totalTicketAmount <= 0) {
    return { error: "Please select employee and enter total ticket amount." };
  }

  const ticketDate = ticketDateStr ? new Date(ticketDateStr) : new Date();

  try {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return { error: "Employee not found." };
    }

    let record;
    if (recordId) {
      record = await db.oldLoan.update({
        where: { id: recordId },
        data: {
          employeeId,
          payeeName: employee.fullName,
          ticketDate,
          checkNumber,
          drAmount,
          markupAmount,
          totalTicketAmount,
          penaltyAmount,
          paymentDateStr,
          orNumber,
          paidTotal,
          unpaidBalance,
          estimatedAmount: totalTicketAmount,
          dateSince: ticketDate,
          remarks,
          encodedById: session.id,
        },
      });
    } else {
      record = await db.oldLoan.create({
        data: {
          employeeId,
          payeeName: employee.fullName,
          ticketDate,
          checkNumber,
          drAmount,
          markupAmount,
          totalTicketAmount,
          penaltyAmount,
          paymentDateStr,
          orNumber,
          paidTotal,
          unpaidBalance,
          totalOldLoans: 1,
          estimatedAmount: totalTicketAmount,
          dateSince: ticketDate,
          remarks,
          encodedById: session.id,
        },
      });
    }

    await logAction(
      session.id,
      recordId ? "UPDATE" : "CREATE",
      "LOAN",
      `${recordId ? 'Updated' : 'Encoded'} old ticket loan for "${employee.fullName}" (Total: ₱${totalTicketAmount.toLocaleString()}, Unpaid: ₱${unpaidBalance.toLocaleString()}).`
    );

    revalidatePath("/bookkeeper");
    revalidatePath("/bookings");
    return { success: true };
  } catch (error) {
    console.error("Error encoding old loan:", error);
    return { error: "Failed to save old loan record." };
  }
}

export async function deleteOldLoanAction(id) {
  const session = await getSession();
  if (!session || session.role !== "BOOKKEEPER") {
    return { error: "Only Bookkeepers can delete records. Admin access is view-only." };
  }

  try {
    const oldLoan = await db.oldLoan.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!oldLoan) {
      return { error: "Record not found." };
    }

    await db.oldLoan.delete({
      where: { id },
    });

    // Check if employee has any remaining unpaid old loans
    const remainingUnpaid = await db.oldLoan.count({
      where: { employeeId: oldLoan.employeeId, unpaidBalance: { gt: 0 } }
    });

    // Only delete approval requests if employee has NO unpaid old loans left
    if (remainingUnpaid === 0) {
      await db.oldLoanRequest.deleteMany({
        where: { employeeId: oldLoan.employeeId },
      });
    }

    await logAction(
      session.id,
      "DELETE",
      "LOAN",
      `Deleted old ticket loan record for borrower "${oldLoan.employee ? oldLoan.employee.fullName : oldLoan.payeeName}".`
    );

    revalidatePath("/bookkeeper");
    revalidatePath("/bookings");
    return { success: true };
  } catch (error) {
    console.error("Error deleting old loan:", error);
    return { error: "Failed to delete old loan record." };
  }
}

export async function reviewRequestAction(formData) {
  const session = await getSession();
  if (!session || session.role !== "BOOKKEEPER") {
    return { error: "Only Bookkeepers can review and decide on booking override requests. Admin access is view-only." };
  }

  const requestId = formData.get("requestId");
  const status = formData.get("status"); // "APPROVED" or "REJECTED"
  const remarks = formData.get("remarks")?.trim() || null;

  if (!requestId || !["APPROVED", "REJECTED"].includes(status)) {
    return { error: "Invalid parameters." };
  }

  try {
    const request = await db.oldLoanRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!request) {
      return { error: "Request not found." };
    }

    await db.oldLoanRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: session.id,
        reviewedAt: new Date(),
        remarks,
      },
    });

    await logAction(
      session.id,
      "UPDATE",
      "BOOKING",
      `Reviewed old loan request for borrower "${request.employee.fullName}" - ${status} (${remarks || 'No remarks'}).`
    );

    revalidatePath("/bookkeeper");
    revalidatePath("/bookings");
    return { success: true };
  } catch (error) {
    console.error("Error reviewing request:", error);
    return { error: "Failed to submit request review." };
  }
}
