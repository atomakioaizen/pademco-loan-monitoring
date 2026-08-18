const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const Database = require("better-sqlite3");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const crypto = require("crypto");

require("dotenv").config();

let prisma;
if (process.env.DATABASE_URL?.startsWith("file:")) {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
  prisma = new PrismaClient({ adapter });
} else {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🚨 Starting PADEMCO DB Setup with Palawan Offices & Admin Account...\n");

  // ─── STEP 1: WIPE ALL TRANSACTION & PROFILE DATA ──────────────────────────
  console.log("🗑️  Wiping transaction & employee data...");
  await prisma.oldLoanPayment.deleteMany({});
  await prisma.oldLoanRequest.deleteMany({});
  await prisma.oldLoan.deleteMany({});
  await prisma.agentCommissionPayment.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingHistory.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.office.deleteMany({});

  // ─── STEP 2: SEED PALAWAN OFFICES ──────────────────────────────────────────
  console.log("🏢  Seeding Palawan offices...");
  const officeNames = [
    "PENRO Palawan",
    "CENRO Coron",
    "CENRO Brookes Point",
    "CENRO Puerto Princesa",
    "CENRO Quezon",
    "CENRO Roxas",
    "CENRO Taytay",
  ];
  for (const name of officeNames) {
    await prisma.office.create({ data: { name } });
  }

  // ─── STEP 3: SEED AIRLINES ─────────────────────────────────────────────
  console.log("✈️  Seeding airlines...");
  const airlineNames = ["Philippine Airlines", "Cebu Pacific", "AirAsia Philippines"];
  for (const name of airlineNames) {
    await prisma.airline.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ─── STEP 4: SEED SYSTEM SETTINGS ─────────────────────────────────────
  console.log("⚙️  Seeding system settings...");
  const sysSettings = [
    { key: "org_name", value: "PADEMCO Multi-Purpose Cooperative" },
    { key: "org_address", value: "DENR Compound, Puerto Princesa City, Palawan" },
    { key: "service_fee", value: "500" },
    { key: "interest_rate", value: "1" },
    { key: "max_active_flights", value: "4" },
    { key: "brand_color", value: "#1e3a8a" },
    { key: "agent_commission_rate", value: "75" },
  ];
  for (const s of sysSettings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }

  // ─── STEP 5: CREATE USER ACCOUNTS FOR ALL ROLES ──────────────────────────
  console.log("👤  Creating User Accounts for all roles...");
  const adminUser = await prisma.user.create({
    data: {
      username: "DENR Pademco",
      name: "DENR Pademco Admin",
      passwordHash: hashPassword("pademco123"),
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  const bookkeeperUser = await prisma.user.create({
    data: {
      username: "bookkeeper",
      name: "Maria Santos (Bookkeeper)",
      passwordHash: hashPassword("pademco123"),
      role: "BOOKKEEPER",
      status: "APPROVED",
    },
  });

  const agentUser = await prisma.user.create({
    data: {
      username: "agent",
      name: "Juan Dela Cruz (Agent)",
      passwordHash: hashPassword("pademco123"),
      role: "AGENT",
      status: "APPROVED",
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      username: "cashier",
      name: "Ana Reyes (Cashier)",
      passwordHash: hashPassword("pademco123"),
      role: "CASHIER",
      status: "APPROVED",
    },
  });

  // ─── STEP 6: SEED DEMO LOANER ACCOUNTS ────────────────────────────────────
  console.log("📋 Seeding Demo Loaner Accounts (juan.delacruz, maria.santos, pedro.reyes)...");
  const penroOffice = await prisma.office.findFirst({ where: { name: "PENRO Palawan" } });
  const cenroPps = await prisma.office.findFirst({ where: { name: "CENRO Puerto Princesa" } });
  const cenroBrookes = await prisma.office.findFirst({ where: { name: "CENRO Brookes Point" } });

  const pal = await prisma.airline.findFirst({ where: { name: "Philippine Airlines" } });
  const ceb = await prisma.airline.findFirst({ where: { name: "Cebu Pacific" } });

  const loanerPass = hashPassword("employee123");

  // 1. JUAN DELA CRUZ (WITH OLD LOAN)
  const emp1 = await prisma.employee.create({
    data: {
      employeeId: "EMP-1001",
      fullName: "JUAN DELA CRUZ",
      officeId: penroOffice.id,
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
      encodedById: bookkeeperUser.id,
    },
  });

  // 2. MARIA SANTOS (REGULAR ACTIVE LOAN)
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
      bookedById: agentUser.id,
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

  // 3. PEDRO REYES (OVERDUE LOAN)
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
      destination: "Manila (MNL) to Cebu (CEB) Roundtrip",
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
      bookedById: agentUser.id,
    },
  });

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
      dueDate: new Date("2026-06-15"),
      status: "OVERDUE",
    },
  });

  // Additional Baseline Employees
  const additionalEmps = [
    { fullName: "PEDRO VELASCO", position: "Forest Ranger" },
    { fullName: "TERESA AYSON", position: "Administrative Aide" },
    { fullName: "RONIE GANDEZA", position: "EMS Officer" },
    { fullName: "GLENDA SANCHEZ", position: "Land Management Officer" },
  ];
  let empCounter = 1004;
  for (const emp of additionalEmps) {
    const createdEmp = await prisma.employee.create({
      data: {
        employeeId: `EMP-${empCounter++}`,
        fullName: emp.fullName,
        position: emp.position,
        contactNumber: "09170000000",
        officeId: penroOffice.id,
      },
    });

    await prisma.user.create({
      data: {
        username: emp.fullName.toLowerCase().replace(/\s+/g, "."),
        name: emp.fullName,
        passwordHash: hashPassword("employee123"),
        role: "VIEWER",
        status: "APPROVED",
        employeeId: createdEmp.id,
      },
    });
  }

  console.log("\n✅ DB CLEANUP & RESEED COMPLETE!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  STAFF ACCOUNTS (Password: pademco123):");
  console.log("  🛡️  Admin:      DENR Pademco");
  console.log("  📚 Bookkeeper: bookkeeper");
  console.log("  🎟️  Agent:      agent");
  console.log("  💵 Cashier:    cashier");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  BORROWER ACCOUNTS (Password: employee123):");
  console.log("  👤 Juan Dela Cruz: juan.delacruz (Old Loan ₱35,000)");
  console.log("  👤 Maria Santos:   maria.santos   (Active Loan ₱8,000)");
  console.log("  👤 Pedro Reyes:    pedro.reyes    (Overdue Loan ₱14,000)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🎟️  Agent:      agent");
  console.log("  💵 Cashier:    cashier");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
