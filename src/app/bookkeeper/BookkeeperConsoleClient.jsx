"use client";

import React, { useState } from "react";
import EmployeeCombobox from "@/components/EmployeeCombobox";

export default function BookkeeperConsoleClient({
  employees,
  oldLoans,
  requests,
  encodeOldLoanAction,
  deleteOldLoanAction,
  reviewRequestAction,
}) {
  const [activeTab, setActiveTab] = useState("ENCODE"); // "ENCODE" | "REQUESTS"
  
  // Encoding Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [totalOldLoans, setTotalOldLoans] = useState("");
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

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId) || null;

  async function handleEncodeSubmit(e) {
    e.preventDefault();
    if (!selectedEmployee) {
      setError("Please select an employee first.");
      return;
    }
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("employeeId", selectedEmployee.id);
    formData.append("totalOldLoans", totalOldLoans);
    formData.append("estimatedAmount", estimatedAmount);
    formData.append("dateSince", dateSince);
    formData.append("remarks", remarks);

    try {
      const res = await encodeOldLoanAction(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess("Old loan record saved successfully!");
        setTotalOldLoans("");
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

  return (
    <div className="space-y-6">
      {/* Dynamic Tabs */}
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
          {requests.filter(r => r.status === "PENDING").length > 0 && (
            <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold animate-pulse">
              {requests.filter(r => r.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "ENCODE" ? (
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

            <form onSubmit={handleEncodeSubmit} className="space-y-4">
              {/* Employee Autocomplete Search */}
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

              {/* Total Old Loans */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Total Old Loans
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={totalOldLoans}
                  onChange={(e) => setTotalOldLoans(e.target.value)}
                  placeholder="e.g., 2"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                />
              </div>

              {/* Estimated Total Amount (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estimated Total Amount (₱) <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  placeholder="e.g., 15000.00"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
                />
              </div>

              {/* Date Since */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date since old loan exists
                </label>
                <input
                  type="date"
                  required
                  value={dateSince}
                  onChange={(e) => setDateSince(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
                />
              </div>

              {/* Remarks */}
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
                      <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Loans</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Est. Amount</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Encoded Since</th>
                      <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {oldLoans.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-800">{rec.employee.fullName}</div>
                          <div className="text-[10px] text-slate-400">ID: {rec.employee.employeeId} • {rec.employee.office.name}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-black text-slate-800">
                          {rec.totalOldLoans}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-bold text-slate-700 font-mono">
                          {rec.estimatedAmount != null
                            ? `₱${rec.estimatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                            : <span className="text-slate-400 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-medium">
                          {new Date(rec.dateSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={rec.remarks || ""}>
                          {rec.remarks || "—"}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                          <button
                            onClick={() => {
                              setSelectedEmployeeId(rec.employee.id);
                              setTotalOldLoans(String(rec.totalOldLoans));
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Requests queue list */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">Booking Agent Approval Requests</h3>
            <p className="text-xs text-slate-400 mt-1">
              Decision queue for Booking Agents requesting separate approvals to override old loan lock status.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              No approval requests logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee / Borrower</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Requested By Agent</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Created</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Reviews</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Decision Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {requests.map((req) => (
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                            req.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : req.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={req.remarks || ""}>
                        {req.remarks || "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        {req.status === "PENDING" ? (
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
    </div>
  );
}
