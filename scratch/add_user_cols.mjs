import "dotenv/config";
import { db } from "../src/lib/db.js";

async function main() {
  console.log("Executing ALTER TABLE to ensure createdById and createdByRole exist...");
  console.log("Database URL:", process.env.DATABASE_URL?.substring(0, 30) + "...");
  await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdById" TEXT;`);
  await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdByRole" TEXT;`);
  console.log("SUCCESS: Columns added successfully!");
}

main()
  .catch((e) => {
    console.error("Error executing ALTER TABLE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
