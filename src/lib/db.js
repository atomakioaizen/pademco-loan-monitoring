import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const sqlite = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(sqlite);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
