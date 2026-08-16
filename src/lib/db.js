import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis;

function createPrismaClient() {
  let dbPath = path.join(process.cwd(), "prisma", "dev.db");

  if (!fs.existsSync(dbPath)) {
    const altPath = path.join("/tmp", "dev.db");
    if (fs.existsSync(altPath)) {
      dbPath = altPath;
    }
  }

  const sqlite = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(sqlite);
  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

export const db =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
