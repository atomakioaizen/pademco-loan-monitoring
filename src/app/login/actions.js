"use server";

import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function loginAction(prevState, formData) {
  const username = formData.get("username")?.trim();
  const password = formData.get("password");

  if (!username || !password) {
    return { error: "Please fill in all fields." };
  }

  try {
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { error: "Invalid username or password." };
    }

    if (user.status === "PENDING") {
      return { error: "Your account is pending Admin approval." };
    }

    if (user.status === "DECLINED") {
      return { error: "Your registration request was declined." };
    }

    await setSessionCookie({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      employeeId: user.employeeId || null,
    });

    await logAction(user.id, "LOGIN", "USER", `User ${user.username} logged in successfully.`);
  } catch (error) {
    console.error("Login Server Action error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }

  // Return redirect target — client handles navigation via router.push()
  return { redirectTo: "/" };
}

export async function logoutAction() {
  try {
    const session = await getSession();
    if (session) {
      await logAction(session.id, "LOGOUT", "USER", `User ${session.username} logged out.`);
    }
  } catch (e) {
    // Ignore error on logout logs
  }
  await clearSessionCookie();
  redirect("/login");
}
