"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CommissionsDashboardClient({
  agentsData,
  session,
  selectedMonth,
  markAsPaidAction,
  revertToUnpaidAction,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Track which agent's detailed breakdown modal is open (for admin/cashier view)
  const [activeModalAgentId, setActiveModalAgentId] = useState(null);

  // Parse Year and Month for professional label (e.g. "May 2026")
  const [yearStr, monthStr] = selectedMonth.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const selectedMonthName = monthNames[parseInt(monthStr) - 1] || "Month";
  const selectedPeriodDisplay = `${selectedMonthName} ${yearStr}`;

  // Period Selector Change
  const handlePeriodChange = (e) => {
    const nextMonth = e.target.value;
    if (nextMonth) {
      startTransition(() => {
        router.push(`/commissions?month=${nextMonth}`);
      });
    }
  };

  // Find currently selected agent in modal
  const modalAgent = agentsData.find((a) => a.id === activeModalAgentId);

  // Single Agent details (if active user is an Agent)
  const myData = session.role === "AGENT" ? agentsData[0] : null;

  // Calculate total payout pool required for all agents
  const totalPayoutRequired = agentsData.reduce((sum, agent) => sum + (agent.commissionAmount || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Period Header Card */}
      <div className="bg-gradient-to-r from-primary to-primary-hover rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full border border-white/5">
              Financial Monitoring Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black">
              Agent Commissions Hub
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              Monitor active ticket bookings count, commission rates, and manage monthly payroll payouts for PADEMCO Booking Agents.
            </p>
          </div>
          
          {/* Calendar Month Picker */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col gap-1.5 self-start md:self-auto min-w-[200px]">
            <label htmlFor="month_select" className="text-[10px] font-black text-blue-200 uppercase tracking-wider block">
              Filter Payout Month
            </label>
            <input
              type="month"
              id="month_select"
              value={selectedMonth}
              onChange={handlePeriodChange}
              disabled={isPending}
              className="bg-white text-slate-800 font-mono font-black text-sm px-3.5 py-2 rounded-xl focus:outline-none w-full border-none shadow-md cursor-pointer transition-all hover:bg-slate-50"
            />
          </div>
        </div>

        {/* Subtle Airplane SVG background */}
        <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <svg className="h-64 w-64" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {isPending && (
        <div className="text-center py-4 text-sm font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl animate-pulse">
          ⏳ Loading commission details for the selected period...
        </div>
      )}

      {/* RENDER VIEW BASED ON ROLE */}
      {session.role === "AGENT" ? (
        /* ==========================================
           AGENT VIEW (Personal Dashboard)
           ========================================== */
        <div className="space-y-6">
          {/* Agent Private Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* My Commission Rate */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  My Commission Rate
                </span>
                <span className="p-2 rounded-xl bg-blue-50 text-primary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-slate-800 font-mono">
                  ₱{myData?.commissionRate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  Guaranteed payout per fully paid ticket
                </span>
              </div>
            </div>

            {/* Total Booked / Paid / Rebooked This Month */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Bookings / Rebookings ({selectedPeriodDisplay})
                </span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-black text-slate-800 font-mono">
                  {myData?.totalBookings} Books ({myData?.fullyPaidBookingsCount} Paid)
                </h3>
                <span className="text-[10px] font-bold text-slate-400 mt-1.5 block">
                  Rebooking frequency: <strong className="text-amber-600 font-bold">{myData?.totalRebookings} changes</strong>
                </span>
              </div>
            </div>

            {/* Calculated Salary Earnings */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Total Commission Salary
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-warning">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-slate-800 font-mono">
                  ₱{myData?.commissionAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  Formula: {myData?.fullyPaidBookingsCount} Paid × ₱{myData?.commissionRate}
                </span>
              </div>
            </div>

            {/* Payment Payout Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Month Payout Status
                </span>
                <span className={`p-2 rounded-xl ${myData?.paymentStatus === "PAID" ? "bg-emerald-50 text-success" : "bg-rose-50 text-danger"}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="mt-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${
                    myData?.paymentStatus === "PAID"
                      ? "bg-success-light text-success border-success-light"
                      : "bg-rose-100 text-rose-800 border-rose-200"
                  }`}
                >
                  {myData?.paymentStatus}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                  {myData?.paymentStatus === "PAID"
                    ? `Paid on ${new Date(myData.paymentDetails?.paidAt).toLocaleDateString()}`
                    : "Pending Coop Cashier release"}
                </span>
              </div>
            </div>
          </div>

          {/* Bookings Table List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  My Booked Tickets List — {selectedPeriodDisplay}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  List of all successful ticket bookings credited to my commission account for this month.
                </p>
              </div>
              <span className="text-xs font-semibold text-primary bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-inner font-mono">
                Total: {myData?.totalBookings || 0} tickets
              </span>
            </div>

            <div className="overflow-x-auto">
              {(!myData || myData.bookings.length === 0) ? (
                <div className="p-12 text-center text-slate-400 font-medium">
                  🚫 You have not made any ticket bookings in this period.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th scope="col" className="px-6 py-3">PNR Reference</th>
                      <th scope="col" className="px-6 py-3">Borrower Employee</th>
                      <th scope="col" className="px-6 py-3">Airline & Destination</th>
                      <th scope="col" className="px-6 py-3">Travel Date</th>
                      <th scope="col" className="px-6 py-3">Ticket Cost</th>
                      <th scope="col" className="px-6 py-3">Commission Earned</th>
                      <th scope="col" className="px-6 py-3">Date Booked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {myData.bookings.map((booking) => {
                      const isFullyPaid = booking.loan?.status === "FULLY_PAID";
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-primary text-xs">
                            <div className="flex flex-col">
                              <span>{booking.referenceNumber}</span>
                              {booking.histories?.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-max">
                                  🔄 Rebooked ({booking.histories.length})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{booking.employee.fullName}</span>
                              <span className="text-[9px] font-mono text-slate-400 mt-0.5">{booking.employee.office.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{booking.airline.name}</span>
                              <span className="text-[10px] text-slate-500 mt-0.5">{booking.destination}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-600">
                            {new Date(booking.travelDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            ₱{booking.ticketCost.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-mono font-black">
                            <div className="flex flex-col">
                              <span className={isFullyPaid ? "text-success font-black" : "text-slate-400 font-semibold"}>
                                ₱{isFullyPaid ? myData.commissionRate.toFixed(2) : "0.00"}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded border w-max ${
                                isFullyPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              }`}>
                                {booking.loan?.status || "NO LOAN"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-400 font-mono">
                            {new Date(booking.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==========================================
           ADMIN & CASHIER VIEW (Interactive Cards)
           ========================================== */
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Booking Agents Directory — {selectedPeriodDisplay}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each card represents an active booking agent. **Click any card** to pop open their full detailed breakdown ledger.
              </p>
            </div>
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              Total Payout Pool: ₱{totalPayoutRequired.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* DYNAMIC AGENT CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentsData.map((agent) => {
              const isPaid = agent.paymentStatus === "PAID";
              return (
                <div
                  key={agent.id}
                  onClick={() => setActiveModalAgentId(agent.id)}
                  className="group bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5 flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Subtle Background Icon */}
                  <div className="absolute right-0 top-0 text-slate-100 group-hover:text-primary-light/30 transition-colors pointer-events-none translate-x-2 -translate-y-2">
                    <svg className="h-28 w-28" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>

                  <div className="relative z-10 space-y-4">
                    {/* Badge & Username */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                        @{agent.username}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          isPaid
                            ? "bg-success-light text-success border-success-light"
                            : "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                        }`}
                      >
                        {agent.paymentStatus}
                      </span>
                    </div>

                    {/* Agent Name */}
                    <div>
                      <h3 className="text-xl font-black text-slate-800 group-hover:text-primary transition-colors leading-tight">
                        {agent.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                        Booking Agent Account
                      </span>
                    </div>

                    {/* Mini Stats inside card */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 font-mono text-xs mt-2">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rate</span>
                        <span className="block mt-1 font-bold text-slate-700 font-mono">₱{agent.commissionRate}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bookings</span>
                        <span className="block mt-1 font-bold text-slate-700 font-mono">{agent.totalBookings} ({agent.fullyPaidBookingsCount} Paid)</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2.5 col-span-2">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rebookings (Assessment)</span>
                        <span className="block mt-1.5 font-bold text-amber-700 font-mono">🔄 {agent.totalRebookings} rebookings</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Commission payout */}
                  <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Salary Earnings</span>
                      <span className="block mt-1.5 text-lg font-black text-slate-800 font-mono">
                        ₱{agent.commissionAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="block text-[8px] font-bold text-slate-400 mt-1">
                        Formula: {agent.fullyPaidBookingsCount} Paid × ₱{agent.commissionRate}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-primary group-hover:underline flex items-center gap-1">
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verification Tip */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-primary-dark font-medium leading-relaxed flex items-start gap-2.5">
            <span className="text-sm">💡</span>
            <div>
              <p className="font-bold text-primary">Separation of Payroll Controls & Duties:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>**Cashier Account** (`cashier`): Authorized to mark monthly payouts as **PAID** or revert back.</li>
                <li>**Admin Account** (`admin`): Authorized to configure and edit commission rates (e.g. ₱50 or ₱75) in the **System Settings** directory table.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
         INTERACTIVE BREAKDOWN MODAL (ADMIN & CASHIER ONLY)
         ============================================================== */}
      {modalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          {/* Modal Container */}
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 transform transition-all duration-300 scale-100 max-h-[85vh] animate-slide-up">
            
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary to-primary-hover text-white flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 px-2.5 py-0.5 rounded-full border border-white/5 font-mono">
                  Agent Payroll Ledger
                </span>
                <h3 className="text-lg font-black mt-1 leading-tight">
                  {modalAgent.name} (@{modalAgent.username})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalAgentId(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all cursor-pointer font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Top Monthly Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-center p-1.5">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Rate</span>
                  <span className="block mt-1 text-lg font-black text-slate-800 font-mono">₱{modalAgent.commissionRate.toFixed(2)}</span>
                </div>
                <div className="text-center p-1.5 border-t md:border-t-0 md:border-l border-slate-200">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Bookings</span>
                  <span className="block mt-1 text-lg font-black text-slate-800 font-mono">{modalAgent.totalBookings} ({modalAgent.fullyPaidBookingsCount} Paid)</span>
                </div>
                <div className="text-center p-1.5 border-t md:border-t-0 md:border-l border-slate-200">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Rebookings</span>
                  <span className="block mt-1 text-lg font-black text-amber-700 font-mono">🔄 {modalAgent.totalRebookings}</span>
                </div>
                <div className="text-center p-1.5 border-t md:border-t-0 md:border-l border-slate-200">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Calculated Payout</span>
                  <span className="block mt-1 text-lg font-black text-primary font-mono">
                    ₱{modalAgent.commissionAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* ACTION BAR (ROLE SEPARATION ENFORCED) */}
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payout Payment Status</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${
                        modalAgent.paymentStatus === "PAID"
                          ? "bg-success-light text-success border-success-light"
                          : "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                      }`}
                    >
                      {modalAgent.paymentStatus}
                    </span>
                    {modalAgent.paymentStatus === "PAID" && (
                      <span className="text-slate-500 font-bold text-xs font-mono">
                        (Approved on {new Date(modalAgent.paymentDetails.paidAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Separation: Only Cashier can Toggle payment status */}
                <div>
                  {session.role === "CASHIER" ? (
                    modalAgent.paymentStatus === "UNPAID" ? (
                      <form action={markAsPaidAction} onSubmit={() => setActiveModalAgentId(null)} className="inline-block">
                        <input type="hidden" name="agentId" value={modalAgent.id} />
                        <input type="hidden" name="monthYear" value={selectedMonth} />
                        <input type="hidden" name="rate" value={modalAgent.commissionRate} />
                        <input type="hidden" name="amount" value={modalAgent.commissionAmount} />
                        <input type="hidden" name="bookingCount" value={modalAgent.totalBookings} />
                        <button
                          type="submit"
                          disabled={modalAgent.totalBookings === 0}
                          className="text-white hover:bg-success/90 bg-success font-black text-xs py-3 px-5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                        >
                          💰 Approve & Mark as Paid
                        </button>
                      </form>
                    ) : (
                      <form action={revertToUnpaidAction} onSubmit={() => setActiveModalAgentId(null)} className="inline-block">
                        <input type="hidden" name="agentId" value={modalAgent.id} />
                        <input type="hidden" name="monthYear" value={selectedMonth} />
                        <button
                          type="submit"
                          className="text-danger hover:text-white border border-danger/30 hover:bg-danger font-bold text-xs py-2.5 px-4.5 rounded-xl cursor-pointer transition-all bg-danger-light"
                        >
                          🔄 Revert Payout to Unpaid
                        </button>
                      </form>
                    )
                  ) : (
                    /* Admin View: Locked from changing status */
                    <div className="bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-xl text-[10px] text-amber-800 max-w-xs font-semibold">
                      🛡️ Only Cashiers are authorized to record payout payments. Admins configure commission rates under "System Settings".
                    </div>
                  )}
                </div>
              </div>

              {/* Bookings Ledger detailed table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Monthly Bookings Breakdown
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  {modalAgent.bookings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-medium bg-slate-50/50">
                      🚫 No ticket bookings were created by {modalAgent.name} during this period.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                        <tr>
                          <th scope="col" className="px-5 py-3">PNR Reference</th>
                          <th scope="col" className="px-5 py-3">Borrower Employee</th>
                          <th scope="col" className="px-5 py-3">Airline & Destination</th>
                          <th scope="col" className="px-5 py-3">Travel Date</th>
                          <th scope="col" className="px-5 py-3 font-mono">Cost</th>
                          <th scope="col" className="px-5 py-3 text-center">Loan Status</th>
                          <th scope="col" className="px-5 py-3 text-center">Rebookings</th>
                          <th scope="col" className="px-5 py-3">Date Booked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-600">
                        {modalAgent.bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-primary">
                              {booking.referenceNumber}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col font-semibold">
                                <span className="text-slate-800">{booking.employee.fullName}</span>
                                <span className="text-[8px] font-mono text-slate-400 mt-0.5">{booking.employee.office.name}</span>
                                {booking.passengerName && (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md leading-none w-max">
                                    🎫 {booking.passengerName} ({booking.passengerRelationship})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col font-semibold">
                                <span className="text-slate-700">{booking.airline.name}</span>
                                <span className="text-[9px] text-slate-500 mt-0.5">{booking.destination}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-semibold text-slate-500">
                              {new Date(booking.travelDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </td>
                            <td className="px-5 py-3 font-mono font-bold text-slate-800">
                              ₱{booking.ticketCost.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                booking.loan?.status === "FULLY_PAID"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                              }`}>
                                {booking.loan?.status || "NO LOAN"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-bold text-slate-700">
                              {booking.histories?.length > 0 ? (
                                <span className="text-amber-700">🔄 {booking.histories.length}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-[10px] text-slate-400 font-mono">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
 
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 font-mono">
                Formula: {modalAgent.fullyPaidBookingsCount} Paid Bookings × ₱{modalAgent.commissionRate} = ₱{modalAgent.commissionAmount}
              </span>
              <button
                type="button"
                onClick={() => setActiveModalAgentId(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
