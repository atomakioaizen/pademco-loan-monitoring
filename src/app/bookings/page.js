import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import BookingsTabsClient from "./BookingsTabsClient";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Booking & Loan Management - PADEMCO",
};

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "AGENT" && session.role !== "ADMIN") redirect("/");

  // Fetch dynamic settings from database
  const settingsList = await db.systemSetting.findMany();
  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  const dynamicServiceFee = parseFloat(settings.service_fee || "500.00");
  const dynamicInterestRate = parseFloat(settings.interest_rate || "1.00");
  const dynamicRebookingFee = parseFloat(settings.rebooking_fee || "200.00");
  const dynamicMaxFlights = parseInt(settings.max_active_flights || "4");

  // Load active employees and airlines for forms
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });

  // Calculate outstanding flight counts dynamically for each employee
  const activeBookings = await db.booking.findMany({
    where: {
      isArchived: false,
      loan: {
        status: { not: "FULLY_PAID" }
      }
    },
    select: { employeeId: true, flightCount: true }
  });

  const flightCountMap = activeBookings.reduce((acc, curr) => {
    acc[curr.employeeId] = (acc[curr.employeeId] || 0) + curr.flightCount;
    return acc;
  }, {});

  const airlines = await db.airline.findMany({
    orderBy: { name: "asc" },
  });

  // Load all Bookings including employee, airline, linked Loan, and rebooking histories
  const bookings = await db.booking.findMany({
    where: { isArchived: false },
    include: {
      employee: {
        include: { office: true },
      },
      airline: true,
      loan: {
        include: { payments: true }
      },
      histories: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // Server Action to Create Booking & Automated Loan
  async function createBookingAndLoan(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "AGENT" && session.role !== "ADMIN")) {
      throw new Error("Unauthorized");
    }

    const employeeId = formData.get("employeeId");
    const airlineId = formData.get("airlineId");
    const referenceNumber = formData.get("referenceNumber")?.trim();
    const tripType = formData.get("tripType") || "ONE_WAY";
    const flightCount = (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? 2 : 1;

    let destination = formData.get("destination")?.trim() || "";
    const returnDestination = formData.get("returnDestination")?.trim();
    if (tripType === "ROUND_TRIP" && returnDestination) {
      destination = `${destination} (RT: ${returnDestination})`;
    } else if (tripType === "CONNECTING" && returnDestination) {
      destination = `${destination} (via ${returnDestination})`;
    }

    const travelDateStr = formData.get("travelDate");
    const ticketCost = parseFloat(formData.get("ticketCost") || "0");
    const remarks = formData.get("remarks")?.trim();

    // Separate departure dates & times for One-Way, Round-Trip & Connecting
    const outboundTime = formData.get("outboundTime") || null;
    const returnDateStr = formData.get("returnDate") || null;
    const returnDate = returnDateStr && (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? new Date(returnDateStr) : null;
    const returnTime = (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? (formData.get("returnTime") || null) : null;

    // Dynamic policies loaded from database
    const settingsList = await db.systemSetting.findMany();
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    const serviceFee = parseFloat(settings.service_fee || "500.00");
    const baseInterestRate = parseFloat(settings.interest_rate || "1.00");
    const maxActiveFlights = parseInt(settings.max_active_flights || "4");

    const passengerName = formData.get("passengerName")?.trim() || null;
    const passengerRelationship = formData.get("passengerRelationship")?.trim() || null;

    const interestType = "PERCENT";
    const termMonths = 1;
    const interestRate = 0; // 0% initial interest during first month

    if (!employeeId || !airlineId || !referenceNumber || !destination || !travelDateStr || ticketCost <= 0) {
      return { error: "Please enter all required booking fields." };
    }

    try {
      // 1. Enforce Employee Limit Constraint: Max active outstanding flights limit
      const activeBookings = await db.booking.findMany({
        where: {
          employeeId,
          loan: {
            status: { not: "FULLY_PAID" }
          }
        },
        select: { flightCount: true }
      });

      const totalOutstandingFlights = activeBookings.reduce((sum, b) => sum + b.flightCount, 0);

      if (totalOutstandingFlights + flightCount > maxActiveFlights) {
        return {
          error: `Booking blocked. Employee has reached the maximum capacity of ${maxActiveFlights} active outstanding flight loans. (Current active flights: ${totalOutstandingFlights}/${maxActiveFlights}. Attempted booking: +${flightCount} flights). Settle payments first to restore capacity.`
        };
      }

      // Check duplicate Booking Reference
      const duplicateRef = await db.booking.findUnique({
        where: { referenceNumber },
      });

      if (duplicateRef) {
        return { error: "A booking with this Reference Number already exists." };
      }

      // Compute Loan figures
      const principalAmount = ticketCost + serviceFee;
      const interestAmount = principalAmount * (interestRate / 100);
      const totalAmountPayable = principalAmount + interestAmount;
      const monthlyInstallment = totalAmountPayable / termMonths;
      const remainingBalance = totalAmountPayable;

      // Due date is 'termMonths' from today
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + termMonths);

      const travelDate = new Date(travelDateStr);

      // Perform atomic database transaction
      await db.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            referenceNumber,
            employeeId,
            airlineId,
            destination,
            travelDate,
            outboundTime,
            returnDate,
            returnTime,
            ticketCost,
            serviceFee,
            tripType,
            flightCount,
            remarks,
            bookedById: session.id, // Assign booking to active agent/user
            passengerName,
            passengerRelationship,
          },
        });

        const loan = await tx.loan.create({
          data: {
            bookingId: booking.id,
            principalAmount,
            interestType,
            interestRate,
            interestAmount,
            totalAmountPayable,
            monthlyInstallment,
            remainingBalance,
            status: "ACTIVE",
            dueDate,
          },
        });

        await logAction(
          session.id,
          "CREATE",
          "BOOKING",
          `Created flight booking ref "${booking.referenceNumber}" (${tripType}) and generated linked loan ID "${loan.id}" for employee`
        );
      });

    } catch (e) {
      console.error(e);
      return { error: `Failed to save booking and auto-generate loan: ${e.message || e}` };
    }

    revalidatePath("/bookings");
  }

  // Server Action to Cancel/Delete Booking & Loan
  async function cancelBooking(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "AGENT" && session.role !== "ADMIN")) {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id");
    if (!id) return;

    try {
      const booking = await db.booking.findUnique({
        where: { id },
        include: { loan: true },
      });

      if (!booking) return { error: "Booking record not found." };
      
      // Prevent deleting booking if payments have been made on the loan
      if (booking.loan) {
        const paymentCount = await db.payment.count({
          where: { loanId: booking.loan.id },
        });

        if (paymentCount > 0) {
          return {
            error: "Cannot cancel booking. Active payments have already been recorded against this loan.",
          };
        }
      }

      await db.booking.update({
        where: { id },
        data: { isArchived: true }
      });

      await logAction(
        session.id,
        "DELETE",
        "BOOKING",
        `Archived booking reference "${booking.referenceNumber}" and soft-deleted automatic loan`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to archive booking." };
    }

    revalidatePath("/bookings");
  }

  // Server Action to Restore soft-deleted/archived Booking
  async function restoreBooking(id) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "AGENT" && session.role !== "ADMIN")) {
      throw new Error("Unauthorized");
    }

    if (!id) return;

    try {
      const booking = await db.booking.findUnique({
        where: { id },
      });

      if (!booking) return { error: "Booking record not found." };

      await db.booking.update({
        where: { id },
        data: { isArchived: false }
      });

      await logAction(
        session.id,
        "UPDATE",
        "BOOKING",
        `Restored archived booking reference "${booking.referenceNumber}"`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to restore booking." };
    }

    revalidatePath("/bookings");
  }

  // Server Action to Edit/Rebook Booking & Recalculate Loan
  async function updateBookingAndLoan(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "AGENT" && session.role !== "ADMIN")) {
      throw new Error("Unauthorized");
    }

    const bookingId = formData.get("bookingId");
    const airlineId = formData.get("airlineId");
    const destination = formData.get("destination")?.trim();
    const travelDateStr = formData.get("travelDate");
    const ticketCost = parseFloat(formData.get("ticketCost") || "0");
    const remarks = formData.get("remarks")?.trim();
    const tripType = formData.get("tripType") || "ONE_WAY";
    const flightCount = (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? 2 : 1;

    // Separate outbound & inbound times and return date
    const outboundTime = formData.get("outboundTime") || null;
    const returnDateStr = formData.get("returnDate") || null;
    const returnDate = returnDateStr && (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? new Date(returnDateStr) : null;
    const returnTime = (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? (formData.get("returnTime") || null) : null;

    // Dynamic policies loaded from database
    const settingsList = await db.systemSetting.findMany();
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    const serviceFee = parseFloat(settings.service_fee || "500.00");
    const rebookingFee = parseFloat(settings.rebooking_fee || "200.00");
    const baseInterestRate = parseFloat(settings.interest_rate || "1.00");
    const maxActiveFlights = parseInt(settings.max_active_flights || "4");

    if (!bookingId || !airlineId || !destination || !travelDateStr || ticketCost <= 0) {
      return { error: "Please enter all required flight details." };
    }

    try {
      const oldBooking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { loan: { include: { payments: true } }, airline: true },
      });

      if (!oldBooking) return { error: "Booking record not found." };
      const oldLoan = oldBooking.loan;

      // 0. Date Validation: Prevent rebooking if the flight date is in the past
      const travelDateObj = new Date(oldBooking.travelDate);
      const returnDateObj = oldBooking.returnDate ? new Date(oldBooking.returnDate) : null;
      const targetDate = returnDateObj && returnDateObj > travelDateObj ? returnDateObj : travelDateObj;
      if (targetDate < new Date()) {
        return { error: "Rebooking blocked. This flight is already completed." };
      }

      // 1. Enforce Employee Limit Constraint: Max active outstanding flights limit
      const flightCountDiff = flightCount - oldBooking.flightCount;
      if (flightCountDiff > 0) {
        const activeBookings = await db.booking.findMany({
          where: {
            employeeId: oldBooking.employeeId,
            id: { not: bookingId },
            loan: {
              status: { not: "FULLY_PAID" }
            }
          },
          select: { flightCount: true }
        });
        const totalOutstandingFlights = activeBookings.reduce((sum, b) => sum + b.flightCount, 0);

        if (totalOutstandingFlights + flightCount > maxActiveFlights) {
          return {
            error: `Rebooking blocked. Trip type upgrade to ${tripType} exceeds maximum ${maxActiveFlights} outstanding flights capacity (Current outstanding: ${totalOutstandingFlights + oldBooking.flightCount}/${maxActiveFlights}).`
          };
        }
      }

      // 2. Build the change log history text
      const oldOutboundTime = oldBooking.outboundTime || "";
      const oldReturnDateStr = oldBooking.returnDate ? new Date(oldBooking.returnDate).toISOString().substring(0, 10) : "";
      const newReturnDateStr = returnDateStr && (tripType === "ROUND_TRIP" || tripType === "CONNECTING") ? returnDateStr : "";
      const oldReturnTime = oldBooking.returnTime || "";

      const changes = [];
      if (destination !== oldBooking.destination) {
        changes.push(`Destination: "${oldBooking.destination}" -> "${destination}"`);
      }
      if (travelDateStr !== new Date(oldBooking.travelDate).toISOString().substring(0, 10)) {
        changes.push(`Travel Date: ${new Date(oldBooking.travelDate).toISOString().substring(0, 10)} -> ${travelDateStr}`);
      }
      if (outboundTime !== oldOutboundTime) {
        changes.push(`Outbound Time: "${oldOutboundTime || 'None'}" -> "${outboundTime || 'None'}"`);
      }
      if (newReturnDateStr !== oldReturnDateStr) {
        changes.push(`Return Date: "${oldReturnDateStr || 'None'}" -> "${newReturnDateStr || 'None'}"`);
      }
      if (returnTime !== oldReturnTime) {
        changes.push(`Return Time: "${oldReturnTime || 'None'}" -> "${returnTime || 'None'}"`);
      }
      if (ticketCost !== oldBooking.ticketCost) {
        changes.push(`Cost: ₱${oldBooking.ticketCost.toLocaleString()} -> ₱${ticketCost.toLocaleString()}`);
      }
      if (tripType !== oldBooking.tripType) {
        changes.push(`Trip Type: ${oldBooking.tripType} -> ${tripType}`);
      }
      if (airlineId !== oldBooking.airlineId) {
        const newAirline = await db.airline.findUnique({ where: { id: airlineId } });
        changes.push(`Airline: "${oldBooking.airline.name}" -> "${newAirline ? newAirline.name : 'Unknown'}"`);
      }
      
      // Always note the rebooking fee applied
      changes.push(`Rebooking Fee applied: ₱${rebookingFee.toFixed(2)}`);

      const changeLogSummary = changes.length > 0
        ? `Rebooked flight details modified: ${changes.join("; ")}`
        : "Rebooked flight: details re-confirmed with no changes.";

      // 3. Recalculate loan totals including the rebooking fee
      const newPrincipal = ticketCost + serviceFee + rebookingFee;
      // We will preserve term duration to 1 month
      const termMonths = 1;
      // Enforce 0% initial interest rate
      const interestRate = 0;
      const newInterest = 0;
      const newTotalPayable = newPrincipal;
      const newMonthlyInstallment = newTotalPayable;

      // Calculate total payments made already on this loan
      const totalPaymentsMade = oldLoan
        ? oldLoan.payments.reduce((sum, p) => sum + p.amountPaid, 0)
        : 0;

      const newRemainingBalance = Math.max(0, newTotalPayable - totalPaymentsMade);
      const newStatus = newRemainingBalance <= 0 ? "FULLY_PAID" : "ACTIVE";

      // 4. Update in database transaction
      await db.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            airlineId,
            destination,
            travelDate: new Date(travelDateStr),
            outboundTime,
            returnDate,
            returnTime,
            ticketCost,
            serviceFee,
            tripType,
            flightCount,
            remarks: remarks || oldBooking.remarks,
          }
        });

        if (oldLoan) {
          await tx.loan.update({
            where: { id: oldLoan.id },
            data: {
              principalAmount: newPrincipal,
              interestRate,
              interestAmount: newInterest,
              totalAmountPayable: newTotalPayable,
              monthlyInstallment: newMonthlyInstallment,
              remainingBalance: newRemainingBalance,
              status: newStatus,
            }
          });
        }

        await tx.bookingHistory.create({
          data: {
            bookingId,
            changeLog: changeLogSummary,
            updatedBy: session.username || "Administrator"
          }
        });

        await logAction(
          session.id,
          "UPDATE",
          "BOOKING",
          `Rebooked flight ref "${oldBooking.referenceNumber}": ${changeLogSummary}`
        );
      });

    } catch (e) {
      console.error(e);
      return { error: `Failed to update rebooking details and recalculate loan: ${e.message || e}` };
    }

    revalidatePath("/bookings");
  }

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">Booking & Loan Accounts</h1>
          <p className="text-sm text-slate-500">
            Select an employee, enter flight details, and the system will automatically create a loan with calculated interest.
          </p>
        </div>

        <BookingsTabsClient
          bookings={bookings}
          airlines={airlines}
          session={session}
          maxActiveFlights={dynamicMaxFlights}
          cancelBookingAction={cancelBooking}
          updateBookingAction={updateBookingAndLoan}
          employees={employees.map((emp) => ({
            ...emp,
            outstandingFlights: flightCountMap[emp.id] || 0,
          }))}
          settings={{ service_fee: dynamicServiceFee, interest_rate: dynamicInterestRate, max_active_flights: dynamicMaxFlights, rebooking_fee: dynamicRebookingFee }}
          createBookingAction={createBookingAndLoan}
        />
      </div>
    </AppLayout>
  );
}
