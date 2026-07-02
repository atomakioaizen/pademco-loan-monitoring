const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const crypto = require("crypto");

require("dotenv").config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🚨 Starting PADEMCO DB Setup with Palawan Offices & Admin Account...\n");

  // ─── STEP 1: WIPE ALL TRANSACTION & PROFILE DATA ──────────────────────────
  console.log("🗑️  Wiping transaction & employee data...");
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

  // ─── STEP 5: CREATE NEW ADMIN ACCOUNT ────────────────────────────────────
  console.log("👤  Creating Admin Account...");
  await prisma.user.create({
    data: {
      username: "DENR Pademco",
      name: "DENR Pademco Admin",
      passwordHash: hashPassword("pademco123"),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("\n✅ DB CLEANUP & RESEED COMPLETE!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ADMIN ACCOUNT DETAILS:");
  console.log("  👤 Username: DENR Pademco");
  console.log("  🔑 Password: pademco123");
  console.log("  Role:        ADMIN (ACTIVE)");
  console.log("");
  console.log("  PALAWAN OFFICES SEEDED:");
  officeNames.forEach(o => console.log(`  🏢 ${o}`));
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
