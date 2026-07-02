import { db } from "../src/lib/db.js";

async function main() {
  const settings = await db.systemSetting.findMany();
  console.log("System Settings:", settings);
  
  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      commissionRate: true,
    }
  });
  console.log("Users:", users);
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  db.$disconnect();
});
