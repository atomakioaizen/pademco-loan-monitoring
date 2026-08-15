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

  console.log("=== Searching for users/employees with 'Maria' ===");

  const employees = await db.employee.findMany({
    where: { fullName: { contains: "Maria", mode: "insensitive" } },
    include: { user: true, oldLoan: true },
  });

  console.log("Employees found:", JSON.stringify(employees, null, 2));

  const users = await db.user.findMany({
    where: { name: { contains: "Maria", mode: "insensitive" } },
    include: { employee: true },
  });

  console.log("Users found:", JSON.stringify(users, null, 2));

  await db.$disconnect();
}

main().catch(console.error);
