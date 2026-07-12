import fs from "fs";
import path from "path";

// Parse .env
const envPath = path.resolve(".env");
fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const t = line.trim().replace(/\r$/, "");
  if (!t || t.startsWith("#")) return;
  const idx = t.indexOf("=");
  if (idx < 0) return;
  const key = t.slice(0, idx).trim();
  let val = t.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
});

async function main() {
  const { db } = await import("../src/lib/db.js");

  console.log("=== Diagnosing Maria's account ===\n");

  // 1. Find the User record
  const user = await db.user.findUnique({
    where: { username: "maria.delacruz" },
    include: { employee: { include: { oldLoan: { include: { encodedBy: { select: { name: true } } } } } } },
  });

  if (!user) {
    console.error("❌ User 'maria.delacruz' NOT FOUND in database!");
    process.exit(1);
  }

  console.log("USER RECORD:");
  console.log("  id:", user.id);
  console.log("  username:", user.username);
  console.log("  role:", user.role);
  console.log("  status:", user.status);
  console.log("  user.employeeId:", user.employeeId, "(this is what session.employeeId will be)");
  console.log();

  // 2. Find the Employee record by ID
  if (user.employeeId) {
    const emp = await db.employee.findUnique({
      where: { id: user.employeeId },
      include: { oldLoan: true },
    });
    if (emp) {
      console.log("EMPLOYEE RECORD (by user.employeeId):");
      console.log("  employee.id:", emp.id);
      console.log("  employee.employeeId (string ID):", emp.employeeId);
      console.log("  employee.fullName:", emp.fullName);
      console.log("  employee.oldLoan:", emp.oldLoan ? `✅ EXISTS (totalOldLoans: ${emp.oldLoan.totalOldLoans})` : "❌ NULL - NO OLD LOAN FOUND");
      console.log();
    } else {
      console.error("❌ Employee with id=", user.employeeId, "NOT FOUND!");
    }
  } else {
    console.error("❌ user.employeeId is NULL - session will have no employeeId!");
  }

  // 3. Check OldLoan table directly
  const allOldLoans = await db.oldLoan.findMany({
    include: { employee: { select: { fullName: true, employeeId: true } } },
  });
  console.log("ALL OLD LOANS IN DATABASE:");
  if (allOldLoans.length === 0) {
    console.log("  ❌ NO OLD LOANS EXIST AT ALL");
  } else {
    allOldLoans.forEach(ol => {
      console.log(`  - employeeId (FK): ${ol.employeeId} | borrower: ${ol.employee?.fullName} | total: ${ol.totalOldLoans}`);
    });
  }
  console.log();

  // 4. Simulate the exact query done in page.js
  if (user.employeeId) {
    const simulatedQuery = await db.oldLoan.findUnique({
      where: { employeeId: user.employeeId },
      include: { encodedBy: { select: { name: true, username: true } } },
    });
    console.log("SIMULATED page.js QUERY (findUnique by session.employeeId):");
    console.log("  Query employeeId used:", user.employeeId);
    console.log("  Result:", simulatedQuery ? `✅ FOUND - totalOldLoans: ${simulatedQuery.totalOldLoans}` : "❌ NULL - QUERY RETURNED NOTHING");
  }

  await db.$disconnect();
}

main().catch(e => {
  console.error("Script failed:", e.message);
  process.exit(1);
});
