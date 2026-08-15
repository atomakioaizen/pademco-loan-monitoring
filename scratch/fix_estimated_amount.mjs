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

  console.log("=== Checking OldLoan columns in DB ===");

  // Check what columns exist
  const cols = await db.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'OldLoan'
    ORDER BY ordinal_position;
  `);
  console.log("OldLoan columns:", JSON.stringify(cols, null, 2));

  // Try to add column if it doesn't exist
  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "OldLoan" ADD COLUMN IF NOT EXISTS "estimatedAmount" DOUBLE PRECISION;
    `);
    console.log("✅ Column added (or already exists)");
  } catch (e) {
    console.error("Column add error:", e.message);
  }

  // Update Maria's record
  const result = await db.$executeRawUnsafe(`
    UPDATE "OldLoan" ol
    SET "estimatedAmount" = 45000.00
    FROM "Employee" emp
    WHERE ol."employeeId" = emp.id
    AND emp."fullName" ILIKE '%Maria Santos%';
  `);
  console.log("✅ Updated rows:", result);

  // Verify
  const record = await db.$queryRawUnsafe(`
    SELECT ol.*, emp."fullName"
    FROM "OldLoan" ol
    JOIN "Employee" emp ON ol."employeeId" = emp.id
    WHERE emp."fullName" ILIKE '%Maria Santos%';
  `);
  console.log("Maria's OldLoan record:", JSON.stringify(record, null, 2));

  await db.$disconnect();
}

main().catch(console.error);
