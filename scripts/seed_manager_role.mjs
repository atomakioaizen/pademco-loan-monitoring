import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Load .env
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[k.trim()] = val;
  }
});

const { db } = await import('../src/lib/db.js');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function seedManager() {
  console.log('--- SEEDING DEMO MANAGER ACCOUNT ---');
  
  const passwordHash = hashPassword('pademco123');

  const managerUser = await db.user.upsert({
    where: { username: 'manager' },
    update: {
      name: 'Manager Overview',
      passwordHash,
      role: 'MANAGER',
      status: 'APPROVED',
    },
    create: {
      username: 'manager',
      name: 'Manager Overview',
      passwordHash,
      role: 'MANAGER',
      status: 'APPROVED',
    },
  });

  console.log('========================================');
  console.log('  MANAGER ACCOUNT CREATED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`  Username: manager`);
  console.log(`  Password: pademco123`);
  console.log(`  Role:     MANAGER`);
  console.log('========================================\n');

  process.exit(0);
}

seedManager().catch(err => {
  console.error('Error seeding manager account:', err);
  process.exit(1);
});
