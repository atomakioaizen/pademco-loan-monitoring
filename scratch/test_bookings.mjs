import fs from "fs";
import path from "path";

// Read and parse .env file
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join("=").trim();
        // Remove trailing \r
        val = val.replace(/\r$/, "");
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  });
}

async function main() {
  try {
    const { db } = await import("../src/lib/db.js");
    console.log("Running page.js parallel query...");
    const [
      settingsList,
      employees,
      activeBookings,
      airlines,
      bookings,
      oldLoans,
      oldLoanRequests
    ] = await Promise.all([
      db.systemSetting.findMany(),
      db.employee.findMany({
        where: {
          status: "ACTIVE",
          user: {
            role: "VIEWER",
            status: "APPROVED"
          }
        },
        orderBy: { fullName: "asc" },
      }),
      db.booking.findMany({
        where: {
          isArchived: false,
          loan: { status: { not: "FULLY_PAID" } }
        },
        select: { employeeId: true, flightCount: true }
      }),
      db.airline.findMany({
        orderBy: { name: "asc" },
      }),
      db.booking.findMany({
        where: { isArchived: false },
        include: {
          employee: { include: { office: true } },
          airline: true,
          loan: true,
          histories: { orderBy: { createdAt: "desc" } }
        },
        orderBy: { createdAt: "desc" },
      }),
      db.oldLoan.findMany(),
      db.oldLoanRequest.findMany({
        where: { requestedById: "some-user-id" }
      })
    ]);

    console.log(`Settings loaded: ${settingsList.length}`);
    console.log(`Employees loaded: ${employees.length}`);
    console.log(`Active bookings: ${activeBookings.length}`);
    console.log(`Airlines loaded: ${airlines.length}`);
    console.log(`Bookings loaded: ${bookings.length}`);
    console.log(`Old loans loaded: ${oldLoans.length}`);
    console.log(`Requests loaded: ${oldLoanRequests.length}`);

    console.log("All mapped successfully.");
  } catch (err) {
    console.error("CRITICAL QUERY FAILURE:", err);
  }
}

main();
