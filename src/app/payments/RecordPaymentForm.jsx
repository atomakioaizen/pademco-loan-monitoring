"use client";

import { useState, useEffect } from "react";

export default function RecordPaymentForm({
  activeLoans,
  maxActiveFlights,
  strictInstallments,
  action,
  onSuccess,
}) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");

  // Extract unique employees who have active loans
  const uniqueEmployees = [];
  const empIdsSeen = new Set();
  activeLoans.forEach((loan) => {
    const emp = loan.booking?.employee;
    if (emp && !empIdsSeen.has(emp.id)) {
      empIdsSeen.add(emp.id);
      uniqueEmployees.push(emp);
    }
  });

  // Filter loans for selected employee
  const filteredLoans = activeLoans.filter(
    (loan) => loan.booking?.employeeId === selectedEmployeeId
  );

  // Find the selected loan detail
  const selectedLoan = activeLoans.find((l) => l.id === selectedLoanId);

  const getInstallmentSchedule = (loan) => {
    if (!loan) return [];
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    const totalPaid = loan.totalAmountPayable - loan.remainingBalance;

    let status = "UNPAID";
    if (loan.remainingBalance <= 0) status = "PAID";
    else if (totalPaid > 0) status = "PARTIAL";

    let monthsDelayed = 0;
    // Trust DB status as authoritative — avoids timestamp/timezone edge cases
    const isOverdue = (loan.status === "OVERDUE" || dueDate < today) && status !== "PAID";

    if (isOverdue) {
      // Day-level comparison to count full months of delay correctly
      const dueDateDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sy = dueDateDay.getFullYear(), sm = dueDateDay.getMonth(), sd = dueDateDay.getDate();
      const ey = todayDay.getFullYear(), em = todayDay.getMonth(), ed = todayDay.getDate();
      monthsDelayed = (ey - sy) * 12 + (em - sm);
      if (ed > sd) monthsDelayed += 1;
      monthsDelayed = Math.max(1, monthsDelayed);
    }

    // Build one row per month of delay (or a single row if on time)
    if (!isOverdue) {
      return [{
        monthNumber: 1,
        dueDate,
        originalAmount: loan.totalAmountPayable,
        amount: loan.totalAmountPayable,
        paidAmount: totalPaid,
        penalty: 0,
        isOverdue: false,
        status,
        isNextDue: status !== "PAID",
      }];
    }

    // One row per overdue month
    const penaltyPerMonth = loan.remainingBalance * 0.01;
    return Array.from({ length: monthsDelayed }, (_, i) => {
      const rowDue = new Date(dueDate);
      rowDue.setMonth(rowDue.getMonth() + i + 1);
      return {
        monthNumber: i + 1,
        dueDate: rowDue,
        originalAmount: loan.totalAmountPayable,
        amount: penaltyPerMonth,          // each row = 1 month penalty
        penaltyPerMonth,
        totalPenalty: penaltyPerMonth * monthsDelayed,
        grandTotal: loan.remainingBalance + penaltyPerMonth * monthsDelayed,
        paidAmount: totalPaid,
        penalty: penaltyPerMonth,
        isOverdue: true,
        monthsDelayed,
        status,
        isNextDue: i === monthsDelayed - 1, // last row = next action item
      };
    });
  };

  const schedule = getInstallmentSchedule(selectedLoan);
  const totalAccruedPenalty = schedule.reduce((sum, inst) => sum + inst.penalty, 0);
  const nextDueInstallment = schedule.find((inst) => inst.isNextDue);

  // Auto-fill or change defaults when selected loan changes
  useEffect(() => {
    if (selectedLoan) {
      const sch = getInstallmentSchedule(selectedLoan);
      const penalty = sch.reduce((sum, inst) => sum + inst.penalty, 0);
      setAmountPaid((selectedLoan.remainingBalance + penalty).toFixed(2));
    } else {
      setAmountPaid("");
    }
  }, [selectedLoanId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedLoanId) {
      setError("Please select a specific loan account to pay.");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.target);
    formData.set("loanId", selectedLoanId);


    const res = await action(formData);

    setLoading(false);
    if (res && res.error) {
      setError(res.error);
    } else {
      setSuccess("Installment payment posted and balance updated successfully!");
      e.target.reset();
      setSelectedEmployeeId("");
      setSelectedLoanId("");
      setAmountPaid("");
      setPaymentMethod("CASH");
      

      // Flash success and transition back to ledger tab
      setTimeout(() => {
        setSuccess(null);
        if (onSuccess) onSuccess();
      }, 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6 w-full animate-fadeIn">
      <div>
        <h3 className="text-lg font-black text-slate-800">Record Installment Payment</h3>
        <p className="text-xs text-slate-400 mt-1">
          Select an employee and post active flight loan payments with an official receipt number.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Selection & Loan Info */}
        <div className="space-y-5">
        {error && (
          <div className="text-xs bg-rose-50 border border-rose-100 text-danger p-3.5 rounded-xl font-bold animate-pulse">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs bg-emerald-50 border border-emerald-100 text-success p-3.5 rounded-xl font-bold">
            {success}
          </div>
        )}

        {/* Step 1: Select Employee */}
        <div>
          <label htmlFor="employeeId" className="block text-sm font-semibold text-slate-700">
            1. Select Employee / Borrower
          </label>
          <select
            id="employeeId"
            required
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setSelectedLoanId("");
            }}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium"
          >
            <option value="">Select Employee</option>
            {uniqueEmployees.map((emp) => {
              const outstandingFlights = emp.outstandingFlights || 0;
              const isInactive = emp.status === "INACTIVE";
              
              let label = `${emp.fullName}`;
              if (isInactive) {
                label += " (Inactive)";
              } else {
                label += ` ${outstandingFlights}/${maxActiveFlights}`;
              }
              return (
                <option key={emp.id} value={emp.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Step 2: Select Loan Account (only shown if employee is chosen) */}
        {selectedEmployeeId && (
          <div className="animate-fadeIn">
            <label htmlFor="loanIdSelect" className="block text-sm font-semibold text-slate-700">
              2. Select Loan Account
            </label>
            <select
              id="loanIdSelect"
              required
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium animate-fadeIn"
            >
              <option value="">Select Booking Loan</option>
              {filteredLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.booking.destination} — Ref: {loan.booking.referenceNumber} (Bal: ₱{loan.remainingBalance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Loan Detailed Breakdown Card & Rules */}
        {selectedLoan && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fadeIn text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider">Loan Details</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                selectedLoan.status === "OVERDUE" ? "bg-rose-100 text-rose-700" : "bg-primary-light text-primary"
              }`}>
                {selectedLoan.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-slate-600 font-semibold">
              <div>
                <span className="block text-[10px] text-slate-400">Destination</span>
                <span className="text-slate-800 font-bold">{selectedLoan.booking.destination}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Reference Number</span>
                <span className="text-slate-800 font-mono font-bold">{selectedLoan.booking.referenceNumber}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Total Borrowed Amount</span>
                <span>₱{selectedLoan.totalAmountPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Monthly Installment</span>
                <span className="text-primary font-bold">₱{selectedLoan.monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Outstanding Balance</span>
                <span className="text-rose-700 font-bold">₱{selectedLoan.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Due Date</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedLoan.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Passenger / Comaker Badge (shown only if booking was made for a relative) */}
            {selectedLoan.booking.passengerName && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <span className="text-base leading-none mt-0.5">🎫</span>
                <div className="text-[11px] leading-relaxed">
                  <span className="block font-black text-blue-800 uppercase tracking-wider text-[9px] mb-0.5">
                    Comaker / Relative Ticket
                  </span>
                  <span className="block font-bold text-slate-800">
                    Passenger: {selectedLoan.booking.passengerName}
                  </span>
                  <span className="block text-slate-500 font-semibold">
                    Relationship to Borrower: {selectedLoan.booking.passengerRelationship}
                  </span>
                  <span className="block text-blue-700 font-semibold mt-0.5">
                    Legal obligation remains with the employee borrower.
                  </span>
                </div>
              </div>
            )}

            {/* Repayment Policy Card */}
            <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-850 leading-relaxed">
              <div className="font-bold flex items-center gap-1">
                ⚠️ Strict Full Settlement Policy
              </div>
              <p className="text-[11px] mt-0.5">
                Partial payments are strictly prohibited. The loan must be settled in full. If the loan is overdue, the payment amount represents the full outstanding principal. The late penalty must be collected by the cashier.
              </p>
            </div>

            {/* Overdue Penalty Warning — per-month breakdown */}
            {totalAccruedPenalty > 0 && (() => {
              const first = schedule[0];
              if (!first) return null;
              const { monthsDelayed, penaltyPerMonth, totalPenalty, grandTotal, originalAmount } = first;
              return (
                <div className="mt-3 p-3 rounded-xl border border-rose-300 bg-rose-50 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base leading-none">🚨</span>
                    <span className="font-black text-rose-800 uppercase tracking-wider text-[10px]">
                      Overdue — Penalty Breakdown
                    </span>
                    <span className="ml-auto bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      +₱{totalPenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Principal row */}
                  <div className="flex items-center justify-between text-[11px] bg-white border border-slate-200 rounded-lg px-3 py-2 mb-1">
                    <span className="font-bold text-slate-700">📋 Original Loan (Balance Due)</span>
                    <span className="font-black text-slate-800 font-mono">
                      ₱{selectedLoan.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* One row per month of delay */}
                  <div className="space-y-1 mb-2">
                    {schedule.map((inst, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] bg-rose-100/60 border border-rose-200 rounded-lg px-3 py-2">
                        <span className="font-semibold text-rose-800">
                          ⚠️ Month {inst.monthNumber} Delay — 1% Penalty
                          <span className="block text-[10px] text-rose-500 font-medium">
                            {inst.dueDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </span>
                        </span>
                        <span className="font-black text-rose-700 font-mono">
                          +₱{inst.penaltyPerMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Grand total */}
                  <div className="flex items-center justify-between text-[12px] bg-rose-600 rounded-lg px-3 py-2.5 text-white">
                    <span className="font-black uppercase tracking-wide">Total to Settle</span>
                    <span className="font-black font-mono">
                      ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-500 font-semibold mt-2 text-center">
                    Auto-filled in payment fields above. Rate: 1% per month of delay.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
        </div>

        {/* Right Column: Payment Entry */}
        <div className="space-y-5">
        {/* OR number */}
        <div>
          <label htmlFor="receiptNumber" className="block text-sm font-semibold text-slate-700">
            Official Receipt (OR) Number
          </label>
          <input
            type="text"
            name="receiptNumber"
            id="receiptNumber"
            required
            autoComplete="off"
            placeholder="e.g., OR-2026-9901"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-semibold text-slate-700">
            Payment Method
          </label>
          <select
            name="paymentMethod"
            id="paymentMethod"
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium"
          >
            <option value="CASH">CASH</option>
            <option value="GCASH">GCASH</option>
            <option value="BANK_TRANSFER">BANK TRANSFER</option>
          </select>
        </div>


        {/* Amount Paid */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="amountPaid" className="block text-sm font-semibold text-slate-700">
              Amount to Settle (₱)
            </label>
          </div>
          
          <input
            type="number"
            name="amountPaid"
            id="amountPaid"
            required
            readOnly
            autoComplete="off"
            value={amountPaid}
            placeholder="0.00"
            className="block w-full rounded-xl border border-slate-350 bg-slate-50 text-slate-500 cursor-not-allowed px-4 py-2.5 focus:outline-none text-sm font-mono font-bold"
          />
        </div>

        {/* Payment Date */}
        <div>
          <label htmlFor="paymentDate" className="block text-sm font-semibold text-slate-700">
            Payment Date
          </label>
          <input
            type="date"
            name="paymentDate"
            id="paymentDate"
            required
            defaultValue={new Date().toISOString().substring(0, 10)}
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white"
          />
        </div>

        {/* Remarks */}
        <div>
          <label htmlFor="remarks" className="block text-sm font-semibold text-slate-700">
            Remarks
          </label>
          <textarea
            name="remarks"
            id="remarks"
            rows="2"
            placeholder="Installment payment notes..."
            className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedLoanId}
          className="w-full bg-success hover:bg-success-hover text-white py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg cursor-pointer disabled:opacity-50 mt-4"
        >
          {loading ? "Posting Payment..." : "Post Payment"}
        </button>
        </div>
      </form>
    </div>
  );
}
