import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import ExportButton from "./ExportButton";
import PrintButton from "@/components/PrintButton";
import ReportsTableClient from "./ReportsTableClient";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports Hub - PADEMCO",
};

export default async function ReportsPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "BOOKKEEPER") redirect("/");

  // Get filter parameters from URL
  const resolvedSearchParams = await searchParams;
  const reportType = resolvedSearchParams.type || "outstanding"; // "outstanding", "fullypaid", "overdue", "collections", "profit", "aging", "ledger", "fee_breakdown"
  const officeFilter = resolvedSearchParams.office || "";
  const employeeFilter = resolvedSearchParams.employee || "";
  const fromDateStr = resolvedSearchParams.from || "";
  const toDateStr = resolvedSearchParams.to || "";

  // Formulate date range where applicable
  const dateFilter = {};
  if (fromDateStr) dateFilter.gte = new Date(fromDateStr);
  if (toDateStr) {
    const end = new Date(toDateStr);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  // Common relational queries helper
  const commonWhereLoan = {
    booking: { isArchived: false },
    AND: [
      officeFilter ? { booking: { employee: { officeId: officeFilter } } } : {},
      employeeFilter ? { booking: { employeeId: employeeFilter } } : {},
      fromDateStr || toDateStr ? { createdAt: dateFilter } : {},
    ],
  };

  // Define promises dynamically to fire in parallel
  let outstandingPromise = Promise.resolve([]);
  let fullyPaidPromise = Promise.resolve([]);
  let overduePromise = Promise.resolve([]);
  let collectionsPromise = Promise.resolve([]);
  let profitPromise = Promise.resolve([]);
  let agingPromise = Promise.resolve([]);
  let inactiveBookingsPromise = Promise.resolve([]);
  let inactiveEmployeesPromise = Promise.resolve([]);
  let ledgerEmployeePromise = Promise.resolve(null);
  let ledgerBookingsPromise = Promise.resolve([]);
  let feeBreakdownPromise = Promise.resolve([]);

  if (reportType === "outstanding") {
    outstandingPromise = db.loan.findMany({
      where: {
        remainingBalance: { gt: 0 },
        ...commonWhereLoan,
      },
      include: {
        booking: { include: { employee: { include: { office: true } }, airline: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else if (reportType === "fullypaid") {
    fullyPaidPromise = db.loan.findMany({
      where: {
        status: "FULLY_PAID",
        ...commonWhereLoan,
      },
      include: {
        booking: { include: { employee: { include: { office: true } }, airline: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else if (reportType === "overdue") {
    overduePromise = db.loan.findMany({
      where: {
        status: "OVERDUE",
        ...commonWhereLoan,
      },
      include: {
        booking: { include: { employee: { include: { office: true } }, airline: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  } else if (reportType === "collections") {
    collectionsPromise = db.payment.findMany({
      where: {
        loan: { booking: { isArchived: false } },
        AND: [
          officeFilter ? { loan: { booking: { employee: { officeId: officeFilter } } } } : {},
          employeeFilter ? { loan: { booking: { employeeId: employeeFilter } } } : {},
          fromDateStr || toDateStr ? { paymentDate: dateFilter } : {},
        ],
      },
      include: {
        loan: {
          include: {
            booking: { include: { employee: { include: { office: true } } } },
          },
        },
        cashier: true,
      },
      orderBy: { paymentDate: "desc" },
    });
  } else if (reportType === "profit") {
    profitPromise = db.loan.findMany({
      where: commonWhereLoan,
      include: {
        booking: { include: { employee: { include: { office: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (reportType === "aging") {
    agingPromise = db.loan.findMany({
      where: {
        remainingBalance: { gt: 0 },
        booking: { isArchived: false },
        AND: [
          officeFilter ? { booking: { employee: { officeId: officeFilter } } } : {},
          employeeFilter ? { booking: { employeeId: employeeFilter } } : {},
        ],
      },
      include: {
        booking: { include: { employee: { include: { office: true } } } },
      },
    });
  } else if (reportType === "inactive") {
    inactiveBookingsPromise = db.booking.findMany({
      where: {
        loan: {
          status: { not: "FULLY_PAID" }
        }
      },
      select: { employeeId: true, flightCount: true }
    });
    inactiveEmployeesPromise = db.employee.findMany({
      where: {
        AND: [
          officeFilter ? { officeId: officeFilter } : {},
          employeeFilter ? { id: employeeFilter } : {},
        ],
      },
      include: {
        office: true,
      },
      orderBy: { fullName: "asc" },
    });
  } else if (reportType === "ledger" && employeeFilter) {
    ledgerEmployeePromise = db.employee.findUnique({
      where: { id: employeeFilter },
      include: { office: true },
    });
    ledgerBookingsPromise = db.booking.findMany({
      where: { employeeId: employeeFilter },
      include: {
        airline: true,
        loan: {
          include: {
            payments: {
              include: { cashier: true },
              orderBy: { paymentDate: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  } else if (reportType === "fee_breakdown") {
    feeBreakdownPromise = db.loan.findMany({
      where: {
        booking: { isArchived: false },
        AND: [
          officeFilter ? { booking: { employee: { officeId: officeFilter } } } : {},
          employeeFilter ? { booking: { employeeId: employeeFilter } } : {},
          fromDateStr || toDateStr ? { createdAt: dateFilter } : {},
        ],
      },
      include: {
        booking: {
          include: {
            employee: { include: { office: true } },
            airline: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Load all required data in parallel
  const [
    offices,
    allEmployees,
    outstandingLoans,
    fullyPaidLoans,
    overdueLoans,
    collectionsPayments,
    profitLoans,
    agingLoans,
    inactiveBookings,
    inactiveEmployees,
    ledgerEmployeeRaw,
    ledgerBookings,
    feeBreakdownLoans,
  ] = await Promise.all([
    db.office.findMany({ orderBy: { name: "asc" } }),
    db.employee.findMany({ orderBy: { fullName: "asc" } }),
    outstandingPromise,
    fullyPaidPromise,
    overduePromise,
    collectionsPromise,
    profitPromise,
    agingPromise,
    inactiveBookingsPromise,
    inactiveEmployeesPromise,
    ledgerEmployeePromise,
    ledgerBookingsPromise,
    feeBreakdownPromise,
  ]);

  // --- Fetch Report Data based on Active Tab ---
  let reportData = [];
  let exportData = [];
  let headersMap = {};
  let ledgerEmployee = null;
  let ledgerSummary = {};

  if (reportType === "outstanding") {
    const loans = outstandingLoans;

    reportData = loans;
    exportData = loans.map((l) => ({
      "PNR Reference": l.booking.referenceNumber,
      "Employee ID": l.booking.employee.employeeId,
      "Employee Name": l.booking.employee.fullName,
      "Office/Division": l.booking.employee.office.name,
      "Travel Date": l.booking.travelDate.toLocaleDateString(),
      Destination: l.booking.destination,
      "Ticket Cost": l.booking.ticketCost,
      "Coop Fee": l.booking.serviceFee,
      "Total Advanced": l.principalAmount,
      "Coop Interest/Profit": l.interestAmount,
      "Total Payable": l.totalAmountPayable,
      "Outstanding Balance": l.remainingBalance,
      "Due Date": l.dueDate.toLocaleDateString(),
      Status: l.status,
    }));
    headersMap = {
      "PNR Reference": "PNR Reference",
      "Employee ID": "Employee ID",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Travel Date": "Travel Date",
      "Total Advanced": "Principal",
      "Coop Interest/Profit": "Interest",
      "Total Payable": "Total Payable",
      "Outstanding Balance": "Balance",
      "Due Date": "Due Date",
      Status: "Status",
    };
  } else if (reportType === "fullypaid") {
    const loans = fullyPaidLoans;

    reportData = loans;
    exportData = loans.map((l) => ({
      "PNR Reference": l.booking.referenceNumber,
      "Employee ID": l.booking.employee.employeeId,
      "Employee Name": l.booking.employee.fullName,
      "Office/Division": l.booking.employee.office.name,
      Destination: l.booking.destination,
      "Total Advanced": l.principalAmount,
      "Coop Profit": l.interestAmount,
      "Total Paid": l.totalAmountPayable,
      "Completion Date": l.updatedAt.toLocaleDateString(),
    }));
    headersMap = {
      "PNR Reference": "PNR Reference",
      "Employee ID": "Employee ID",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Total Advanced": "Principal",
      "Coop Profit": "Coop Profit",
      "Total Paid": "Amount Paid",
      "Completion Date": "Completed Date",
    };
  } else if (reportType === "overdue") {
    const loans = overdueLoans;

    reportData = loans;
    exportData = loans.map((l) => {
      const daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - l.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      return {
        "PNR Reference": l.booking.referenceNumber,
        "Employee ID": l.booking.employee.employeeId,
        "Employee Name": l.booking.employee.fullName,
        "Office/Division": l.booking.employee.office.name,
        "Total Payable": l.totalAmountPayable,
        "Outstanding Balance": l.remainingBalance,
        "Original Due Date": l.dueDate.toLocaleDateString(),
        "Days Overdue": daysOverdue,
      };
    });
    headersMap = {
      "PNR Reference": "PNR Reference",
      "Employee ID": "Employee ID",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Total Payable": "Total Payable",
      "Outstanding Balance": "Balance",
      "Original Due Date": "Due Date",
      "Days Overdue": "Days Overdue",
    };
  } else if (reportType === "collections") {
    const payments = collectionsPayments;

    reportData = payments;
    exportData = payments.map((p) => ({
      "OR Number": p.receiptNumber,
      "Employee Name": p.loan.booking.employee.fullName,
      "Office/Division": p.loan.booking.employee.office.name,
      "Flight Destination": p.loan.booking.destination,
      "Booking Reference": p.loan.booking.referenceNumber,
      "Payment Date": p.paymentDate.toLocaleDateString(),
      "Amount Paid": p.amountPaid,
      "Payment Method": p.paymentMethod,
      Cashier: p.cashier.name,
      Remarks: p.remarks || "",
    }));
    headersMap = {
      "OR Number": "OR Number",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Payment Date": "Date Paid",
      "Amount Paid": "Amount Paid",
      "Payment Method": "Method",
      Cashier: "Cashier",
    };
  } else if (reportType === "profit") {
    const loans = profitLoans;

    reportData = loans;
    exportData = loans.map((l) => ({
      "PNR Reference": l.booking.referenceNumber,
      "Employee Name": l.booking.employee.fullName,
      "Office/Division": l.booking.employee.office.name,
      "Advanced Principal": l.principalAmount,
      "Interest Rate/Value": l.interestType === "PERCENT" ? `${l.interestRate}%` : `₱${l.interestRate}`,
      "Interest Type": l.interestType,
      "Interest Profit Earned": l.interestAmount,
      "Total Advanced + Profit": l.totalAmountPayable,
    }));
    headersMap = {
      "PNR Reference": "PNR Reference",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Advanced Principal": "Principal Cost",
      "Interest Rate/Value": "Rate",
      "Interest Profit Earned": "Coop Interest (Profit)",
      "Total Advanced + Profit": "Total Loan",
    };
  } else if (reportType === "aging") {
    const loans = agingLoans;

    // Bucket outstanding amounts by overdue age
    const now = Date.now();
    const agingData = {};

    loans.forEach((l) => {
      const empId = l.booking.employee.id;
      if (!agingData[empId]) {
        agingData[empId] = {
          name: l.booking.employee.fullName,
          office: l.booking.employee.office.name,
          total: 0,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          daysOver90: 0,
        };
      }

      const overdueTimeMs = now - l.dueDate.getTime();
      const overdueDays = Math.floor(overdueTimeMs / (1000 * 60 * 60 * 24));
      const amount = l.remainingBalance;

      agingData[empId].total += amount;

      if (overdueDays <= 0) {
        agingData[empId].current += amount;
      } else if (overdueDays <= 30) {
        agingData[empId].days1to30 += amount;
      } else if (overdueDays <= 60) {
        agingData[empId].days31to60 += amount;
      } else if (overdueDays <= 90) {
        agingData[empId].days61to90 += amount;
      } else {
        agingData[empId].daysOver90 += amount;
      }
    });

    reportData = Object.values(agingData);
    exportData = reportData.map((a) => ({
      "Employee Name": a.name,
      "Office/Division": a.office,
      "Total Outstanding": a.total,
      Current: a.current,
      "1-30 Days Overdue": a.days1to30,
      "31-60 Days Overdue": a.days31to60,
      "61-90 Days Overdue": a.days61to90,
      "Over 90 Days Overdue": a.daysOver90,
    }));
    headersMap = {
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Total Outstanding": "Total Outstanding",
      Current: "Current",
      "1-30 Days Overdue": "1-30 Days",
      "31-60 Days Overdue": "31-60 Days",
      "61-90 Days Overdue": "61-90 Days",
      "Over 90 Days Overdue": "Over 90 Days",
    };
  } else if (reportType === "inactive") {
    const flightCountMap = inactiveBookings.reduce((acc, curr) => {
      acc[curr.employeeId] = (acc[curr.employeeId] || 0) + curr.flightCount;
      return acc;
    }, {});

    const employees = inactiveEmployees;

    // Filter employees who are either set as INACTIVE by admin or reached limit (>= 4 active flights)
    const filteredEmps = employees.filter((emp) => {
      const outstandingFlights = flightCountMap[emp.id] || 0;
      const isLimitReached = outstandingFlights >= 4;
      return emp.status === "INACTIVE" || isLimitReached;
    });

    reportData = filteredEmps.map((emp) => {
      const outstandingFlights = flightCountMap[emp.id] || 0;
      const isLimitReached = outstandingFlights >= 4;
      let reason = "";
      if (emp.status === "INACTIVE") {
        reason = "Resigned / Non-Member (Admin)";
      } else if (isLimitReached) {
        reason = `Max Flights Reached (${outstandingFlights}/4 loans)`;
      }
      return {
        ...emp,
        reason,
        activeFlights: outstandingFlights,
      };
    });

    exportData = reportData.map((e) => ({
      "Employee ID": e.employeeId,
      "Employee Name": e.fullName,
      "Office/Division": e.office.name,
      Position: e.position,
      "Contact Number": e.contactNumber,
      "Outstanding Flights": e.activeFlights,
      "Deactivation Reason": e.reason,
    }));

    headersMap = {
      "Employee ID": "Employee ID",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      Position: "Position",
      "Outstanding Flights": "Active Loans",
      "Deactivation Reason": "Deactivation Reason",
    };
  } else if (reportType === "ledger" && employeeFilter) {
    ledgerEmployee = ledgerEmployeeRaw;

    if (ledgerEmployee) {
      const bookings = ledgerBookings;

      // Assemble Ledger Details
      let totalAdvanced = 0;
      let totalPaid = 0;
      const ledgerEntries = [];

      bookings.forEach((book) => {
        if (book.loan) {
          totalAdvanced += book.loan.totalAmountPayable;
          
          // Bookings Entry
          ledgerEntries.push({
            date: book.createdAt,
            type: "FLIGHT BOOKING",
            details: `Advanced ticket to ${book.destination} via ${book.airline.name} (Ref: ${book.referenceNumber})`,
            debit: book.loan.totalAmountPayable,
            credit: 0,
            orNumber: "-",
          });

          // Payments Entry
          book.loan.payments.forEach((pay) => {
            totalPaid += pay.amountPaid;
            ledgerEntries.push({
              date: pay.paymentDate,
              type: "INSTALLMENT PAYMENT",
              details: `Official Receipt posted (Remarks: ${pay.remarks || "N/A"})`,
              debit: 0,
              credit: pay.amountPaid,
              orNumber: pay.receiptNumber,
            });
          });
        }
      });

      // Sort entries chronologically
      ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Running balance calculation
      let runningBalance = 0;
      reportData = ledgerEntries.map((e) => {
        runningBalance += e.debit - e.credit;
        return {
          ...e,
          balance: runningBalance,
        };
      });

      ledgerSummary = {
        totalAdvanced,
        totalPaid,
        balance: totalAdvanced - totalPaid,
      };

      exportData = reportData.map((r) => ({
        Date: r.date.toLocaleDateString(),
        Type: r.type,
        Details: r.details,
        "OR Number": r.orNumber,
        Debit: r.debit > 0 ? r.debit : 0,
        Credit: r.credit > 0 ? r.credit : 0,
        "Running Balance": r.balance,
      }));
      headersMap = {
        Date: "Date",
        Type: "Type",
        Details: "Details",
        "OR Number": "OR Number",
        Debit: "Debit (Loan)",
        Credit: "Credit (Payment)",
        "Running Balance": "Balance",
      };
    }
  } else if (reportType === "fee_breakdown") {
    reportData = feeBreakdownLoans;
    exportData = feeBreakdownLoans.map((l) => {
      const serviceFee = l.booking.serviceFee;
      const interestAmount = l.interestAmount;
      const principal = l.principalAmount;
      const totalAmountPayable = l.totalAmountPayable;
      const remainingBalance = l.remainingBalance;
      const totalPaid = totalAmountPayable - remainingBalance;
      
      return {
        "PNR Reference": l.booking.referenceNumber,
        "Employee ID": l.booking.employee.employeeId,
        "Employee Name": l.booking.employee.fullName,
        "Office/Division": l.booking.employee.office.name,
        "Destination": l.booking.destination,
        "Principal": principal,
        "Markup Fee (Service Fee)": serviceFee,
        "Interest Amount": interestAmount,
        "Total Paid": totalPaid,
        "Remaining Balance": remainingBalance,
      };
    });
    headersMap = {
      "PNR Reference": "PNR Reference",
      "Employee ID": "Employee ID",
      "Employee Name": "Employee Name",
      "Office/Division": "Office/Division",
      "Destination": "Destination",
      "Principal": "Principal",
      "Markup Fee (Service Fee)": "Markup Fee",
      "Interest Amount": "Interest Amount",
      "Total Paid": "Total Paid",
      "Remaining Balance": "Balance",
    };
  }

  // Define tab navigation styling helper
  const getTabClass = (tab) => {
    const base = "px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer text-center";
    return reportType === tab
      ? `${base} bg-primary text-white border-primary shadow-sm`
      : `${base} bg-white text-slate-600 hover:text-primary hover:bg-slate-50 border-slate-200`;
  };

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Title Hub */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-primary">PADEMCO Financial Reports</h1>
            <p className="text-sm text-slate-500">
              Generate, print, and export flight bookings, collections, aging receivables, and employee ledgers.
            </p>
          </div>
          
          {/* Export & Print actions (no-print) */}
          <div className="no-print flex items-center gap-3 self-start">
            <ExportButton
              data={exportData}
              filename={`${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`}
              headersMap={headersMap}
            />
            
            <PrintButton />
          </div>
        </div>

        {/* 1. Filtering bar (no-print) */}
        <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <input type="hidden" name="type" value={reportType} />

            {/* Office dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Office / Division</label>
              <select
                name="office"
                defaultValue={officeFilter}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs transition-all bg-white font-medium"
              >
                <option value="">All Offices</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Selector</label>
              <select
                name="employee"
                defaultValue={employeeFilter}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs transition-all bg-white font-medium"
              >
                <option value="">All Employees</option>
                {allEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>

            {/* Date range inputs */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">From Date</label>
              <input
                type="date"
                name="from"
                defaultValue={fromDateStr}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs transition-all bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">To Date</label>
              <input
                type="date"
                name="to"
                defaultValue={toDateStr}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs transition-all bg-white font-mono"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Apply Filters
              </button>
              <a
                href={`/reports?type=${reportType}`}
                className="w-2/3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
              >
                Reset
              </a>
            </div>
          </form>
        </div>

        {/* 2. Report Type Selector tabs (no-print) */}
        <div className="no-print grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2">
          <Link href="/reports?type=outstanding" className={getTabClass("outstanding")}>Outstanding</Link>
          <Link href="/reports?type=fullypaid" className={getTabClass("fullypaid")}>Fully Paid</Link>
          <Link href="/reports?type=overdue" className={getTabClass("overdue")}>Overdue</Link>
          <Link href="/reports?type=collections" className={getTabClass("collections")}>Collections</Link>
          <Link href="/reports?type=profit" className={getTabClass("profit")}>Coop Profit</Link>
          <Link href="/reports?type=aging" className={getTabClass("aging")}>Aging buckets</Link>
          <Link href="/reports?type=inactive" className={getTabClass("inactive")}>Inactive Emps</Link>
          <Link href="/reports?type=ledger" className={getTabClass("ledger")}>Employee Ledger</Link>
          <Link href="/reports?type=fee_breakdown" className={getTabClass("fee_breakdown")}>Fee Breakdown</Link>
        </div>

        {/* 3. REPORT CONTENTS DISPLAY */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col print-card">
          {/* Header layout ONLY for Print stylesheet */}
          <div className="print-only print-header">
            <h1 className="text-lg font-black">{session.name.toUpperCase() || "PADEMCO"}</h1>
            <p className="text-xs uppercase font-bold text-slate-500">DENR Airline Ticket Loan System Reports</p>
            <div className="border-t border-slate-800 my-2 w-full max-w-lg"></div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Report: {reportType.toUpperCase()} | Generated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Table headers */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between no-print">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              {reportType.replace(/^\w/, (c) => c.toUpperCase())} Report Data
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              {reportData.length} records found
            </span>
          </div>

          {/* DYNAMIC REPORT TABLES — paginated client component */}
          <ReportsTableClient
            reportData={reportData}
            reportType={reportType}
            ledgerEmployee={ledgerEmployee}
            ledgerSummary={ledgerSummary}
          />

        </div>
      </div>
    </AppLayout>
  );
}
