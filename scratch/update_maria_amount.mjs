import fs from "fs";
import path from "path";

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

  console.log("=== Updating Maria Santos dela Cruz's Old Loan Amount ===");

  const emp = await db.employee.findFirst({
    where: { fullName: { contains: "Maria Santos", mode: "insensitive" } },
  });

  if (!emp) {
    console.error("Employee not found");
    process.exit(1);
  }

  await db.oldLoan.update({
    where: { employeeId: emp.id },
    data: {
      estimatedAmount: 45000.00,
    },
  });

  console.log("✅ Updated Maria's estimatedAmount to 45000.00!");

  await db.$disconnect();
}

main().catch(console.error);
