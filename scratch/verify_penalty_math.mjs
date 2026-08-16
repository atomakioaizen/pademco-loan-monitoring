import { db } from "../src/lib/db.js";
import { calculateAccruedPenalty, getMonthsDelayed } from "../src/lib/penalty.js";

async function verify() {
  console.log("🔍 Checking Pedro Reyes Overdue Penalty Calculation...\n");

  const pedro = await db.employee.findFirst({
    where: { fullName: { contains: "PEDRO REYES" } },
    include: {
      bookings: {
        include: { loan: true }
      }
    }
  });

  if (!pedro || !pedro.bookings[0]) {
    console.log("❌ Pedro Reyes not found!");
    return;
  }

  const loan = pedro.bookings[0].loan;
  console.log("Borrower:", pedro.fullName);
  console.log("Loan Status:", loan.status);
  console.log("Due Date:", loan.dueDate.toISOString().substring(0, 10));
  console.log("Remaining Balance: ₱" + loan.remainingBalance.toLocaleString());

  const months = getMonthsDelayed(loan.dueDate);
  const accruedPenalty = calculateAccruedPenalty(loan);

  console.log(`\n⏱️ Months Delayed: ${months} Month(s)`);
  console.log(`💸 Accrued Penalty Rate: ${months}% (1% per month)`);
  console.log(`💰 Accrued Penalty Amount: ₱${accruedPenalty.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`🏷️ Total Full Settlement Required: ₱${(loan.remainingBalance + accruedPenalty).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
}

verify().finally(() => db.$disconnect());
