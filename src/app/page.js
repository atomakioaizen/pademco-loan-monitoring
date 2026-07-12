import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import ViewerDashboardClient from "./ViewerDashboardClient";
import AdminDashboardClient from "./AdminDashboardClient";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard - PADEMCO Airline Loan Monitoring",
};

export default async function DashboardPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Root path allowed for all users. Agent will see the main monitoring dashboard.

  // 1. Check if user is a VIEWER (DENR Employee borrower) to render confidential personal portal
  if (session.role === "VIEWER") {
    const employeeId = session.employeeId;

    if (!employeeId) {
      return (
        <AppLayout user={session}>
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-800">Confidential Link Required</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Your user portal credentials are not currently mapped to a specific DENR Employee profile. 
                Please contact your PADEMCO Administrator to link your employee profile to this account.
              </p>
            </div>
          </div>
        </AppLayout>
      );
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { office: true },
    });

    if (!employee) {
      return (
        <AppLayout user={session}>
          <div className="space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-danger">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-black text-slate-800">Employee Profile Missing</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                The linked employee record could not be found in the database. Please check with your administrator.
              </p>
            </div>
          </div>
        </AppLayout>
      );
    }

    // Load active employee bookings & loans
    const bookings = await db.booking.findMany({
      where: { employeeId, isArchived: false },
      include: { airline: true, loan: true, bookedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const loans = await db.loan.findMany({
      where: { booking: { employeeId, isArchived: false } },
      include: {
        booking: { include: { airline: true } },
        payments: { include: { cashier: true }, orderBy: { paymentDate: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Load System Settings for max capacity calculations
    const settingsList = await db.systemSetting.findMany();
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    const maxActiveFlights = parseInt(settings.max_active_flights || "4");

    const activeFlights = bookings
      .filter(b => b.loan && b.loan.status !== "FULLY_PAID")
      .reduce((sum, b) => sum + b.flightCount, 0);

    // Compute metrics
    const totalPrincipal = loans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalPayable = loans.reduce((sum, l) => sum + l.totalAmountPayable, 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalPaid = totalPayable - totalOutstanding;

    const hasOverdue = loans.some((l) => l.status === "OVERDUE");

    // Flatten payments for display
    const payments = [];
    loans.forEach((loan) => {
      loan.payments.forEach((p) => {
        payments.push({
          ...p,
          loanReference: loan.booking.referenceNumber,
          loanDestination: loan.booking.destination,
          loanAirline: loan.booking.airline.name,
          loanStatus: loan.status,
        });
      });
    });
    payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    return (
      <AppLayout user={session}>
        <ViewerDashboardClient
          bookings={bookings}
          loans={loans}
          payments={payments}
          employee={employee}
          session={session}
          maxActiveFlights={maxActiveFlights}
          activeFlights={activeFlights}
          totalPrincipal={totalPrincipal}
          totalPayable={totalPayable}
          totalOutstanding={totalOutstanding}
          totalPaid={totalPaid}
          hasOverdue={hasOverdue}
        />
      </AppLayout>
    );
  }

  const session2 = await getSession();
  if (!session2) redirect("/login");

  // 1. Business Rule Engine: Automatically update ACTIVE loans past their due date to OVERDUE (Run in background to avoid blocking page load)
  db.loan.updateMany({
    where: {
      status: "ACTIVE",
      dueDate: { lt: new Date() },
    },
    data: {
      status: "OVERDUE",
    },
  }).catch((e) => {
    console.error("Failed to auto-update overdue loans:", e);
  });

  // 2. Fetch Query Params for Drill-Down
  const resolvedSearchParams = await searchParams;
  const drilldownLevel = resolvedSearchParams.level || "dashboard"; // "dashboard", "office", "employee", "loan"
  const selectedOfficeId = resolvedSearchParams.officeId || "";
  const selectedEmployeeId = resolvedSearchParams.employeeId || "";
  const selectedLoanId = resolvedSearchParams.loanId || "";

  // Monthly Loans Due date boundaries
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Optimized database metrics retrieval.
  // Instead of querying all loans and payments into JS memory to calculate profit,
  // we do parallel database aggregation queries, saving seconds of round-trips and memory overhead.
  const [
    activeLoansCount,
    fullyPaidCount,
    overdueCount,
    outstandingBalanceAgg,
    totalCollectionsAgg,
    dueThisMonthCount,
    employeesWithLoansCount,
    profitResult
  ] = await Promise.all([
    db.loan.count({ where: { status: "ACTIVE" } }),
    db.loan.count({ where: { status: "FULLY_PAID" } }),
    db.loan.count({ where: { status: "OVERDUE" } }),
    db.loan.aggregate({
      _sum: { remainingBalance: true },
      where: { remainingBalance: { gt: 0 } },
    }),
    db.payment.aggregate({
      _sum: { amountPaid: true },
    }),
    db.loan.count({
      where: {
        dueDate: { gte: startOfMonth, lte: endOfMonth },
        remainingBalance: { gt: 0 },
      },
    }),
    db.employee.count({
      where: { bookings: { some: {} } },
    }),
    // Calculate total proportional profit directly in database via raw SQL query
    db.$queryRaw`
      SELECT COALESCE(SUM(
        CASE 
          WHEN l."totalAmountPayable" <= 0 THEN 0 
          ELSE (COALESCE(p.paid_sum, 0) / l."totalAmountPayable") * l."interestAmount" 
        END
      ), 0) as total_profit
      FROM "Loan" l
      LEFT JOIN (
        SELECT "loanId", SUM("amountPaid") as paid_sum 
        FROM "Payment" 
        GROUP BY "loanId"
      ) p ON l.id = p."loanId"
    `
  ]);

  const totalOutstandingBalance = outstandingBalanceAgg._sum.remainingBalance || 0;
  const totalCollections = totalCollectionsAgg._sum.amountPaid || 0;
  const totalProfit = Number(profitResult?.[0]?.total_profit || 0);

  // Render AdminDashboardClient for ADMIN, CASHIER, or AGENT roles (consists strictly of clickable stat cards)
  if (session.role === "ADMIN" || session.role === "CASHIER" || session.role === "AGENT" || session.role === "BOOKKEEPER") {
    const [allLoans, allPayments, pendingUsers, oldLoans] = await Promise.all([
      db.loan.findMany({
        include: {
          booking: {
            include: {
              employee: { include: { office: true } },
              airline: true,
              bookedBy: true,
            },
          },
          payments: { include: { cashier: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.payment.findMany({
        include: {
          cashier: true,
          loan: {
            include: {
              booking: {
                include: {
                  employee: { include: { office: true } },
                  airline: true,
                },
              },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
      }),
      session.role === "ADMIN"
        ? db.user.findMany({
            where: { status: "PENDING" },
            include: {
              employee: {
                include: { office: true },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      db.oldLoan.findMany({
        include: {
          employee: {
            include: { office: true },
          },
          encodedBy: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return (
      <AppLayout user={session}>
        <AdminDashboardClient
          loans={allLoans}
          payments={allPayments}
          session={session}
          pendingUsers={pendingUsers}
          oldLoans={oldLoans}
          stats={{
            totalOutstandingBalance,
            totalCollections,
            totalProfit,
            overdueCount,
            activeLoansCount,
            fullyPaidCount,
            dueThisMonthCount,
            employeesWithLoansCount,
          }}
        />
      </AppLayout>
    );
  }

  // 4. Drill-Down Data Fetching
  let officeBreakdownData = [];
  let employeeBreakdownData = [];
  let employeeLoansData = [];
  let loanPaymentsData = [];
  let activeOffice = null;
  let activeEmployee = null;
  let activeLoan = null;

  // Level A: Office/Unit Breakdown (Always needed for the Office tab, or if level is office)
  if (drilldownLevel === "office" || drilldownLevel === "dashboard") {
    const offices = await db.office.findMany({
      include: {
        employees: {
          include: {
            bookings: {
              include: { loan: { include: { payments: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    officeBreakdownData = offices.map((off) => {
      let employeeCount = off.employees.length;
      let loanCount = 0;
      let totalPrincipal = 0;
      let totalInterest = 0;
      let totalOutstanding = 0;
      let totalCollections = 0;

      off.employees.forEach((emp) => {
        emp.bookings.forEach((book) => {
          if (book.loan) {
            loanCount++;
            totalPrincipal += book.ticketCost + book.serviceFee;
            totalInterest += book.loan.interestAmount;
            totalOutstanding += book.loan.remainingBalance;
            book.loan.payments.forEach((pay) => {
              totalCollections += pay.amountPaid;
            });
          }
        });
      });

      return {
        id: off.id,
        name: off.name,
        employeeCount,
        loanCount,
        totalPrincipal,
        totalInterest,
        totalOutstanding,
        totalCollections,
      };
    });
  }

  // Level B: Employee Breakdown for Selected Office
  if (selectedOfficeId) {
    activeOffice = await db.office.findUnique({ where: { id: selectedOfficeId } });
    
    if (activeOffice) {
      const employees = await db.employee.findMany({
        where: { officeId: selectedOfficeId },
        include: {
          bookings: {
            include: { loan: { include: { payments: true } } },
          },
        },
        orderBy: { fullName: "asc" },
      });

      employeeBreakdownData = employees.map((emp) => {
        let loanCount = 0;
        let totalLoanAmount = 0;
        let totalInterest = 0;
        let totalPaid = 0;
        let remainingBalance = 0;
        let activeStatus = "FULLY_PAID";

        emp.bookings.forEach((book) => {
          if (book.loan) {
            loanCount++;
            totalLoanAmount += book.loan.totalAmountPayable;
            totalInterest += book.loan.interestAmount;
            remainingBalance += book.loan.remainingBalance;
            if (book.loan.status === "ACTIVE" || book.loan.status === "OVERDUE") {
              activeStatus = book.loan.status; // Flag if there is any active/overdue loan
            }
            book.loan.payments.forEach((pay) => {
              totalPaid += pay.amountPaid;
            });
          }
        });

        if (loanCount === 0) activeStatus = "NO_LOANS";

        return {
          id: emp.id,
          name: emp.fullName,
          loanCount,
          totalLoanAmount,
          totalInterest,
          totalPaid,
          remainingBalance,
          status: activeStatus,
        };
      });
    }
  }

  // Level C: Loan Details for Selected Employee
  if (selectedEmployeeId) {
    activeEmployee = await db.employee.findUnique({
      where: { id: selectedEmployeeId },
      include: { office: true },
    });

    if (activeEmployee) {
      employeeLoansData = await db.loan.findMany({
        where: {
          booking: {
            employeeId: selectedEmployeeId,
          },
        },
        include: {
          booking: {
            include: { airline: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  // Level D: Payments history for Selected Loan
  if (selectedLoanId) {
    activeLoan = await db.loan.findUnique({
      where: { id: selectedLoanId },
      include: {
        booking: {
          include: {
            employee: { include: { office: true } },
            airline: true,
          },
        },
      },
    });

    if (activeLoan) {
      loanPaymentsData = await db.payment.findMany({
        where: { loanId: selectedLoanId },
        include: { cashier: true },
        orderBy: { paymentDate: "desc" },
      });
    }
  }

  return (
    <AppLayout user={session}>
      <div className="space-y-8">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-primary to-primary-hover rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full border border-white/5">
              Welcome, {session.name}
            </span>
            <h1 className="text-2xl md:text-3xl font-black">
              PADEMCO Loan Monitoring Portal
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              Track real-time outstanding balances, collections, cooperative profit, and overdue ticket loans of DENR Camarines Norte employees.
            </p>
          </div>
          {/* Subtle background graphics */}
          <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <svg className="h-64 w-64" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>

        {/* 1. Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card: Outstanding */}
          <Link
            href="/?level=office"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-primary cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Outstanding Balance
              </span>
              <span className="p-2 rounded-xl bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-800 font-mono">
                ₱{totalOutstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Total collectibles from {employeesWithLoansCount} employee borrowers
              </span>
            </div>
          </Link>

          {/* Card: Collections */}
          <Link
            href="/payments"
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-success cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Total Collections
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 text-success group-hover:bg-success group-hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-800 font-mono">
                ₱{totalCollections.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Total cash installment payments received
              </span>
            </div>
          </Link>

          {/* Card: Profit Earned */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Profit Earned
              </span>
              <span className="p-2 rounded-xl bg-amber-50 text-warning">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-800 font-mono">
                ₱{totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Accumulated cooperative interest revenue
              </span>
            </div>
          </div>

          {/* Card: Overdue Accounts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Overdue Accounts
              </span>
              <span className={`p-2 rounded-xl text-danger ${overdueCount > 0 ? "bg-rose-100 animate-bounce" : "bg-rose-50"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-slate-800 font-mono">
                {overdueCount} Accounts
              </h3>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                Loans that missed their due dates
              </span>
            </div>
          </div>
        </div>

        {/* 2. Secondary Mini Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-100 p-4 rounded-2xl border border-slate-200">
          <div className="text-center p-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Accounts</span>
            <span className="block mt-1 text-lg font-black text-primary">{activeLoansCount} Loans</span>
          </div>
          <div className="text-center p-2 border-l border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fully Paid</span>
            <span className="block mt-1 text-lg font-black text-success">{fullyPaidCount} Loans</span>
          </div>
          <div className="text-center p-2 border-l border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due This Month</span>
            <span className="block mt-1 text-lg font-black text-warning">{dueThisMonthCount} Loans</span>
          </div>
          <div className="text-center p-2 border-l border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Borrowers</span>
            <span className="block mt-1 text-lg font-black text-slate-800">{employeesWithLoansCount} Employees</span>
          </div>
        </div>

        {/* 3. DRILL DOWN MODULE */}
        <div className="space-y-4">
          {/* Breadcrumbs for Drill Down Navigation */}
          <div className="flex flex-wrap items-center gap-2 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-2 block">DRILL-DOWN PATH:</span>
            <Link href="/" className="hover:text-primary transition-colors text-primary font-bold">
              All Offices
            </Link>
            {activeOffice && (
              <>
                <span className="text-slate-300">/</span>
                <Link
                  href={`/?level=office&officeId=${activeOffice.id}`}
                  className="hover:text-primary transition-colors text-primary font-bold"
                >
                  {activeOffice.name}
                </Link>
              </>
            )}
            {activeEmployee && (
              <>
                <span className="text-slate-300">/</span>
                <Link
                  href={`/?level=employee&officeId=${selectedOfficeId}&employeeId=${activeEmployee.id}`}
                  className="hover:text-primary transition-colors text-primary font-bold"
                >
                  {activeEmployee.fullName}
                </Link>
              </>
            )}
            {activeLoan && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800 font-bold font-mono">
                  Loan Ref: {activeLoan.booking.referenceNumber}
                </span>
              </>
            )}
          </div>

          {/* Drill-down View router */}
          {drilldownLevel === "dashboard" || drilldownLevel === "office" ? (
            /* ==============================================================
               LEVEL A: OFFICE/UNIT BREAKDOWN
               ============================================================== */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Office / Unit Financial Breakdowns
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click on an office to view its employee loan directories.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Office / Sector Name</th>
                      <th scope="col" className="px-6 py-3.5 text-center">Employees</th>
                      <th scope="col" className="px-6 py-3.5 text-center">Active Loans</th>
                      <th scope="col" className="px-6 py-3.5">Total Advanced (Principal)</th>
                      <th scope="col" className="px-6 py-3.5">Total Interest</th>
                      <th scope="col" className="px-6 py-3.5">Total Collected</th>
                      <th scope="col" className="px-6 py-3.5">Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {officeBreakdownData.map((off) => (
                      <tr
                        key={off.id}
                        className="hover:bg-primary-light/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/?level=office&officeId=${off.id}`}
                            className="font-bold text-primary hover:underline block"
                          >
                            {off.name}
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5 group-hover:text-primary transition-colors">
                              Click to drill down &rarr;
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{off.employeeCount}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{off.loanCount}</td>
                        <td className="px-6 py-4 font-mono">₱{off.totalPrincipal.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono">₱{off.totalInterest.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono font-semibold text-success">₱{off.totalCollections.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          ₱{off.totalOutstanding.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedOfficeId && !selectedEmployeeId ? (
            /* ==============================================================
               LEVEL B: EMPLOYEE BREAKDOWN
               ============================================================== */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Employee Breakdowns under {activeOffice?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click on an employee to view their specific airline bookings and loans.</p>
                </div>
                <Link
                  href="/"
                  className="text-xs font-bold text-primary hover:text-primary-hover bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  &larr; Back to Offices
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Employee Name</th>
                      <th scope="col" className="px-6 py-3.5 text-center">Active Loans</th>
                      <th scope="col" className="px-6 py-3.5">Total Advanced (Principal + Interest)</th>
                      <th scope="col" className="px-6 py-3.5">Total Interest</th>
                      <th scope="col" className="px-6 py-3.5">Total Collected</th>
                      <th scope="col" className="px-6 py-3.5">Outstanding Balance</th>
                      <th scope="col" className="px-6 py-3.5">Overall Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {employeeBreakdownData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                          No employees registered under this office.
                        </td>
                      </tr>
                    ) : (
                      employeeBreakdownData.map((emp) => (
                        <tr
                          key={emp.id}
                          className="hover:bg-primary-light/50 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/?level=employee&officeId=${selectedOfficeId}&employeeId=${emp.id}`}
                              className="font-bold text-primary hover:underline block"
                            >
                              {emp.name}
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5 group-hover:text-primary">
                                Click to view loan details &rarr;
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{emp.loanCount}</td>
                          <td className="px-6 py-4 font-mono">₱{emp.totalLoanAmount.toLocaleString()}</td>
                          <td className="px-6 py-4 font-mono">₱{emp.totalInterest.toLocaleString()}</td>
                          <td className="px-6 py-4 font-mono text-success">₱{emp.totalPaid.toLocaleString()}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">
                            ₱{emp.remainingBalance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                                emp.status === "ACTIVE"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : emp.status === "FULLY_PAID"
                                  ? "bg-success-light text-success border-success-light"
                                  : emp.status === "OVERDUE"
                                  ? "bg-danger-light text-danger border-danger-light animate-pulse"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedEmployeeId && !selectedLoanId ? (
            /* ==============================================================
               LEVEL C: LOAN DETAILS FOR SPECIFIC EMPLOYEE
               ============================================================== */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Loans Account Directory of {activeEmployee?.fullName} ({activeEmployee?.office.name})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click on a loan account to inspect installment records and receipts.</p>
                </div>
                <Link
                  href={`/?level=office&officeId=${selectedOfficeId}`}
                  className="text-xs font-bold text-primary hover:text-primary-hover bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  &larr; Back to Employees
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Booking Ref</th>
                      <th scope="col" className="px-6 py-3.5">Airline & Destination</th>
                      <th scope="col" className="px-6 py-3.5">Travel Date</th>
                      <th scope="col" className="px-6 py-3.5">Monthly Installment</th>
                      <th scope="col" className="px-6 py-3.5">Total Payable</th>
                      <th scope="col" className="px-6 py-3.5">Outstanding Balance</th>
                      <th scope="col" className="px-6 py-3.5">Due Date</th>
                      <th scope="col" className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {employeeLoansData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                          No loans recorded for this employee.
                        </td>
                      </tr>
                    ) : (
                      employeeLoansData.map((loan) => (
                        <tr
                          key={loan.id}
                          className="hover:bg-primary-light/50 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/?level=loan&officeId=${selectedOfficeId}&employeeId=${selectedEmployeeId}&loanId=${loan.id}`}
                              className="font-mono font-bold text-primary hover:underline block text-xs"
                            >
                              {loan.booking.referenceNumber}
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5 group-hover:text-primary">
                                Click to view payments &rarr;
                              </span>
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <span className="block font-bold text-slate-700">{loan.booking.destination}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{loan.booking.airline.name}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {loan.booking.travelDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            ₱{loan.monthlyInstallment.toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
                          </td>
                          <td className="px-6 py-4 font-mono">
                            ₱{loan.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">
                            ₱{loan.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {loan.dueDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${
                                loan.status === "ACTIVE"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : loan.status === "FULLY_PAID"
                                  ? "bg-success-light text-success border-success-light"
                                  : "bg-danger-light text-danger border-danger-light animate-pulse"
                              }`}
                            >
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ==============================================================
               LEVEL D: PAYMENT HISTORY FOR SPECIFIC LOAN
               ============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Loan Details Details Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 self-start space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Loan Statement</h3>
                  <Link
                    href={`/?level=employee&officeId=${selectedOfficeId}&employeeId=${selectedEmployeeId}`}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    &larr; Back to Loans
                  </Link>
                </div>

                {activeLoan && (
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Borrower:</span>
                      <span className="font-extrabold text-slate-800 text-base">{activeLoan.booking.employee.fullName}</span>
                      <span className="text-xs text-slate-400 block">{activeLoan.booking.employee.office.name}</span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket Ref:</span>
                        <span className="font-bold font-mono text-slate-700">{activeLoan.booking.referenceNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Carrier:</span>
                        <span className="font-bold text-slate-700">{activeLoan.booking.airline.name}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans font-semibold">Principal Cost:</span>
                        <span className="font-bold text-slate-700">₱{activeLoan.principalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-sans font-semibold">Interest Amount:</span>
                        <span className="font-bold text-slate-700">₱{activeLoan.interestAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-dashed border-slate-200">
                        <span className="text-slate-800 font-sans font-bold">Total Loan:</span>
                        <span className="font-bold text-primary">₱{activeLoan.totalAmountPayable.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 text-success bg-success-light px-2 py-1 rounded">
                        <span className="font-sans font-black">Amount Collected:</span>
                        <span className="font-black">
                          ₱{(activeLoan.totalAmountPayable - activeLoan.remainingBalance).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 text-slate-800 bg-slate-50 px-2 py-1 rounded">
                        <span className="font-sans font-bold">Outstanding Balance:</span>
                        <span className="font-black text-slate-900">₱{activeLoan.remainingBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Account Status:</span>
                      <span
                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${
                          activeLoan.status === "ACTIVE"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : activeLoan.status === "FULLY_PAID"
                            ? "bg-success-light text-success border-success-light"
                            : "bg-danger-light text-danger border-danger-light animate-pulse"
                        }`}
                      >
                        {activeLoan.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Payments Ledger */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Receipt Ledger & Installment Payments
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">OR Number</th>
                        <th scope="col" className="px-6 py-3.5">Payment Date</th>
                        <th scope="col" className="px-6 py-3.5">Amount Paid</th>
                        <th scope="col" className="px-6 py-3.5">Method</th>
                        <th scope="col" className="px-6 py-3.5">Cashier</th>
                        <th scope="col" className="px-6 py-3.5 text-right no-print">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {loanPaymentsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                            No installment payments recorded for this loan yet.
                          </td>
                        </tr>
                      ) : (
                        loanPaymentsData.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-black font-mono text-slate-800 text-xs">
                              {pay.receiptNumber}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-500">
                              {pay.paymentDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-success">
                              ₱{pay.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs uppercase font-bold text-slate-500">
                              {pay.paymentMethod}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                              {pay.cashier.name}
                            </td>
                            <td className="px-6 py-4 text-right no-print">
                              <Link
                                href={`/payments/receipt/${pay.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover hover:underline"
                              >
                                Print OR &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
