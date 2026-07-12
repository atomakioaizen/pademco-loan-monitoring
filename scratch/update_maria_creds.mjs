import fs from "fs";
import path from "path";
import crypto from "crypto";

const envPath = path.resolve(".env");
fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const t = line.trim().replace(/\r$/, "");
  if (!t || t.startsWith("#")) return;
  const idx = t.indexOf("=");
  if (idx < 0) return;
  const key = t.slice(0, idx).trim();
  let val = t.slice(idx + 1).trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const { db } = await import("../src/lib/db.js");

  const user = await db.user.findUnique({ where: { username: "maria.delacruz" } });
  if (!user) { console.error("User not found"); process.exit(1); }

  await db.user.update({
    where: { id: user.id },
    data: {
      username: "maria",
      passwordHash: hashPassword("maria123"),
    },
  });

  console.log("✅ Maria credentials updated → username: maria | password: maria123");
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
