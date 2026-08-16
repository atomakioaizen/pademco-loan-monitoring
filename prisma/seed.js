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

  // ─── STEP 6: SEED BASELINE EMPLOYEES ───────────────────────────────────────
  console.log("📋 Seeding Baseline Employees...");
  const penroOffice = await prisma.office.findFirst({ where: { name: "PENRO Palawan" } });

  const clientEmployeesData = [
    { fullName: "PEDRO VELASCO", position: "Forest Ranger" },
    { fullName: "TERESA AYSON", position: "Administrative Aide" },
    { fullName: "RONIE GANDEZA", position: "EMS Officer" },
    { fullName: "GLENDA SANCHEZ", position: "Land Management Officer" },
    { fullName: "EPHRAIM OCOP", position: "Cartographer" },
    { fullName: "LIM BRYAN KUTAT", position: "Senior Forest Specialist" },
  ];

  let empCounter = 1001;
  for (const emp of clientEmployeesData) {
    const createdEmp = await prisma.employee.create({
      data: {
        employeeId: `EMP-${empCounter++}`,
        fullName: emp.fullName,
        position: emp.position,
        contactNumber: "09170000000",
        officeId: penroOffice.id,
      },
    });

    // Also link a VIEWER user account to each employee so they appear in borrower dropdowns
    await prisma.user.create({
      data: {
        username: emp.fullName.toLowerCase().replace(/\s+/g, "."),
        name: emp.fullName,
        passwordHash: hashPassword("pademco123"),
        role: "VIEWER",
        status: "APPROVED",
        employeeId: createdEmp.id,
      },
    });
  }

  console.log("\n✅ DB CLEANUP & RESEED COMPLETE!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  USER ACCOUNTS SEEDED (Password for all: pademco123):");
  console.log("  🛡️  Admin:      DENR Pademco");
  console.log("  📚 Bookkeeper: bookkeeper");
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
