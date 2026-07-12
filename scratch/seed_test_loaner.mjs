/**
 * seed_test_loaner.mjs
 * Creates a complete test loaner account with an old loan for feature testing.
 * Run: node scratch/seed_test_loaner.mjs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ── Parse .env ──────────────────────────────────────────────────────────────
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

// ── Hash password (same algorithm as auth.js) ────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const { db } = await import("../src/lib/db.js");

  console.log("🔍 Looking for a BOOKKEEPER user to credit the old loan encoding...");

  // Find or note the admin user (used as encodedBy for the old loan)
  let bookkeeper = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!bookkeeper) bookkeeper = await db.user.findFirst();
  if (!bookkeeper) {
    console.error("❌ No users found. Please ensure at least one admin exists.");
    process.exit(1);
  }
  console.log(`   Using user "${bookkeeper.username}" (${bookkeeper.role}) as the encoder.`);

  // ── 1. Find or create the Office ─────────────────────────────────────────
  console.log("\n📌 Ensuring DENR - Palawan Province office exists...");
  let office = await db.office.findFirst({ where: { name: "DENR - Palawan Province" } });
  if (!office) {
    office = await db.office.create({ data: { name: "DENR - Palawan Province" } });
    console.log(`   ✅ Created office: ${office.name}`);
  } else {
    console.log(`   ✅ Office already exists: ${office.name}`);
  }

  // ── 2. Create the Employee record ─────────────────────────────────────────
  console.log("\n👤 Creating employee record...");
  const EMP_ID = "TEST-2026-001";
  let employee = await db.employee.findUnique({ where: { employeeId: EMP_ID } });

  if (!employee) {
    employee = await db.employee.create({
      data: {
        employeeId:    EMP_ID,
        fullName:      "Maria Santos dela Cruz",
        officeId:      office.id,
        position:      "Forest Management Specialist",
        contactNumber: "09171234567",
        birthDate:     "1988-05-14",
        gender:        "Female",
        email:         "maria.delacruz.test@pademco.gov.ph",
        govIdType:     "SSS",
        govIdNumber:   "34-5678901-2",
        status:        "ACTIVE",
      },
    });
    console.log(`   ✅ Created employee: ${employee.fullName} (${employee.employeeId})`);
  } else {
    console.log(`   ✅ Employee already exists: ${employee.fullName}`);
  }

  // ── 3. Create the User / Login account ───────────────────────────────────
  console.log("\n🔑 Creating loaner user account...");
  const USERNAME  = "maria.delacruz";
  const PASSWORD  = "Test@12345";
  let user = await db.user.findUnique({ where: { username: USERNAME } });

  if (!user) {
    user = await db.user.create({
      data: {
        username:     USERNAME,
        name:         "Maria Santos dela Cruz",
        passwordHash: hashPassword(PASSWORD),
        role:         "VIEWER",      // loaner / borrower role
        status:       "APPROVED",
        employeeId:   employee.id,
      },
    });
    console.log(`   ✅ Created user account: ${user.username} (password: ${PASSWORD})`);
  } else {
    console.log(`   ✅ User already exists: ${user.username}`);
  }

  // ── 4. Create the OldLoan record ─────────────────────────────────────────
  console.log("\n📋 Creating old loan record...");
  let oldLoan = await db.oldLoan.findUnique({ where: { employeeId: employee.id } });

  if (!oldLoan) {
    oldLoan = await db.oldLoan.create({
      data: {
        employeeId:    employee.id,
        totalOldLoans: 3,
        dateSince:     new Date("2021-03-01"),
        remarks:       "Pre-system loans from 2021–2023 fiscal years. Total unpaid balance estimated at ₱45,000.",
        encodedById:   bookkeeper.id,
      },
    });
    console.log(`   ✅ Old loan created: ${oldLoan.totalOldLoans} loans since ${new Date(oldLoan.dateSince).toDateString()}`);
  } else {
    console.log(`   ✅ Old loan already exists for this employee.`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ✅  TEST LOANER ACCOUNT CREATED                    ║
╠══════════════════════════════════════════════════════════════╣
║  Name       :  Maria Santos dela Cruz                        ║
║  Employee ID:  TEST-2026-001                                 ║
║  Office     :  DENR - Palawan Province                       ║
║  Position   :  Forest Management Specialist                  ║
║                                                              ║
║  LOGIN CREDENTIALS                                           ║
║  Username   :  maria.delacruz                                ║
║  Password   :  Test@12345                                    ║
║  Role       :  VIEWER (Loaner / Borrower)                    ║
║  Status     :  APPROVED                                      ║
║                                                              ║
║  OLD LOAN RECORD                                             ║
║  Total Loans:  3 pre-existing loans                          ║
║  Date Since :  March 1, 2021                                 ║
║  Encoded By :  ${bookkeeper.username.padEnd(45)}║
║                                                              ║
║  WHAT TO TEST:                                               ║
║  1. Login as Booking Agent → go to Bookings                  ║
║  2. Select "Maria Santos dela Cruz" from combobox            ║
║  3. Old Loan alert modal should appear                       ║
║  4. Click YES → request should go to Bookkeeper/Admin        ║
║  5. Login as Admin/Bookkeeper → go to Bookkeeper Console     ║
║  6. Approve or Reject the override request                   ║
║  7. Back on Bookings, the lock should lift (if APPROVED)     ║
║  8. Dashboard should show her in "Pre-existing Old Loans"    ║
╚══════════════════════════════════════════════════════════════╝
`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message || e);
  process.exit(1);
});
