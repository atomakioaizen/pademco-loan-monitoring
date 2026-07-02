const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const loans = await prisma.loan.findMany({
    include: {
      booking: {
        include: {
          employee: true
        }
      }
    }
  });
  console.log("Total loans in DB:", loans.length);
  loans.forEach(l => {
    console.log(`Loan ID: ${l.id}, Status: ${l.status}, Balance: ${l.remainingBalance}, Employee: ${l.booking?.employee?.fullName || 'N/A'}, Employee Status: ${l.booking?.employee?.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
