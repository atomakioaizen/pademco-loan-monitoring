import { db } from "../src/lib/db.js";

async function measure() {
  console.log("Starting latency measurements...");
  
  const startTotal = Date.now();
  
  const start1 = Date.now();
  const offices = await db.office.findMany();
  console.log(`Query 1 (offices.findMany) took: ${Date.now() - start1}ms`);

  const start2 = Date.now();
  const employees = await db.employee.findMany();
  console.log(`Query 2 (employees.findMany) took: ${Date.now() - start2}ms`);

  const start3 = Date.now();
  const bookings = await db.booking.findMany({ take: 5 });
  console.log(`Query 3 (bookings.findMany) took: ${Date.now() - start3}ms`);

  const start4 = Date.now();
  const loans = await db.loan.findMany({ take: 5 });
  console.log(`Query 4 (loans.findMany) took: ${Date.now() - start4}ms`);
  
  console.log(`Sequential total: ${Date.now() - startTotal}ms`);

  // Parallel measurement
  const startParallel = Date.now();
  await Promise.all([
    db.office.findMany(),
    db.employee.findMany(),
    db.booking.findMany({ take: 5 }),
    db.loan.findMany({ take: 5 })
  ]);
  console.log(`Parallel (Promise.all) total: ${Date.now() - startParallel}ms`);
}

measure()
  .catch(console.error)
  .finally(() => db.$disconnect());
