import { db } from "./src/lib/db.js";

async function main() {
  const loans = await db.loan.findMany({
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
  .finally(() => db.$disconnect());
