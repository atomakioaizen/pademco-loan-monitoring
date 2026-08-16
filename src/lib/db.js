import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis;

function createPrismaClient() {
  let dbPath = path.join(process.cwd(), "prisma", "dev.db");

  if (process.env.VERCEL) {
    const tmpPath = path.join("/tmp", "dev.db");
    if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, tmpPath);
      } catch (e) {
        console.warn("Could not copy sqlite db to /tmp:", e);
      }
    }
    if (fs.existsSync(tmpPath)) {
      dbPath = tmpPath;
    }
  }

  try {
    const sqlite = new Database(dbPath);
    const adapter = new PrismaBetterSqlite3(sqlite);
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  } catch (e) {
    return new PrismaClient({ log: ["error"] });
  }
}

export const db =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
