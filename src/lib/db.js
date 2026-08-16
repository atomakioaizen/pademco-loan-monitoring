import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis;

function createPrismaClient() {
  let filePath = process.env.DATABASE_URL || "prisma/dev.db";

  if (filePath.startsWith("file:")) {
    filePath = filePath.replace("file:", "");
  }

  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath);
  }

  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn("Could not create db directory:", e);
    }
  }

  const sqlite = new Database(filePath);
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
