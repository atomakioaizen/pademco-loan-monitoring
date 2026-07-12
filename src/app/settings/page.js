import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import CreateUserForm from "./CreateUserForm";
import CooperativeSettingsForm from "./CooperativeSettingsForm";
import AgentCommissionSettingsForm from "./AgentCommissionSettingsForm";
import DeleteButton from "@/components/DeleteButton";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System Settings & User Console - PADEMCO",
};

export default async function SettingsPage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "BOOKKEEPER") redirect("/");

  const resolvedParams = await searchParams;
  const editUserId = resolvedParams?.editUserId || null;
  const successMsg = resolvedParams?.success || null;
  const errorMsg = resolvedParams?.error || null;

  // Fetch all required settings data in parallel
  const [
    settingsList,
    users,
    employeesWithoutAccount,
    editUser,
    archivedBookings
  ] = await Promise.all([
    db.systemSetting.findMany(),
    db.user.findMany({
      include: { employee: true },
      orderBy: { username: "asc" },
    }),
    db.employee.findMany({
      where: {
        user: null,
        status: "ACTIVE",
      },
      orderBy: { fullName: "asc" },
    }),
    editUserId
      ? db.user.findFirst({
          where: { id: editUserId, role: { in: ["CASHIER", "AGENT"] } },
        })
      : Promise.resolve(null),
    db.booking.findMany({
      where: { isArchived: true },
      include: {
        employee: true,
        airline: true
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const settings = settingsList.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  // Server Action to update settings
  async function saveSettings(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const org_name = formData.get("org_name")?.trim();
    const org_address = formData.get("org_address")?.trim();
    const service_fee = formData.get("service_fee")?.trim();
    const interest_rate = formData.get("interest_rate")?.trim();
    const rebooking_fee = formData.get("rebooking_fee")?.trim() || "200.00";
    const max_active_flights = formData.get("max_active_flights")?.trim();
    const brand_color = formData.get("brand_color")?.trim();
    let system_logo = formData.get("system_logo")?.trim() || "";

    const logoFile = formData.get("logo_file");
    if (logoFile && logoFile.size > 0 && logoFile.name) {
      try {
        const bytes = await logoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileExtension = logoFile.name.split('.').pop() || 'png';
        const filename = `logo-${Date.now()}.${fileExtension}`;
        const filePath = path.join(process.cwd(), 'public', filename);
        await fs.writeFile(filePath, buffer);
        system_logo = `/${filename}`;
      } catch (err) {
        console.error("Failed to save uploaded logo:", err);
      }
    }

    if (!org_name || !org_address || !service_fee || !interest_rate || !max_active_flights) {
      return { error: "All configuration settings fields are required." };
    }

    const serviceFeeVal = parseFloat(service_fee);
    const interestRateVal = parseFloat(interest_rate);
    const rebookingFeeVal = parseFloat(rebooking_fee);
    const maxActiveFlightsVal = parseInt(max_active_flights);

    if (isNaN(serviceFeeVal) || serviceFeeVal < 0 || isNaN(interestRateVal) || interestRateVal < 0 || isNaN(rebookingFeeVal) || rebookingFeeVal < 0) {
      return { error: "Service fee, interest rate, and rebooking fee must be valid non-negative numbers." };
    }

    if (isNaN(maxActiveFlightsVal) || maxActiveFlightsVal < 1) {
      return { error: "Maximum active flights limit must be a valid positive integer." };
    }

    try {
      const keys = {
        org_name,
        org_address,
        service_fee: serviceFeeVal.toString(),
        interest_rate: interestRateVal.toString(),
        rebooking_fee: rebookingFeeVal.toString(),
        max_active_flights: maxActiveFlightsVal.toString(),
        ...(brand_color && { brand_color }),
        system_logo,
      };

      // Perform transaction atomic upserting for each setting
      await db.$transaction(
        Object.entries(keys).map(([key, value]) =>
          db.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        )
      );

      await logAction(
        session.id,
        "UPDATE",
        "SETTINGS",
        `Updated cooperative settings to: Org Name: "${org_name}", Org Address: "${org_address}", Service Fee: ₱${serviceFeeVal}, Rebooking Fee: ₱${rebookingFeeVal}, Interest Rate: ${interestRateVal}%, Max Active Flights Limit: ${maxActiveFlightsVal}`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to update configuration settings." };
    }

    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath("/payments");
  }

  // Server Action to provision a new User Account
  async function createUserAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "BOOKKEEPER")) {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name")?.trim();
    const username = formData.get("username")?.trim().toLowerCase();
    const password = formData.get("password");
    const role = formData.get("role");
    const employeeId = formData.get("employeeId") || null;
    const commissionRate = 75;

    if (!name || !username || !password || !role) {
      return { error: "Please fill in all user profile fields." };
    }

    if (role === "ADMIN" || role === "VIEWER") {
      return { error: "Security rule: Admin and Viewer accounts cannot be created in this panel." };
    }

    try {
      // Enforce role limits
      if (role === "ADMIN") {
        const adminCount = await db.user.count({ where: { role: "ADMIN" } });
        if (adminCount >= 1) {
          return { error: "System limit reached: Maximum of 1 Administrator account is allowed." };
        }
      } else if (role === "AGENT") {
        const agentCount = await db.user.count({ where: { role: "AGENT" } });
        if (agentCount >= 5) {
          return { error: "System limit reached: Maximum of 5 Booking Agent accounts is allowed." };
        }
      } else if (role === "CASHIER") {
        const cashierCount = await db.user.count({ where: { role: "CASHIER" } });
        if (cashierCount >= 3) {
          return { error: "System limit reached: Maximum of 3 Cashier accounts is allowed." };
        }
      } else if (role === "BOOKKEEPER") {
        const bookkeeperCount = await db.user.count({ where: { role: "BOOKKEEPER" } });
        if (bookkeeperCount >= 3) {
          return { error: "System limit reached: Maximum of 3 Bookkeeper accounts is allowed." };
        }
      }

      // Check duplicate username (case-insensitive)
      const allUsers = await db.user.findMany();
      const existingUserByUsername = allUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (existingUserByUsername) {
        return { error: `Username "${username}" is already taken by another system user.` };
      }

      // Check duplicate full name (case-insensitive)
      const existingUserByName = allUsers.find(
        (u) => u.name.toLowerCase() === name.toLowerCase()
      );
      const allEmployees = await db.employee.findMany();
      const existingEmployeeByName = allEmployees.find(
        (e) => e.fullName.toLowerCase() === name.toLowerCase()
      );
      if (existingUserByName || existingEmployeeByName) {
        return { error: `Full name "${name}" is already registered.` };
      }

      // employeeId linking removed for VIEWER (handled in Employee tab)

      const passwordHash = hashPassword(password);

      await db.user.create({
        data: {
          name,
          username,
          passwordHash,
          role,
          employeeId: null,
          commissionRate,
        },
      });

      await logAction(
        session.id,
        "CREATE",
        "USER",
        `Provisioned new user account credentials for ${username} (${role}).`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to create user account." };
    }

    revalidatePath("/settings");
  }

  // Server Action to update general system-wide commission rate
  async function saveCommissionRateAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const rate = formData.get("agent_commission_rate")?.trim();
    if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) < 0) {
      return { error: "Please enter a valid general commission rate." };
    }

    try {
      await db.systemSetting.upsert({
        where: { key: "agent_commission_rate" },
        update: { value: rate },
        create: { key: "agent_commission_rate", value: rate },
      });

      await logAction(
        session.id,
        "UPDATE",
        "SETTINGS",
        `Updated general booking agent commission rate to ₱${rate}`
      );
    } catch (e) {
      console.error(e);
      return { error: "Failed to update commission rate." };
    }

    revalidatePath("/settings");
    revalidatePath("/commissions");
  }

  // Server Action to update a CASHIER or AGENT user account (admin only)
  async function updateStaffUserAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id")?.trim();
    const name = formData.get("name")?.trim();
    const username = formData.get("username")?.trim().toLowerCase();
    const newPassword = formData.get("newPassword")?.trim();

    if (!id || !name || !username) {
      redirect(`/settings?editUserId=${id}&error=Name and username are required.`);
    }

    try {
      const target = await db.user.findUnique({ where: { id } });
      if (!target || (target.role !== "CASHIER" && target.role !== "AGENT")) {
        redirect("/settings?error=User not found or not editable.");
      }

      // Check username uniqueness (excluding self)
      const conflict = await db.user.findFirst({
        where: { username, id: { not: id } },
      });
      if (conflict) {
        redirect(`/settings?editUserId=${id}&error=Username "${username}" is already taken.`);
      }

      const updateData = { name, username };
      if (newPassword && newPassword.length >= 4) {
        updateData.passwordHash = hashPassword(newPassword);
      }

      await db.user.update({ where: { id }, data: updateData });

      await logAction(
        session.id,
        "UPDATE",
        "USER",
        `Admin updated account for "${username}" (${target.role}).${newPassword ? " Password was reset." : ""}`
      );
    } catch (e) {
      if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      console.error(e);
      redirect(`/settings?editUserId=${id}&error=Failed to update user account.`);
    }

    revalidatePath("/settings");
    redirect("/settings?success=User account updated successfully.");
  }

  // Server Action to delete a User Account
  async function deleteUserAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id");
    if (id === session.id) {
      return { error: "Security rule: You cannot delete your own active administrator account." };
    }

    try {
      const targetUser = await db.user.findUnique({ where: { id } });
      if (!targetUser) return { error: "User account not found." };

      await db.user.delete({ where: { id } });

      await logAction(
        session.id,
        "DELETE",
        "USER",
        `Deleted user credentials for "${targetUser.username}".`
      );

    } catch (e) {
      console.error(e);
      return { error: "Failed to delete user account." };
    }

    revalidatePath("/settings");
  }

  // Server Action to restore a soft-deleted/archived Booking from settings panel
  async function restoreBookingAction(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id");
    if (!id) return;

    try {
      const booking = await db.booking.findUnique({ where: { id } });
      if (!booking) return { error: "Archived booking not found." };

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

    revalidatePath("/settings");
    revalidatePath("/bookings");
    revalidatePath("/reports");
  }

  return (
    <AppLayout user={session}>
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">System settings & User Accounts</h1>
          <p className="text-sm text-slate-500">
            Configure system rules, default loan parameters, and provision secure access credentials for employees.
          </p>
        </div>

        {/* Dynamic Multi-Section Grid */}
        <div className={session.role === "ADMIN" ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "max-w-2xl mx-auto"}>
          
          {/* Section 1: System formulas & default rules */}
          {session.role === "ADMIN" && (
            <CooperativeSettingsForm
              settings={settings}
              action={saveSettings}
            />
          )}

          <div className="space-y-8">
            {/* Section 2: Create user credentials */}
            <CreateUserForm
              employees={employeesWithoutAccount}
              action={createUserAction}
            />

            {/* Section 2b: Booking Agent Commission settings */}
            {session.role === "ADMIN" && (
              <AgentCommissionSettingsForm
                initialRate={settings.agent_commission_rate || "75"}
                action={saveCommissionRateAction}
              />
            )}
          </div>
        </div>

        {/* Section 3: List all system accounts */}
        {session.role === "ADMIN" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                System Account Directory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                List of registered administrators, cashiers, and mapped employee viewer accounts.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              {users.length} registered users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Display Name</th>
                  <th scope="col" className="px-6 py-3.5">Username</th>
                  <th scope="col" className="px-6 py-3.5">System Access Role</th>
                  <th scope="col" className="px-6 py-3.5">Linked Employee Profile</th>
                  <th scope="col" className="px-6 py-3.5 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{u.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-500 text-xs">{u.username}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : u.role === "CASHIER"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : u.role === "AGENT"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {u.employee ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{u.employee.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{u.employee.employeeId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">General Portal Account</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      {u.id === session.id ? (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold border border-slate-200 p-1.5 px-2.5 rounded-lg">
                          Active Session
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {(u.role === "CASHIER" || u.role === "AGENT") && (
                            <a
                              href={`/settings?editUserId=${u.id}`}
                              className="text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 p-1.5 px-2.5 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              ✏️ Edit
                            </a>
                          )}
                          <DeleteButton
                            id={u.id}
                            action={deleteUserAction}
                            confirmMessage={`Are you sure you want to permanently delete the user credentials for "${u.username}"?`}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Edit Staff User Modal */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-800">Edit Staff Account</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Editing <span className="font-bold text-indigo-600">{editUser.username}</span>{" "}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      editUser.role === "CASHIER"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-indigo-100 text-indigo-800 border-indigo-200"
                    }`}>{editUser.role}</span>
                  </p>
                </div>
                <a
                  href="/settings"
                  className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none font-bold"
                  aria-label="Close"
                >
                  ×
                </a>
              </div>

              {/* Inline banners inside modal */}
              {errorMsg && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Modal Body Form */}
              <form action={updateStaffUserAction} className="p-6 space-y-4">
                <input type="hidden" name="id" value={editUser.id} />

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="edit-name">
                    Display Name
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    required
                    defaultValue={editUser.name}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    placeholder="Full display name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="edit-username">
                    Username
                  </label>
                  <input
                    id="edit-username"
                    name="username"
                    type="text"
                    required
                    defaultValue={editUser.username}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    placeholder="e.g. cashier01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1" htmlFor="edit-password">
                    New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <input
                    id="edit-password"
                    name="newPassword"
                    type="password"
                    minLength={4}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    placeholder="Min. 4 characters"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <a
                    href="/settings"
                    className="flex-1 text-center py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </a>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && !editUser && (
          <div className="fixed bottom-6 right-6 z-50 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
            ✅ {successMsg}
          </div>
        )}

        {/* Section 4: Archived Bookings Trashbin */}
        {session.role === "ADMIN" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>🗑️ Archived Bookings Trashbin</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                List of soft-deleted bookings. Restoring a booking will reactivate its associated loan record instantly.
              </p>
            </div>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
              {archivedBookings.length} archived records
            </span>
          </div>

          <div className="overflow-x-auto">
            {archivedBookings.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-medium">
                The trashbin is empty. No archived bookings found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">PNR Reference</th>
                    <th scope="col" className="px-6 py-3.5">Employee Name</th>
                    <th scope="col" className="px-6 py-3.5">Destination</th>
                    <th scope="col" className="px-6 py-3.5">Cost</th>
                    <th scope="col" className="px-6 py-3.5">Service Fee</th>
                    <th scope="col" className="px-6 py-3.5">Archived At</th>
                    <th scope="col" className="px-6 py-3.5 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {archivedBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">{b.referenceNumber}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{b.employee.fullName}</td>
                      <td className="px-6 py-4 font-medium text-slate-600">{b.destination}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">₱{b.ticketCost.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-slate-500">₱{b.serviceFee.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                        {new Date(b.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right no-print">
                        <form action={restoreBookingAction} className="inline">
                          <input type="hidden" name="id" value={b.id} />
                          <button
                            type="submit"
                            className="text-success hover:text-success/90 font-bold text-xs py-1 px-3 border border-success/20 rounded-lg bg-success/5 hover:bg-success/10 cursor-pointer transition-colors shadow-sm"
                          >
                            🔄 Restore (Undo)
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        )}
      </div>
    </AppLayout>
  );
}
