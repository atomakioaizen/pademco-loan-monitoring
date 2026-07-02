import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employee Management - PADEMCO",
};

export default async function EmployeesPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || "";
  const officeFilter = resolvedSearchParams.office || "";
  const viewId = resolvedSearchParams.viewId || null;
  const tab = resolvedSearchParams.tab || "active"; // "active" | "inactive" | "create"
  const successMsg = resolvedSearchParams.success || null;
  const errorMsg = resolvedSearchParams.error || null;

  let viewEmployee = null;
  if (viewId) {
    viewEmployee = await db.employee.findUnique({
      where: { id: viewId },
      include: { office: true, user: true },
    });
  }

  const offices = await db.office.findMany({ orderBy: { name: "asc" } });

  // Build filter conditions
  const searchWhere = search
    ? {
        OR: [
          { fullName: { contains: search } },
          { employeeId: { contains: search } },
          { position: { contains: search } },
        ],
      }
    : {};

  const officeWhere = officeFilter ? { officeId: officeFilter } : {};

  // Active employees
  const activeEmployees = await db.employee.findMany({
    where: { AND: [{ status: "ACTIVE" }, searchWhere, officeWhere] },
    include: { office: true, _count: { select: { bookings: true } } },
    orderBy: { fullName: "asc" },
  });

  // Inactive/archived employees
  const inactiveEmployees = await db.employee.findMany({
    where: { AND: [{ status: "INACTIVE" }, searchWhere, officeWhere] },
    include: { office: true, _count: { select: { bookings: true } } },
    orderBy: { fullName: "asc" },
  });

  // Outstanding flight counts
  const outstandingBookings = await db.booking.findMany({
    where: { loan: { status: { not: "FULLY_PAID" } } },
    select: { employeeId: true, flightCount: true },
  });
  const flightCountMap = outstandingBookings.reduce((acc, curr) => {
    acc[curr.employeeId] = (acc[curr.employeeId] || 0) + curr.flightCount;
    return acc;
  }, {});

  // ─── SERVER ACTIONS ───────────────────────────────────────────────────────

  async function saveEmployee(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const id = formData.get("id");
    const employeeId = formData.get("employeeId")?.trim();
    const fullName = formData.get("fullName")?.trim();
    const officeId = formData.get("officeId");
    const position = formData.get("position")?.trim();
    const contactNumber = formData.get("contactNumber")?.trim();
    const status = formData.get("status") || "ACTIVE";
    const birthDate = formData.get("birthDate") || null;
    const gender = formData.get("gender") || null;
    const email = formData.get("email")?.trim() || null;
    const govIdType = formData.get("govIdType") || null;
    const govIdNumber = formData.get("govIdNumber")?.trim() || null;
    const username = formData.get("username")?.trim().toLowerCase();
    const password = formData.get("password");

    if (!fullName || !officeId || !position || !contactNumber || !username) {
      redirect(`/employees?tab=${id ? "active" : "create"}${id ? `&viewId=${id}` : ""}&error=${encodeURIComponent("Full Name, Office, Position, Contact Number, and Username are all required.")}`);
    }

    // Auto-generate employeeId if not provided
    const finalEmployeeId = employeeId || `EMP-${Date.now()}`;

    try {
      const allEmployees = await db.employee.findMany();
      // Duplicate employeeId check — skip if auto-generated (starts with EMP-)
      if (employeeId && !finalEmployeeId.startsWith("EMP-")) {
        const duplicateEmpId = allEmployees.find(
          (e) => e.employeeId.toLowerCase() === finalEmployeeId.toLowerCase() && (id ? e.id !== id : true)
        );
        if (duplicateEmpId) {
          redirect(`/employees?tab=${id ? "active" : "create"}${id ? `&viewId=${id}` : ""}&error=${encodeURIComponent(`Employee ID "${finalEmployeeId}" is already registered.`)}`);
        }
      }

      // Duplicate fullName check case-insensitively
      const duplicateEmpName = allEmployees.find(
        (e) => e.fullName.toLowerCase() === fullName.toLowerCase() && (id ? e.id !== id : true)
      );
      const allUsers = await db.user.findMany();
      const duplicateUserName = allUsers.find(
        (u) => u.name.toLowerCase() === fullName.toLowerCase() && (id ? u.employeeId !== id : true)
      );
      if (duplicateEmpName || duplicateUserName) {
        redirect(`/employees?tab=${id ? "active" : "create"}${id ? `&viewId=${id}` : ""}&error=${encodeURIComponent(`Full Name "${fullName}" is already taken by another record.`)}`);
      }

      let emp;
      if (id) {
        emp = await db.employee.update({
          where: { id },
          data: { employeeId: finalEmployeeId, fullName, officeId, position, contactNumber, birthDate, gender, email, govIdType, govIdNumber, status },
        });

        const empUser = await db.user.findUnique({ where: { employeeId: emp.id } });
        const existingUser = allUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase() && (empUser ? u.id !== empUser.id : true)
        );
        if (existingUser) {
          redirect(`/employees?tab=active&viewId=${id}&error=${encodeURIComponent(`Username "${username}" is already taken by another user.`)}`);
        }

        if (!empUser) {
          if (!password) {
            redirect(`/employees?tab=active&viewId=${id}&error=${encodeURIComponent("A password is required to generate a portal account.")}`);
          }
          const passwordHash = hashPassword(password);
          await db.user.create({
            data: {
              name: fullName,
              username,
              passwordHash,
              role: "VIEWER",
              status: "APPROVED",
              employeeId: emp.id,
            },
          });
        } else {
          const passwordHash = password ? hashPassword(password) : undefined;
          await db.user.update({
            where: { id: empUser.id },
            data: {
              name: fullName,
              username,
              passwordHash: passwordHash || undefined,
            },
          });
        }
        await logAction(session.id, "UPDATE", "EMPLOYEE", `Updated employee "${emp.fullName}" (ID: ${emp.employeeId})`);
      } else {
        const employeeCount = await db.employee.count();
        if (employeeCount >= 500) {
          redirect(`/employees?tab=create&error=${encodeURIComponent("System limit reached: Maximum of 500 Employee profiles allowed.")}`);
        }

        emp = await db.employee.create({
          data: { employeeId: finalEmployeeId, fullName, officeId, position, contactNumber, birthDate, gender, email, govIdType, govIdNumber, status },
        });

        const loanerCount = await db.user.count({ where: { role: "VIEWER" } });
        if (loanerCount >= 500) {
          redirect(`/employees?tab=create&error=${encodeURIComponent("System limit reached: Maximum of 500 Loaner accounts allowed.")}`);
        }
        const existingUser = allUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        if (existingUser) {
          redirect(`/employees?tab=create&error=${encodeURIComponent(`Username "${username}" is already taken by another user.`)}`);
        }
        if (!password) {
          redirect(`/employees?tab=create&error=${encodeURIComponent("A password is required to generate a portal account.")}`);
        }
        const passwordHash = hashPassword(password);
        await db.user.create({
          data: {
            name: fullName,
            username,
            passwordHash,
            role: "VIEWER",
            status: "APPROVED",
            employeeId: emp.id,
          },
        });
        await logAction(session.id, "CREATE", "EMPLOYEE", `Registered employee "${emp.fullName}" (ID: ${emp.employeeId})`);
      }
    } catch (e) {
      if (e?.message === "NEXT_REDIRECT") throw e;
      console.error(e);
      redirect(`/employees?tab=${id ? "active" : "create"}${id ? `&viewId=${id}` : ""}&error=${encodeURIComponent("Failed to save employee record. Please try again.")}`);
    }
    revalidatePath("/employees");
    redirect(`/employees?tab=${status === "ACTIVE" ? "active" : "inactive"}&success=${encodeURIComponent("Employee profile saved successfully!")}`);
  }

  async function setDefaultPassword(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const empDbId = formData.get("empDbId");
    if (!empDbId) return;

    try {
      const empUser = await db.user.findUnique({ where: { employeeId: empDbId } });
      if (!empUser) {
        redirect(`/employees?tab=active&viewId=${empDbId}&error=${encodeURIComponent("No portal account found for this employee.")}`);
      }
      const passwordHash = hashPassword("employee123");
      await db.user.update({
        where: { id: empUser.id },
        data: { passwordHash },
      });
      await logAction(
        session.id, "UPDATE", "USER",
        `Admin reset portal password to default (employee123) for account "${empUser.username}".`
      );
    } catch (e) {
      if (e?.message === "NEXT_REDIRECT") throw e;
      console.error(e);
      redirect(`/employees?tab=active&viewId=${empDbId}&error=${encodeURIComponent("Failed to reset password. Please try again.")}`);
    }
    revalidatePath("/employees");
    redirect(`/employees?tab=active&viewId=${empDbId}&success=${encodeURIComponent("Password has been reset to default (employee123). Inform the employee to use: employee123")}`);
  }

  async function deleteEmployee(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const id = formData.get("id");
    if (!id) return;

    try {
      const employee = await db.employee.findUnique({
        where: { id },
      });
      if (!employee) return { error: "Employee not found." };

      await db.$transaction(async (tx) => {
        const bookings = await tx.booking.findMany({ where: { employeeId: id } });
        for (const b of bookings) {
          const loan = await tx.loan.findUnique({ where: { bookingId: b.id } });
          if (loan) {
            await tx.payment.deleteMany({ where: { loanId: loan.id } });
            await tx.loan.delete({ where: { id: loan.id } });
          }
          await tx.bookingHistory.deleteMany({ where: { bookingId: b.id } });
          await tx.booking.delete({ where: { id: b.id } });
        }
        await tx.user.deleteMany({ where: { employeeId: id } });
        await tx.employee.delete({ where: { id } });
      });

      await logAction(session.id, "DELETE", "EMPLOYEE", `Permanently deleted employee "${employee.fullName}" and all associated data.`);
    } catch (e) {
      console.error(e);
      return { error: "Failed to permanently delete employee." };
    }
    revalidatePath("/employees");
  }

  async function archiveEmployee(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const id = formData.get("id");
    if (!id) return;

    try {
      const employee = await db.employee.findUnique({
        where: { id },
        include: { _count: { select: { bookings: true } } },
      });
      if (!employee) return { error: "Employee not found." };

      await db.employee.update({ where: { id }, data: { status: "INACTIVE" } });
      await logAction(session.id, "UPDATE", "EMPLOYEE", `Archived employee "${employee.fullName}" — set to INACTIVE`);
    } catch (e) {
      console.error(e);
      return { error: "Failed to archive employee." };
    }
    revalidatePath("/employees");
  }

  async function restoreEmployee(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const id = formData.get("id");
    if (!id) return;

    try {
      const employee = await db.employee.findUnique({ where: { id } });
      if (!employee) return { error: "Employee not found." };

      await db.employee.update({ where: { id }, data: { status: "ACTIVE" } });
      await logAction(session.id, "UPDATE", "EMPLOYEE", `Restored employee "${employee.fullName}" — set back to ACTIVE`);
    } catch (e) {
      console.error(e);
      return { error: "Failed to restore employee." };
    }
    revalidatePath("/employees");
  }

  async function updateEmployeeStatus(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

    const employeeId = formData.get("employeeId");
    const status = formData.get("status");
    if (!employeeId || !status) return;

    try {
      const emp = await db.employee.update({ where: { id: employeeId }, data: { status } });
      await logAction(session.id, "UPDATE", "EMPLOYEE", `Admin changed status of "${emp.fullName}" to ${status}`);
    } catch (e) {
      console.error(e);
      return { error: "Failed to update employee status." };
    }
    revalidatePath("/employees");
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  const tabs = [
    { key: "active", label: "Active Employees", count: activeEmployees.length, color: "emerald" },
    { key: "inactive", label: "Archived / Inactive", count: inactiveEmployees.length, color: "rose" },
    { key: "create", label: "Register New Employee", count: null, color: "blue" },
  ];

  const displayedEmployees = tab === "inactive" ? inactiveEmployees : activeEmployees;

  return (
    <AppLayout user={session}>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">Employee Management</h1>
          <p className="text-sm text-slate-500">
            Register, search, and manage DENR employees. Archived employees retain their full loan history.
          </p>
        </div>

        {/* Success / Error Banners */}
        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 animate-fadeIn flex items-center gap-3">
            <span className="text-emerald-500 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <p className="text-xs font-bold text-emerald-700">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 animate-fadeIn flex items-center gap-3">
            <span className="text-rose-500 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            <p className="text-xs font-bold text-rose-700">⚠️ {errorMsg}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/employees?tab=${t.key}`}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    tab === t.key
                      ? t.color === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : t.color === "rose"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-blue-100 text-blue-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* ── REGISTER NEW EMPLOYEE TAB ────────────────────────────────────── */}
        {tab === "create" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-800">Register New Employee</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter credentials to add a new employee profile. This profile will be available in the flight booking selection.
              </p>
            </div>

            <form action={saveEmployee} className="space-y-6">
              
              {/* SECTION 1: Core Profile Info */}
              <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <span className="block text-[10px] font-black text-primary uppercase tracking-widest">
                  1. Core Profile Information
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="employeeId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Employee ID <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input type="text" name="employeeId" id="employeeId" autoComplete="off"
                      placeholder="e.g., DENR-2026-0041 (leave blank to auto-generate)"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                    <input type="text" name="fullName" id="fullName" required autoComplete="off"
                      placeholder="e.g., Juan D. Dela Cruz"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                  <div>
                    <label htmlFor="officeId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Office / Unit / Division</label>
                    <select name="officeId" id="officeId" required
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium">
                      <option value="">Select Office</option>
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>{off.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="position" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Job Position / Title</label>
                    <input type="text" name="position" id="position" required autoComplete="off"
                      placeholder="e.g., Forest Ranger"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                  <div>
                    <label htmlFor="contactNumber" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Number</label>
                    <input type="text" name="contactNumber" id="contactNumber" required autoComplete="off"
                      placeholder="e.g., 09171234567"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Employment Status</label>
                    <select name="status" id="status"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-bold cursor-pointer">
                      <option value="ACTIVE">ACTIVE (Allowed to borrow)</option>
                      <option value="INACTIVE">INACTIVE (Resigned / Non-Member)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Ticketing Profile */}
              <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <span className="block text-[10px] font-black text-primary uppercase tracking-widest">
                  2. Ticketing & Booking Profile
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="birthDate" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Birth Date</label>
                    <input type="date" name="birthDate" id="birthDate"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white" />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Gender</label>
                    <select name="gender" id="gender"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium">
                      <option value="">Select Gender</option>
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                    <input type="email" name="email" id="email" autoComplete="off"
                      placeholder="e.g., juan@denr.gov.ph"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="govIdType" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Travel ID Type</label>
                    <select name="govIdType" id="govIdType"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium">
                      <option value="">Select ID Type</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="UMID">UMID Card</option>
                      <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                      <option value="GSIS">GSIS eCard</option>
                      <option value="SSS">SSS Card</option>
                      <option value="PRC">PRC License</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="govIdNumber" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Document / ID No.</label>
                    <input type="text" name="govIdNumber" id="govIdNumber" autoComplete="off"
                      placeholder="e.g., P9876543A"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono" />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Login Credentials */}
              <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    3. Portal Login Credentials
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Enter a username and password to generate a VIEWER account for this employee.
                  </p>
                </div>

                {/* Default Password Helper Banner */}
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-amber-800">💡 Default Password Option</p>
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      You can use <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-amber-900">employee123</code> as the default password for new loaner accounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const pwEl = document.getElementById('new-emp-password');
                      if (pwEl) { pwEl.value = 'employee123'; pwEl.type = 'text'; }
                    }}
                    className="ml-3 shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Use Default
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="new-emp-username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Username *</label>
                    <input type="text" name="username" id="new-emp-username" required autoComplete="off"
                      placeholder="e.g., juan_dlc"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium" />
                  </div>
                  <div>
                    <label htmlFor="new-emp-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password *</label>
                    <input type="password" name="password" id="new-emp-password" required autoComplete="new-password"
                      placeholder="••••••••"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-6 rounded-xl text-sm font-black shadow-md transition-all hover:shadow-lg cursor-pointer">
                  Save &amp; Register Employee
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── ACTIVE / INACTIVE EMPLOYEE TABLES ───────────────────────────── */}
        {(tab === "active" || tab === "inactive") && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center gap-4">
              <form className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="hidden" name="tab" value={tab} />
                <div className="relative">
                  <input type="text" name="search" defaultValue={search}
                    placeholder="Search ID, name, position..."
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all" />
                  <span className="absolute left-3.5 top-2.5 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <select name="office" defaultValue={officeFilter}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white">
                  <option value="">All Offices / Divisions</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>{off.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer">
                    Filter
                  </button>
                  <Link href={`/employees?tab=${tab}`}
                    className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-slate-200 text-center">
                    Reset
                  </Link>
                </div>
              </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  {tab === "active"
                    ? `Active Employees (${activeEmployees.length})`
                    : `Archived / Inactive Employees (${inactiveEmployees.length})`}
                </h2>
                {tab === "inactive" && (
                  <span className="text-xs text-slate-400 font-medium">
                    Employees here can be restored to Active status or permanently deleted.
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Employee ID</th>
                      <th scope="col" className="px-6 py-3.5">Full Name</th>
                      <th scope="col" className="px-6 py-3.5">Office/Division</th>
                      <th scope="col" className="px-6 py-3.5">Position</th>
                      <th scope="col" className="px-6 py-3.5">Contact No.</th>
                      <th scope="col" className="px-6 py-3.5">Borrowing Limit</th>
                      <th scope="col" className="px-6 py-3.5 text-center no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {displayedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                          {tab === "inactive"
                            ? "No archived employees found."
                            : "No active employees found matching the filters."}
                        </td>
                      </tr>
                    ) : (
                      displayedEmployees.map((emp) => {
                        const outstandingFlights = flightCountMap[emp.id] || 0;
                        const isLimitReached = outstandingFlights >= 4;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-600 text-xs">{emp.employeeId}</td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-primary">{emp.fullName}</span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">{emp.office.name}</td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{emp.position}</td>
                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{emp.contactNumber}</td>
                            <td className="px-6 py-4">
                              {tab === "inactive" ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border bg-slate-100 text-slate-500 border-slate-200">
                                  Archived
                                </span>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                                  isLimitReached
                                    ? "bg-rose-100 text-rose-800 border-rose-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                }`}>
                                  {isLimitReached ? "⚠️ PENDING PAYMENT (4/4)" : `${outstandingFlights}/4 Flights`}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 no-print">
                              <div className="flex items-center justify-center gap-2">
                                {/* View Profile Button */}
                                <Link
                                  href={`/employees?tab=${tab}&viewId=${emp.id}`}
                                  className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-sm hover:shadow transition-all"
                                >
                                  View / Edit Profile
                                </Link>

                                {/* Archive / Restore Button */}
                                {tab === "active" ? (
                                  <DeleteButton
                                    id={emp.id}
                                    action={archiveEmployee}
                                    confirmMessage={`Archive "${emp.fullName}"? They will be set to INACTIVE and cannot book new loans.`}
                                    label="Archive"
                                    className="inline-flex items-center justify-center px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 hover:border-amber-400 rounded-xl text-xs font-black transition-all cursor-pointer"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <DeleteButton
                                      id={emp.id}
                                      action={restoreEmployee}
                                      confirmMessage={`Restore "${emp.fullName}" to Active status?`}
                                      label="Restore"
                                      className="inline-flex items-center justify-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    />
                                    <DeleteButton
                                      id={emp.id}
                                      action={deleteEmployee}
                                      confirmMessage={`Permanently delete employee "${emp.fullName}"? This will delete all associated bookings and loans! This cannot be undone.`}
                                      label="Delete Permanently"
                                      className="inline-flex items-center justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 hover:border-rose-400 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Information Modal Overlay (Doubles as Edit Profile Form) */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Edit Employee Profile</h3>
                <p className="text-xs text-slate-500">ID: {viewEmployee.employeeId}</p>
              </div>
              <Link href={`/employees?tab=${tab}`} className="text-slate-400 hover:text-rose-500 transition-colors p-2" title="Close">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            </div>

            {/* Main save form — closed before footer to prevent nested form error */}
            <form id="save-emp-form" action={saveEmployee}>
              <input type="hidden" name="id" value={viewEmployee.id} />
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  {/* Personal & Employment Info */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Employment Details</h4>
                    <div className="space-y-1">
                      <label htmlFor="modal_employeeId" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee ID</label>
                      <input type="text" name="employeeId" id="modal_employeeId" required autoComplete="off" defaultValue={viewEmployee.employeeId}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_fullName" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                      <input type="text" name="fullName" id="modal_fullName" required autoComplete="off" defaultValue={viewEmployee.fullName}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_officeId" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Office / Division</label>
                      <select name="officeId" id="modal_officeId" required defaultValue={viewEmployee.officeId}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
                        {offices.map((off) => (
                          <option key={off.id} value={off.id}>{off.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_position" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Position</label>
                      <input type="text" name="position" id="modal_position" required autoComplete="off" defaultValue={viewEmployee.position}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_status" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</label>
                      <select name="status" id="modal_status" defaultValue={viewEmployee.status}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-bold cursor-pointer focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
                        <option value="ACTIVE">ACTIVE (Allowed to Borrow)</option>
                        <option value="INACTIVE">INACTIVE (Resigned / Non-Member)</option>
                      </select>
                    </div>
                  </div>

                  {/* Contact & Ticketing Credentials */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 border-b pb-2">Contact & Ticketing Credentials</h4>
                    <div className="space-y-1">
                      <label htmlFor="modal_contactNumber" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact No.</label>
                      <input type="text" name="contactNumber" id="modal_contactNumber" required autoComplete="off" defaultValue={viewEmployee.contactNumber}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                      <input type="email" name="email" id="modal_email" autoComplete="off" defaultValue={viewEmployee.email || ""}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_birthDate" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Birth Date</label>
                      <input type="date" name="birthDate" id="modal_birthDate" defaultValue={viewEmployee.birthDate || ""}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_gender" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</label>
                      <select name="gender" id="modal_gender" defaultValue={viewEmployee.gender || ""}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
                        <option value="">Select Gender</option>
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_govIdType" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Travel ID Type</label>
                      <select name="govIdType" id="modal_govIdType" defaultValue={viewEmployee.govIdType || ""}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20">
                        <option value="">Select ID Type</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="UMID">UMID Card</option>
                        <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                        <option value="GSIS">GSIS eCard</option>
                        <option value="SSS">SSS Card</option>
                        <option value="PRC">PRC License</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="modal_govIdNumber" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Document / ID No.</label>
                      <input type="text" name="govIdNumber" id="modal_govIdNumber" autoComplete="off" defaultValue={viewEmployee.govIdNumber || ""}
                        className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                {/* Portal Account Status */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Portal Login Account (VIEWER)</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Please specify the portal login credentials for this employee.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="modal_username" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username *</label>
                        <input type="text" name="username" id="modal_username" required autoComplete="off" defaultValue={viewEmployee.user?.username || ""}
                          placeholder="e.g., juan_dlc"
                          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                      </div>
                      <div>
                        <label htmlFor="modal_password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                        <input type="password" name="password" id="modal_password" autoComplete="new-password"
                          placeholder={viewEmployee.user ? "•••••••• (Leave blank to keep same)" : "•••••••• (Required)"}
                          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-slate-900 text-xs transition-all bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer — outside the main form; uses form= attribute to still submit it */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
              {/* Default Password — a separate valid form, sibling of the main save form */}
              <div>
                {viewEmployee.user ? (
                  <form action={setDefaultPassword}>
                    <input type="hidden" name="empDbId" value={viewEmployee.id} />
                    <button type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 hover:border-amber-400 rounded-xl text-xs font-black transition-all cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Reset to Default Password
                    </button>
                  </form>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Modifying these values will update live databases.</span>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/employees?tab=${tab}`}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors">
                  Cancel
                </Link>
                {/* form= attribute links this button to the main form above */}
                <button type="submit" form="save-emp-form"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
