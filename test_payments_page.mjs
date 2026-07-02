import { db } from "./src/lib/db.js";

async function main() {
  const activeLoans = await db.loan.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE"] } },
    include: {
      booking: {
        include: {
          employee: {
            include: {
              office: true,
            },
          },
        },
      },
    },
  });
  console.log("activeLoans count:", activeLoans.length);
  activeLoans.forEach(l => {
    console.log(`Loan ID: ${l.id}, Employee: ${l.booking?.employee?.fullName}, Employee Status: ${l.booking?.employee?.status}, booking.isArchived: ${l.booking?.isArchived}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
