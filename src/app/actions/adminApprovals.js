"use server";

import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function approveUserAction(userId) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized access." };
  }

  try {
    const pendingUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!pendingUser) {
      return { error: "User registration request not found." };
    }

    // Case-insensitive duplicate username check
    const allUsers = await db.user.findMany();
    const duplicateUserByUsername = allUsers.find(
      (u) => u.username.toLowerCase() === pendingUser.username.toLowerCase() && u.id !== userId
    );

    if (duplicateUserByUsername) {
      return { error: `Cannot approve. The username "${pendingUser.username}" has already been taken by another account.` };
    }

    // Case-insensitive duplicate full name check
    const duplicateUserByName = allUsers.find(
      (u) => u.name.toLowerCase() === pendingUser.name.toLowerCase() && u.id !== userId
    );
    const allEmployees = await db.employee.findMany();
    const duplicateEmployeeByName = allEmployees.find(
      (e) => e.fullName.toLowerCase() === pendingUser.name.toLowerCase() && (pendingUser.employeeId ? e.id !== pendingUser.employeeId : true)
    );

    if (duplicateUserByName || duplicateEmployeeByName) {
      return { error: `Cannot approve. The full name "${pendingUser.name}" has already been taken by another account.` };
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { status: "APPROVED" },
    });

    await logAction(session.id, "UPDATE", "USER", `Admin approved registration request for ${user.username}.`);
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("approveUserAction error:", error);
    return { error: "Failed to approve registration." };
  }
}

export async function declineUserAction(userId) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized access." };
  }

  try {
    const user = await db.user.update({
      where: { id: userId },
      data: { status: "DECLINED" },
    });

    await logAction(session.id, "UPDATE", "USER", `Admin declined registration request for ${user.username}.`);
    
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("declineUserAction error:", error);
    return { error: "Failed to decline registration." };
  }
}
