/**
 * Demo Seed Script: Create exactly 2 OVERDUE loans for aizen, clearing previous history
 * Run: node scripts/seed_aizen_demo.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Cleaning up old aizen booking & payment records...");

  // 1. Find user & employee
  const aizenUser = await db.user.findFirst({
    where: { username: "aizen" },
    include: { employee: true },
  });

  if (!aizenUser || !aizenUser.employee) {
    console.error("❌ User 'aizen' or employee record not found!");
    process.exit(1);
  }
  const empId = aizenUser.employee.id;

  // Find all bookings for this employee to clean them and their loans/payments/histories
  const aizenBookings = await db.booking.findMany({
    where: { employeeId: empId }
  });
  const bookingIds = aizenBookings.map(b => b.id);

  if (bookingIds.length > 0) {
    // Delete payments first
    const loans = await db.loan.findMany({ where: { bookingId: { in: bookingIds } } });
    const loanIds = loans.map(l => l.id);
    if (loanIds.length > 0) {
      await db.payment.deleteMany({ where: { loanId: { in: loanIds } } });
    }
    await db.loan.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await db.bookingHistory.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }
  console.log("✅ History cleaned successfully.");

  // Helper date generators
  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  // Find or create airlines
  async function upsertAirline(name) {
    return db.airline.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const cebupac = await upsertAirline("Cebu Pacific");
  const pal = await upsertAirline("Philippine Airlines");

  // ── LOAN #1: 1 Month Delay (Due 35 days ago, created 45 days ago) ────────────
  const cost1 = 4200;
  const fee1 = 500;
  const principal1 = cost1 + fee1; // 4700
  const interest1 = principal1 * 0.01; // 47
  const total1 = principal1 + interest1; // 4747

  const booking1 = await db.booking.create({
    data: {
      referenceNumber: "5J-MNL-PPS-DELAY1",
      employeeId: empId,
      airlineId: cebupac.id,
      destination: "Manila (MNL) to Palawan (PPS)",
      travelDate: daysAgo(40),
      outboundTime: "08:30",
      ticketCost: cost1,
      serviceFee: fee1,
      tripType: "ONE_WAY",
      flightCount: 1,
      remarks: "Official travel for Palawan field check",
      createdAt: daysAgo(45),
    }
  });

  await db.loan.create({
    data: {
      bookingId: booking1.id,
      principalAmount: principal1,
      interestType: "PERCENT",
      interestRate: 1.0,
      interestAmount: interest1,
      totalAmountPayable: total1,
      monthlyInstallment: total1,
      remainingBalance: total1,
      dueDate: daysAgo(35), // Overdue by just over 1 month
      status: "OVERDUE",
      createdAt: daysAgo(45),
    }
  });
  console.log("✅ Created Loan #1: 5J-MNL-PPS-DELAY1 (1 Month Delay)");

  // ── LOAN #2: 2 Months Delay (Due 65 days ago, created 75 days ago) ───────────
  const cost2 = 6100;
  const fee2 = 500;
  const principal2 = cost2 + fee2; // 6600
  const interest2 = principal2 * 0.01; // 66
  const total2 = principal2 + interest2; // 6666

  const booking2 = await db.booking.create({
    data: {
      referenceNumber: "PR-PPS-MNL-DELAY2",
      employeeId: empId,
      airlineId: pal.id,
      destination: "Palawan (PPS) to Manila (MNL)",
      travelDate: daysAgo(70),
      outboundTime: "13:15",
      ticketCost: cost2,
      serviceFee: fee2,
      tripType: "ONE_WAY",
      flightCount: 1,
      remarks: "Official travel to Manila central office",
      createdAt: daysAgo(75),
    }
  });

  await db.loan.create({
    data: {
      bookingId: booking2.id,
      principalAmount: principal2,
      interestType: "PERCENT",
      interestRate: 1.0,
      interestAmount: interest2,
      totalAmountPayable: total2,
      monthlyInstallment: total2,
      remainingBalance: total2,
      dueDate: daysAgo(65), // Overdue by just over 2 months
      status: "OVERDUE",
      createdAt: daysAgo(75),
    }
  });
  console.log("✅ Created Loan #2: PR-PPS-MNL-DELAY2 (2 Months Delay)");

  console.log("\n🎉 Done seeding exactly 2 overdue loans for aizen!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
