import { defineConfig } from "prisma/config";

// Dynamically import dotenv if available (for local development/migrations)
try {
  require("dotenv").config();
} catch (e) {
  // Ignore if dotenv is not available (like on Vercel production where variables are pre-injected)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node ./prisma/seed.js",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
