import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import DeleteButton from "@/components/DeleteButton";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Airline Management - PADEMCO",
};

export default async function AirlinesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  // Load all airlines with booking counts
  const airlines = await db.airline.findMany({
    include: {
      _count: {
        select: { bookings: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Server Action to add airline
  async function addAirline(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name")?.trim();
    if (!name) return { error: "Airline name is required." };

    try {
      const existing = await db.airline.findUnique({
        where: { name },
      });

      if (existing) {
        return { error: "An airline with this name already exists." };
      }

      const airline = await db.airline.create({
        data: { name },
      });

      await logAction(
        session.id,
        "CREATE",
        "AIRLINE",
        `Created airline "${airline.name}" (ID: ${airline.id})`
      );
    } catch (e) {
      console.error(e);
      return { error: "Failed to add airline." };
    }

    revalidatePath("/airlines");
  }

  // Server Action to delete airline
  async function deleteAirline(formData) {
    "use server";
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    const id = formData.get("id");
    if (!id) return;

    try {
      const airline = await db.airline.findUnique({
        where: { id },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!airline) return { error: "Airline not found." };
      if (airline._count.bookings > 0) {
        return {
          error: `Cannot delete airline. It contains ${airline._count.bookings} active bookings.`,
        };
      }

      await db.airline.delete({
        where: { id },
      });

      await logAction(
        session.id,
        "DELETE",
        "AIRLINE",
        `Deleted airline "${airline.name}"`
      );
    } catch (e) {
      console.error(e);
      return { error: "Failed to delete airline." };
    }

    revalidatePath("/airlines");
  }

  return (
    <AppLayout user={session}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-primary">Airline Management</h1>
          <p className="text-sm text-slate-500">
            Configure partner airlines for employee ticket bookings.
          </p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Partner Airlines
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Airline Name</th>
                    <th scope="col" className="px-6 py-3.5">Bookings Recorded</th>
                    <th scope="col" className="px-6 py-3.5">Created Date</th>
                    {session.role === "ADMIN" && (
                      <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {airlines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                        No airlines created yet. Use the form to add one.
                      </td>
                    </tr>
                  ) : (
                    airlines.map((airline) => (
                      <tr key={airline.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-primary">{airline.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {airline._count.bookings} bookings
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {airline.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        {session.role === "ADMIN" && (
                          <td className="px-6 py-4 text-right">
                            <DeleteButton
                              id={airline.id}
                              action={deleteAirline}
                              confirmMessage={`Are you sure you want to delete "${airline.name}"?`}
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

          {/* Form */}
          {session.role === "ADMIN" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 self-start space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800">Add New Airline</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new airline record for airline dropdown options during booking.
                </p>
              </div>

              <form action={addAirline} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                    Airline Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    placeholder="e.g., Philippine Airlines"
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer"
                >
                  Save Airline
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
