import { db } from "./src/lib/db.js";

async function main() {
  const activeLoansRaw = await db.loan.findMany({
    where: {
      remainingBalance: { gt: 0 },
    },
    include: {
      booking: {
        include: { employee: true },
      },
    },
  });
  const uniqueEmployees = [];
  const empIdsSeen = new Set();
  activeLoansRaw.forEach((loan) => {
    const emp = loan.booking?.employee;
    if (emp && !empIdsSeen.has(emp.id)) {
      empIdsSeen.add(emp.id);
      uniqueEmployees.push(emp);
    }
  });
  console.log("uniqueEmployees length:", uniqueEmployees.length);
  uniqueEmployees.forEach(e => console.log("Employee:", e.id, e.fullName));
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
