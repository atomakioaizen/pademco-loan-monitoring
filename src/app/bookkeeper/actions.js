"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function encodeOldLoanAction(formData) {
  const session = await getSession();
  if (!session || (session.role !== "BOOKKEEPER" && session.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }

  const employeeId = formData.get("employeeId");
  const estimatedAmountRaw = formData.get("estimatedAmount");
  const estimatedAmount = estimatedAmountRaw ? parseFloat(estimatedAmountRaw) : null;
  const dateSinceStr = formData.get("dateSince");
  const remarks = formData.get("remarks")?.trim() || null;

  if (!employeeId || !estimatedAmount || estimatedAmount <= 0 || !dateSinceStr) {
    return { error: "Please provide employee, total amount owed, and oldest loan date." };
  }

  const dateSince = new Date(dateSinceStr);

  try {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return { error: "Employee not found." };
    }

    const oldLoan = await db.oldLoan.upsert({
      where: { employeeId },
      update: {
        totalOldLoans: 1,
        estimatedAmount,
        dateSince,
        remarks,
        encodedById: session.id,
      },
      create: {
        employeeId,
        totalOldLoans: 1,
        estimatedAmount,
        dateSince,
        remarks,
        encodedById: session.id,
      },
    });

    await logAction(
      session.id,
      "CREATE",
      "LOAN",
      `Encoded/updated old loan record for employee "${employee.fullName}" (Total owed: ₱${estimatedAmount?.toLocaleString()} since ${dateSinceStr}).`
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
  if (!session || (session.role !== "BOOKKEEPER" && session.role !== "ADMIN")) {
    throw new Error("Unauthorized");
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

    // Also delete any existing request for this employee
    await db.oldLoanRequest.deleteMany({
      where: { employeeId: oldLoan.employeeId },
    });

    await logAction(
      session.id,
      "DELETE",
      "LOAN",
      `Deleted old loan record and requests for employee "${oldLoan.employee.fullName}".`
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
  if (!session || (session.role !== "BOOKKEEPER" && session.role !== "ADMIN")) {
    throw new Error("Unauthorized");
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
