const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  console.log("System Settings:", settings);
  
  const users = await prisma.user.findMany({
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
  prisma.$disconnect();
});
