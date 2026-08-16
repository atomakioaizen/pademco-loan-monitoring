import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/postgres";

  try {
    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl:
        dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ["error"] });
  } catch (e) {
    console.warn("Failed to create PrismaPg adapter:", e);
    const pool = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@localhost:5432/postgres",
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ["error"] });
  }
}

export const db =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
