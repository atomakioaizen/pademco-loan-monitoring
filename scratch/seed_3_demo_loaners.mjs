process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

import { db as prisma } from "../src/lib/db.js";
import crypto from "crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🧼 Cleaning all existing transaction & loaner records...");

  // Delete transaction tables first
  await prisma.agentCommissionPayment.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.oldLoanPayment.deleteMany({});
  await prisma.oldLoanRequest.deleteMany({});
  await prisma.oldLoan.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.bookingHistory.deleteMany({});
  await prisma.booking.deleteMany({});

  // Delete non-staff user accounts (VIEWER / PENDING) and employees
  await prisma.user.deleteMany({
    where: { role: "VIEWER" }
  });
  await prisma.employee.deleteMany({});

  // Ensure staff accounts exist (Admin, Bookkeeper, Agent, Cashier)
  const defaultPass = hashPassword("pademco123");

  await prisma.user.upsert({
    where: { username: "DENR Pademco" },
    update: {},
    create: {
      username: "DENR Pademco",
      name: "DENR Pademco Admin",
      passwordHash: defaultPass,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  const bookkeeper = await prisma.user.upsert({
    where: { username: "bookkeeper" },
    update: {},
    create: {
      username: "bookkeeper",
      name: "Maria Santos (Bookkeeper)",
      passwordHash: defaultPass,
      role: "BOOKKEEPER",
      status: "APPROVED",
    },
  });

  const agent = await prisma.user.upsert({
    where: { username: "agent" },
    update: {},
    create: {
      username: "agent",
      name: "Juan Dela Cruz (Agent)",
      passwordHash: defaultPass,
      role: "AGENT",
      status: "APPROVED",
    },
  });

  await prisma.user.upsert({
    where: { username: "cashier" },
    update: {},
    create: {
      username: "cashier",
      name: "Ana Reyes (Cashier)",
      passwordHash: defaultPass,
      role: "CASHIER",
      status: "APPROVED",
    },
  });

  // Ensure offices and airlines exist
  let penro = await prisma.office.findFirst({ where: { name: "PENRO Palawan" } });
  if (!penro) penro = await prisma.office.create({ data: { name: "PENRO Palawan" } });

  let cenroPps = await prisma.office.findFirst({ where: { name: "CENRO Puerto Princesa" } });
  if (!cenroPps) cenroPps = await prisma.office.create({ data: { name: "CENRO Puerto Princesa" } });

  let cenroBrookes = await prisma.office.findFirst({ where: { name: "CENRO Brookes Point" } });
  if (!cenroBrookes) cenroBrookes = await prisma.office.create({ data: { name: "CENRO Brookes Point" } });

  let pal = await prisma.airline.findFirst({ where: { name: "Philippine Airlines" } });
  if (!pal) pal = await prisma.airline.create({ data: { name: "Philippine Airlines" } });

  let ceb = await prisma.airline.findFirst({ where: { name: "Cebu Pacific" } });
  if (!ceb) ceb = await prisma.airline.create({ data: { name: "Cebu Pacific" } });

  const loanerPass = hashPassword("employee123");

  // ─── LOANER 1: JUAN DELA CRUZ (WITH OLD LOAN) ────────────────────────────
  console.log("👤 Creating Loaner 1: Juan Dela Cruz (With Old Loan)...");
  const emp1 = await prisma.employee.create({
    data: {
      employeeId: "EMP-1001",
      fullName: "JUAN DELA CRUZ",
      officeId: penro.id,
      position: "Forest Ranger",
      contactNumber: "09171234561",
      birthDate: "1988-04-12",
      gender: "Male",
      email: "juan.delacruz@denr.gov.ph",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      username: "juan.delacruz",
      name: "JUAN DELA CRUZ",
      passwordHash: loanerPass,
      role: "VIEWER",
      status: "APPROVED",
      employeeId: emp1.id,
    },
  });

  await prisma.oldLoan.create({
    data: {
      employeeId: emp1.id,
      totalOldLoans: 1,
      estimatedAmount: 35000.0,
      dateSince: new Date("2025-01-15"),
      remarks: "Pre-existing legacy ticket debt encoded by Bookkeeper from manual ledger.",
      encodedById: bookkeeper.id,
    },
  });

  // ─── LOANER 2: MARIA SANTOS (REGULAR ACTIVE LOAN - ON-TIME) ───────────────
  console.log("👤 Creating Loaner 2: Maria Santos (Regular Active Loan)...");
  const emp2 = await prisma.employee.create({
    data: {
      employeeId: "EMP-1002",
      fullName: "MARIA SANTOS",
      officeId: cenroPps.id,
      position: "Administrative Officer",
      contactNumber: "09171234562",
      birthDate: "1992-08-20",
      gender: "Female",
      email: "maria.santos@denr.gov.ph",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      username: "maria.santos",
      name: "MARIA SANTOS",
      passwordHash: loanerPass,
      role: "VIEWER",
      status: "APPROVED",
      employeeId: emp2.id,
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      referenceNumber: "PNR-MNL-PPS-8888",
      employeeId: emp2.id,
      airlineId: pal.id,
      destination: "Manila (MNL) to Palawan (PPS)",
      travelDate: new Date("2026-08-25"),
      outboundTime: "08:30",
      ticketCost: 6500.0,
      serviceFee: 500.0,
      baggageFee: 800.0,
      insuranceFee: 200.0,
      tripType: "ONE_WAY",
      flightCount: 1,
      remarks: "Official travel booking for DENR seminar",
      checkNumber: "CHK-2026-0888",
      bookedById: agent.id,
    },
  });

  const dueDate2 = new Date();
  dueDate2.setMonth(dueDate2.getMonth() + 1);

  await prisma.loan.create({
    data: {
      bookingId: booking2.id,
      principalAmount: 8000.0,
      interestType: "PERCENT",
      interestRate: 0,
      interestAmount: 0,
      totalAmountPayable: 8000.0,
      monthlyInstallment: 8000.0,
      remainingBalance: 8000.0,
      dueDate: dueDate2,
      status: "ACTIVE",
    },
  });

  // ─── LOANER 3: PEDRO REYES (OVERDUE LOAN - LAMPAS NA SA MONTH) ────────────
  console.log("👤 Creating Loaner 3: Pedro Reyes (Overdue Loan - 2 Months Late)...");
  const emp3 = await prisma.employee.create({
    data: {
      employeeId: "EMP-1003",
      fullName: "PEDRO REYES",
      officeId: cenroBrookes.id,
      position: "EMS Specialist",
      contactNumber: "09171234563",
      birthDate: "1985-11-05",
      gender: "Male",
      email: "pedro.reyes@denr.gov.ph",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      username: "pedro.reyes",
      name: "PEDRO REYES",
      passwordHash: loanerPass,
      role: "VIEWER",
      status: "APPROVED",
      employeeId: emp3.id,
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      referenceNumber: "PNR-MNL-CEB-9999",
      employeeId: emp3.id,
      airlineId: ceb.id,
      destination: "Manila (MNL) to Cebu (CEB) (RT: Cebu (CEB) to Manila (MNL))",
      travelDate: new Date("2026-05-10"),
      outboundTime: "10:15",
      returnDate: new Date("2026-05-15"),
      returnTime: "16:45",
      ticketCost: 12000.0,
      serviceFee: 500.0,
      baggageFee: 1000.0,
      insuranceFee: 500.0,
      tripType: "ROUND_TRIP",
      flightCount: 2,
      remarks: "Field inspection roundtrip travel",
      checkNumber: "CHK-2026-0999",
      bookedById: agent.id,
    },
  });

  // Overdue date: 2 months ago (June 15, 2026)
  const overdueDate = new Date("2026-06-15");

  await prisma.loan.create({
    data: {
      bookingId: booking3.id,
      principalAmount: 14000.0,
      interestType: "PERCENT",
      interestRate: 0,
      interestAmount: 0,
      totalAmountPayable: 14000.0,
      monthlyInstallment: 14000.0,
      remainingBalance: 14000.0,
      dueDate: overdueDate,
      status: "OVERDUE",
    },
  });

  console.log("✅ Successfully seeded 3 test loaner accounts and reset database!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
