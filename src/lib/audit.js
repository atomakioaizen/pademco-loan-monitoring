import { db } from "./db";

export async function logAction(userId, action, resource, details) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details: typeof details === "object" ? JSON.stringify(details) : details,
      },
    });
  } catch (e) {
    console.error("Audit logging failed:", e);
  }
}
