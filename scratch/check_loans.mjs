import { db } from "../src/lib/db.js";

async function main() {
  const employees = await db.employee.findMany();
  console.log("Employees:", employees.map(e => ({ id: e.id, name: e.fullName })));

  const bookings = await db.booking.findMany({
    include: {
      loan: true,
      employee: true,
    }
  });
  console.log("Bookings with Loans:");
  for (const b of bookings) {
    console.log({
      id: b.id,
      ref: b.referenceNumber,
      destination: b.destination,
      employee: b.employee.fullName,
      passengerName: b.passengerName,
      ticketCost: b.ticketCost,
      loan: b.loan ? {
        id: b.loan.id,
        principal: b.loan.principalAmount,
        interestAmount: b.loan.interestAmount,
        totalAmountPayable: b.loan.totalAmountPayable,
        monthlyInstallment: b.loan.monthlyInstallment,
        remainingBalance: b.loan.remainingBalance,
        status: b.loan.status,
      } : null
    });
  }
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  db.$disconnect();
});
