import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import DeleteButton from "@/components/DeleteButton";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Office Management - PADEMCO",
};

export default async function OfficesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  // Load all offices with employee counts
  const offices = await db.office.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Server Action to add a new office
  async function addOffice(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name")?.trim();
    if (!name) return { error: "Office name is required." };

    try {
      // Check if office exists
      const existing = await db.office.findUnique({
        where: { name },
      });

      if (existing) {
        return { error: "An office with this name already exists." };
      }

      const office = await db.office.create({
        data: { name },
      });

      await logAction(
        session.id,
        "CREATE",
        "OFFICE",
        `Created office "${office.name}" (ID: ${office.id})`
      );
    } catch (e) {
      console.error(e);
      return { error: "Failed to add office." };
    }

    revalidatePath("/offices");
  }

  // Server Action to delete an office
  async function deleteOffice(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id");
    if (!id) return;

    try {
      const office = await db.office.findUnique({
        where: { id },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });

      if (!office) return { error: "Office not found." };
      if (office._count.employees > 0) {
        return {
          error: `Cannot delete office. It contains ${office._count.employees} employees. Move them first!`,
        };
      }

      await db.office.delete({
        where: { id },
      });

      await logAction(
        session.id,
        "DELETE",
        "OFFICE",
        `Deleted office "${office.name}"`
      );
    } catch (e) {
      console.error(e);
      return { error: "Failed to delete office." };
    }

    revalidatePath("/offices");
  }

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-primary">Office / Unit Management</h1>
            <p className="text-sm text-slate-500">
              Manage all DENR divisions, provincial, and community offices (PENRO/CENRO).
            </p>
          </div>
        </div>

        {/* Two Column Layout: List and Add Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Offices Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Active Offices & Divisions
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Office / Division Name</th>
                    <th scope="col" className="px-6 py-3.5">Employees Count</th>
                    <th scope="col" className="px-6 py-3.5">Created Date</th>
                    {session.role === "ADMIN" && (
                      <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {offices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                        No offices created yet. Use the form to add one.
                      </td>
                    </tr>
                  ) : (
                    offices.map((office) => (
                      <tr key={office.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{office.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {office._count.employees} employees
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {office.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        {session.role === "ADMIN" && (
                          <td className="px-6 py-4 text-right">
                            <DeleteButton
                              id={office.id}
                              action={deleteOffice}
                              confirmMessage={`Are you sure you want to delete "${office.name}"?`}
                            />
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Office Form */}
          {session.role === "ADMIN" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 self-start space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">Add New Office</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new DENR sector or division to categorize employees.
                </p>
              </div>

              <form action={addOffice} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                    Office / Division Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    placeholder="e.g., CENRO Daet"
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer"
                >
                  Save Office
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
