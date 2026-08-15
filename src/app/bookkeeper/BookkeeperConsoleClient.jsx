"use client";

import React, { useState } from "react";
import EmployeeCombobox from "@/components/EmployeeCombobox";

export default function BookkeeperConsoleClient({
  user,
  employees,
  oldLoans = [],
  requests = [],
  activeLoans = [],
  encodeOldLoanAction,
  deleteOldLoanAction,
  reviewRequestAction,
}) {
  const isBookkeeper = user?.role === "BOOKKEEPER";

  const [activeTab, setActiveTab] = useState("ENCODE"); // "ENCODE" | "REQUESTS" | "EXISTING_LOANS"
  
  // Request Queue Sub-Filter State
  const [requestFilter, setRequestFilter] = useState("ALL"); // "ALL" | "PENDING" | "APPROVED" | "REJECTED"

  // Encoding Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [dateSince, setDateSince] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Dialog State
  const [reviewRequest, setReviewRequest] = useState(null); // request being reviewed
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Existing Loans Directory Search & Modal State
  const [loanSearch, setLoanSearch] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("ALL"); // "ALL" | "REGULAR" | "OLD_LOAN"
  const [selectedLoanDetail, setSelectedLoanDetail] = useState(null); // Modal detail item

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId) || null;

  async function handleEncodeSubmit(e) {
    e.preventDefault();
    if (!isBookkeeper) {
      setError("Only Bookkeepers can encode or edit old loan records.");
      return;
    }
    if (!selectedEmployee) {
      setError("Please select an employee first.");
      return;
    }
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("employeeId", selectedEmployee.id);
    formData.append("estimatedAmount", estimatedAmount);
    formData.append("dateSince", dateSince);
    formData.append("remarks", remarks);

    try {
      const res = await encodeOldLoanAction(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess("Old loan record saved successfully!");
        setEstimatedAmount("");
        setDateSince("");
        setRemarks("");
        setSelectedEmployeeId("");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!isBookkeeper) {
      alert("Only Bookkeepers can delete records. Admin access is view-only.");
      return;
    }
    if (!confirm("Are you sure you want to delete this old loan record? This will also delete any request details for this borrower.")) return;
    try {
      const res = await deleteOldLoanAction(id);
      if (res && res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReviewSubmit(status) {
    if (!isBookkeeper) {
      alert("Only Bookkeepers can decide on booking override requests.");
      return;
    }
    if (!reviewRequest) return;
    setIsReviewing(true);

    const formData = new FormData();
    formData.append("requestId", reviewRequest.id);
    formData.append("status", status);
    formData.append("remarks", reviewRemarks);

    try {
      const res = await reviewRequestAction(formData);
      if (res && res.error) {
        alert(res.error);
      } else {
        setReviewRequest(null);
        setReviewRemarks("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReviewing(false);
    }
  }

  // Filter requests by status
  const filteredRequests = requests.filter(r => {
    if (requestFilter === "PENDING") return r.status === "PENDING";
    if (requestFilter === "APPROVED") return r.status === "APPROVED";
    if (requestFilter === "REJECTED") return r.status === "REJECTED";
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const approvedCount = requests.filter(r => r.status === "APPROVED").length;
  const rejectedCount = requests.filter(r => r.status === "REJECTED").length;

  // Build existing loans combined list
  const combinedExistingLoans = [
    ...activeLoans.map(l => {
      const totalPaid = l.payments ? l.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      return {
        id: l.id,
        type: "REGULAR",
        typeLabel: "Regular Booking Loan",
        borrowerName: l.booking.employee.fullName,
        employeeId: l.booking.employee.employeeId,
        officeName: l.booking.employee.office.name,
        reference: l.booking.referenceNumber,
        destination: l.booking.destination,
        airline: l.booking.airline.name,
        date: l.createdAt,
        totalOwed: l.totalAmountPayable,
        totalPaid,
        remainingBalance: l.remainingBalance,
        status: l.status,
        rawObj: l,
      };
    }),
    ...oldLoans.map(ol => {
      const totalPaid = ol.payments ? ol.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
      const originalAmount = ol.estimatedAmount || 0;
      const remaining = Math.max(0, originalAmount - totalPaid);
      return {
        id: ol.id,
        type: "OLD_LOAN",
        typeLabel: "Encoded Pre-existing Loan",
        borrowerName: ol.employee.fullName,
        employeeId: ol.employee.employeeId,
        officeName: ol.employee.office.name,
        reference: `Oldest: ${new Date(ol.dateSince).toLocaleDateString()}`,
        destination: "N/A (Pre-existing Debt)",
        airline: "N/A",
        date: ol.dateSince,
        totalOwed: originalAmount,
        totalPaid,
        remainingBalance: remaining,
        status: "OLD LOAN LOCKED",
        remarks: ol.remarks,
        rawObj: ol,
      };
    }),
  ];

  // Filter combined loans for Existing Loans tab
  const filteredLoansDirectory = combinedExistingLoans.filter(item => {
    const matchesSearch =
      item.borrowerName.toLowerCase().includes(loanSearch.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(loanSearch.toLowerCase()) ||
      item.officeName.toLowerCase().includes(loanSearch.toLowerCase()) ||
      item.reference.toLowerCase().includes(loanSearch.toLowerCase());

    const matchesType =
      loanTypeFilter === "ALL" ||
      (loanTypeFilter === "REGULAR" && item.type === "REGULAR") ||
      (loanTypeFilter === "OLD_LOAN" && item.type === "OLD_LOAN");

    return matchesSearch && matchesType;
  });

  // Calculate totals for KPI cards
  const totalDebtorsCount = new Set(combinedExistingLoans.map(i => i.employeeId)).size;
  const totalRegularDebt = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalOldDebt = oldLoans.reduce((sum, ol) => {
    const paid = ol.payments ? ol.payments.reduce((s, p) => s + p.amount, 0) : 0;
    return sum + Math.max(0, (ol.estimatedAmount || 0) - paid);
  }, 0);
  const totalCombinedDebt = totalRegularDebt + totalOldDebt;

  return (
    <div className="space-y-6">
      {/* Admin View-Only Alert Banner */}
      {!isBookkeeper && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl shadow-sm text-amber-900 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <span className="text-xl">ℹ️</span>
          <div>
            <span className="font-bold text-amber-950 block text-sm">View-Only Admin Mode</span>
            As Admin, you have view-only access to the Bookkeeper console. You can inspect all records, approval histories, and active debt directories, but encoding, editing, deleting, and decision approvals are reserved strictly for Bookkeepers.
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 rounded-2xl shadow-sm border select-none">
        <button
          onClick={() => setActiveTab("ENCODE")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "ENCODE"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span>✍️ Encode Old Loans</span>
        </button>

        <button
          onClick={() => setActiveTab("REQUESTS")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "REQUESTS"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span>⚖️ Booking Requests Queue</span>
          {pendingCount > 0 && (
            <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("EXISTING_LOANS")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "EXISTING_LOANS"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span>💳 Existing Loans Directory</span>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold">
            {combinedExistingLoans.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ENCODE OLD LOANS */}
      {activeTab === "ENCODE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 self-start">
            <div>
              <h3 className="text-lg font-black text-slate-800">Encode Pre-existing Loans</h3>
              <p className="text-xs text-slate-400 mt-1">
                Record undocumented old loans for employees to lock future automatic bookings until cleared.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold leading-relaxed animate-pulse">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold leading-relaxed">
                {success}
              </div>
            )}

            {!isBookkeeper ? (
              <div className="p-4 bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded-xl font-medium leading-relaxed">
                🔒 Encoding form is disabled for Admin accounts. Only Bookkeepers can encode or edit pre-existing loan records.
              </div>
            ) : (
              <form onSubmit={handleEncodeSubmit} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Borrower
                  </label>
                  <EmployeeCombobox
                    employees={employees}
                    value={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    placeholder="Search or select borrower name/ID..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Total Amount Owed (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(e.target.value)}
                    placeholder="e.g., 45000.00"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Oldest Loan Date <span className="text-rose-500">*</span>
                    <span className="text-slate-400 font-normal normal-case ml-1">(date of oldest unpaid loan)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateSince}
                    onChange={(e) => setDateSince(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Remarks / Notes
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional details or context..."
                    rows="3"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving Record..." : "💾 Encode Record"}
                </button>
              </form>
            )}
          </div>

          {/* List Table Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">Encoded Records Directory</h3>
              <p className="text-xs text-slate-400 mt-1">
                Currently locked employees with pre-existing unrecorded loan configurations.
              </p>
            </div>

            {oldLoans.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                No encoded pre-existing loan records registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee / Unit</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Amount Owed</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Oldest Loan Date</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks</th>
                      {isBookkeeper && (
                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {oldLoans.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-800">{rec.employee.fullName}</div>
                          <div className="text-[10px] text-slate-400">ID: {rec.employee.employeeId} • {rec.employee.office.name}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-bold text-slate-700 font-mono">
                          {rec.estimatedAmount != null
                            ? `₱${rec.estimatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                            : <span className="text-rose-400 font-normal text-[10px]">Not set</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-medium">
                          {new Date(rec.dateSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={rec.remarks || ""}>
                          {rec.remarks || "—"}
                        </td>
                        {isBookkeeper && (
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                            <button
                              onClick={() => {
                                setSelectedEmployeeId(rec.employee.id);
                                setEstimatedAmount(rec.estimatedAmount != null ? String(rec.estimatedAmount) : "");
                                setDateSince(new Date(rec.dateSince).toISOString().substring(0, 10));
                                setRemarks(rec.remarks || "");
                                setError("");
                                setSuccess("");
                              }}
                              className="text-primary hover:text-primary-hover font-bold mr-3 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKING REQUESTS QUEUE (WITH STATUS SUB-FILTERS) */}
      {activeTab === "REQUESTS" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">Booking Agent Approval Requests</h3>
              <p className="text-xs text-slate-400 mt-1">
                Decision history and queue for Booking Agents requesting separate approvals to override old loan lock status.
              </p>
            </div>

            {/* Sub-Filters Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold self-start md:self-auto">
              <button
                onClick={() => setRequestFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  requestFilter === "ALL"
                    ? "bg-white text-slate-800 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({requests.length})
              </button>
              <button
                onClick={() => setRequestFilter("PENDING")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  requestFilter === "PENDING"
                    ? "bg-amber-500 text-white shadow-sm font-black"
                    : "text-amber-700 hover:bg-amber-100/60"
                }`}
              >
                <span>⏳ Pending</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-600 text-white px-1.5 py-0.2 text-[10px] rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRequestFilter("APPROVED")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  requestFilter === "APPROVED"
                    ? "bg-emerald-600 text-white shadow-sm font-black"
                    : "text-emerald-700 hover:bg-emerald-100/60"
                }`}
              >
                <span>✅ Approved</span>
                <span className="bg-emerald-700/40 text-emerald-100 px-1.5 py-0.2 text-[10px] rounded-full">
                  {approvedCount}
                </span>
              </button>
              <button
                onClick={() => setRequestFilter("REJECTED")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  requestFilter === "REJECTED"
                    ? "bg-rose-600 text-white shadow-sm font-black"
                    : "text-rose-700 hover:bg-rose-100/60"
                }`}
              >
                <span>❌ Rejected</span>
                <span className="bg-rose-700/40 text-rose-100 px-1.5 py-0.2 text-[10px] rounded-full">
                  {rejectedCount}
                </span>
              </button>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              No booking approval requests found for filter "{requestFilter}".
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee / Borrower</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Requested By Agent</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Requested</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Decision & Reviewer Details</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Action / State</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-800">{req.employee.fullName}</div>
                        <div className="text-[10px] text-slate-400">ID: {req.employee.employeeId} • {req.employee.office.name}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-700">
                        {req.requestedBy.name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        {new Date(req.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                            req.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs">
                        {req.status === "PENDING" ? (
                          <span className="text-slate-400 italic">Awaiting decision...</span>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-800">
                              Reviewed by: <span className="text-primary">{req.reviewedBy ? req.reviewedBy.name : "Bookkeeper"}</span>
                            </div>
                            {req.reviewedAt && (
                              <div className="text-[10px] text-slate-400">
                                On {new Date(req.reviewedAt).toLocaleString()}
                              </div>
                            )}
                            {req.remarks && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 truncate" title={req.remarks}>
                                "{req.remarks}"
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        {req.status === "PENDING" ? (
                          isBookkeeper ? (
                            <button
                              onClick={() => {
                                setReviewRequest(req);
                                setReviewRemarks("");
                              }}
                              className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                            >
                              Review & Decide
                            </button>
                          ) : (
                            <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-[10px]">
                              Bookkeeper Review Required
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 font-medium">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXISTING LOANS & BORROWER DEBT DIRECTORY */}
      {activeTab === "EXISTING_LOANS" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Debtors</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{totalDebtorsCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Unique borrowers with active debts</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regular Loans Balance</div>
              <div className="text-2xl font-black text-primary font-mono mt-1">
                ₱{totalRegularDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Outstanding from active bookings</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Encoded Old Loans Total</div>
              <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                ₱{totalOldDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Pre-existing unrecorded debts</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="text-xs font-bold text-primary uppercase tracking-wider">Overall Outstanding Debt</div>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                ₱{totalCombinedDebt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Combined regular + old debts</div>
            </div>
          </div>

          {/* Directory Filter & Search Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">Borrowers with Existing Loans Directory</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Comprehensive master list of all employees currently carrying active regular loans or encoded pre-existing debts.
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    placeholder="Search borrower or ref..."
                    className="block w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 transition-all"
                  />
                  <svg className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Type Filter */}
                <select
                  value={loanTypeFilter}
                  onChange={(e) => setLoanTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 focus:border-primary focus:outline-none transition-all cursor-pointer bg-white"
                >
                  <option value="ALL">All Debt Types</option>
                  <option value="REGULAR">Regular Booking Loans</option>
                  <option value="OLD_LOAN">Encoded Pre-existing Loans</option>
                </select>
              </div>
            </div>

            {filteredLoansDirectory.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                No active loans or borrowers match your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Borrower & Office</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Debt Type</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Reference / Date</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Original Total</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Paid</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining Balance</th>
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredLoansDirectory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-800">{item.borrowerName}</div>
                          <div className="text-[10px] text-slate-400">ID: {item.employeeId} • {item.officeName}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.type === "REGULAR"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {item.typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-mono">
                          {item.reference}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-medium text-slate-600 font-mono">
                          ₱{item.totalOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-medium text-emerald-600 font-mono">
                          ₱{item.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-black text-rose-600 font-mono">
                          ₱{item.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                          <button
                            onClick={() => setSelectedLoanDetail(item)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px]"
                          >
                            Full Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Modal Dialog */}
      {reviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">Decision Review Gate</h3>
              <p className="text-xs text-slate-400 mt-1">
                Evaluate booking approval request for borrower <b>{reviewRequest.employee.fullName}</b>.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Requested by agent <b>{reviewRequest.requestedBy.name}</b> on {new Date(reviewRequest.createdAt).toLocaleString()}.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Review Decision Remarks
              </label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Provide feedback or justification comments..."
                rows="3"
                className="block w-full rounded-xl border border-slate-350 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleReviewSubmit("REJECTED")}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleReviewSubmit("APPROVED")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Details Modal for Selected Borrower Loan */}
      {selectedLoanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedLoanDetail.typeLabel}
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-1">{selectedLoanDetail.borrowerName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: {selectedLoanDetail.employeeId} • Office: {selectedLoanDetail.officeName}
                </p>
              </div>
              <button
                onClick={() => setSelectedLoanDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Summary Grid */}
            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Amount Owed</div>
                <div className="text-base font-black text-slate-800 font-mono mt-0.5">
                  ₱{selectedLoanDetail.totalOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</div>
                <div className="text-base font-black text-emerald-600 font-mono mt-0.5">
                  ₱{selectedLoanDetail.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Remaining Balance</div>
                <div className="text-base font-black text-rose-600 font-mono mt-0.5">
                  ₱{selectedLoanDetail.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Regular Loan Breakdown */}
            {selectedLoanDetail.type === "REGULAR" && selectedLoanDetail.rawObj && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Booking & Loan Breakdown</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Reference No:</span> <b className="font-mono">{selectedLoanDetail.rawObj.booking.referenceNumber}</b></div>
                    <div><span className="text-slate-400">Airline:</span> <b>{selectedLoanDetail.rawObj.booking.airline.name}</b></div>
                    <div><span className="text-slate-400">Destination:</span> <b>{selectedLoanDetail.rawObj.booking.destination}</b></div>
                    <div><span className="text-slate-400">Trip Type:</span> <b>{selectedLoanDetail.rawObj.booking.tripType}</b></div>
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Principal Amount:</span> <b className="font-mono">₱{selectedLoanDetail.rawObj.principalAmount.toLocaleString()}</b></div>
                    <div><span className="text-slate-400">Interest Rate:</span> <b>{selectedLoanDetail.rawObj.interestRate}%</b></div>
                    <div><span className="text-slate-400">Monthly Installment:</span> <b className="font-mono">₱{selectedLoanDetail.rawObj.monthlyInstallment.toLocaleString()}</b></div>
                    <div><span className="text-slate-400">Due Date:</span> <b>{new Date(selectedLoanDetail.rawObj.dueDate).toLocaleDateString()}</b></div>
                  </div>
                </div>

                {/* Payments Log Table */}
                <div className="pt-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Payment History Logs</h4>
                  {selectedLoanDetail.rawObj.payments && selectedLoanDetail.rawObj.payments.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">OR / Receipt #</th>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">Date</th>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">Cashier</th>
                            <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedLoanDetail.rawObj.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{p.receiptNumber}</td>
                              <td className="px-3 py-2 text-slate-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-slate-600">{p.cashier?.name || "Cashier"}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">₱{p.amountPaid.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      No payments recorded yet for this regular loan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Old Loan Breakdown */}
            {selectedLoanDetail.type === "OLD_LOAN" && selectedLoanDetail.rawObj && (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pre-existing Debt Details</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div><span className="text-slate-400">Oldest Loan Date:</span> <b>{new Date(selectedLoanDetail.rawObj.dateSince).toLocaleDateString()}</b></div>
                  <div><span className="text-slate-400">Remarks / Context:</span> <span className="text-slate-700">{selectedLoanDetail.rawObj.remarks || "None specified"}</span></div>
                </div>

                {/* Old Loan Payments Log */}
                <div className="pt-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Payment Logs for Old Loan</h4>
                  {selectedLoanDetail.rawObj.payments && selectedLoanDetail.rawObj.payments.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">Date</th>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">Receipt / Ref</th>
                            <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400">Paid By</th>
                            <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedLoanDetail.rawObj.payments.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                              <td className="px-3 py-2 font-mono text-slate-800">{p.receiptNumber || "N/A"}</td>
                              <td className="px-3 py-2 text-slate-600">{p.paidBy?.name || "User"}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">₱{p.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      No payment logs recorded yet for this pre-existing debt.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedLoanDetail(null)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                Close Details Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
