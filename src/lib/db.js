import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  // On Vercel cloud environment, use standard Prisma binary library engine (no native C++ sqlite bindings needed)
  if (process.env.VERCEL) {
    return new PrismaClient({ log: ["error"] });
  }

  // On local environment, use PrismaBetterSqlite3 adapter
  try {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const Database = require("better-sqlite3");
    const path = require("path");

    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const sqlite = new Database(dbPath);
    const adapter = new PrismaBetterSqlite3(sqlite);
    return new PrismaClient({ adapter, log: ["error"] });
  } catch (e) {
    return new PrismaClient({ log: ["error"] });
  }
}

export const db = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
