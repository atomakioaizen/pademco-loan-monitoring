"use client";

import React, { useState } from "react";
import RecordPaymentForm from "./RecordPaymentForm";
import OldLoanPaymentForm from "./OldLoanPaymentForm";
import Link from "next/link";

export default function PaymentsConsoleClient({
  payments,
  activeLoans,
  maxActiveFlights,
  strictInstallments,
  action,
  oldLoans = [],
  oldLoanAction,
}) {
  const [activeTab, setActiveTab] = useState("process"); // "process" | "oldloan" | "ledger"
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = payments.filter((pay) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      pay.receiptNumber.toLowerCase().includes(term) ||
      pay.loan.booking.employee.fullName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 rounded-2xl shadow-sm border select-none">
        <button
          onClick={() => setActiveTab("process")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "process"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span className="text-base">💵</span>
          <span>Record Loan Payment</span>
        </button>

        <button
          onClick={() => setActiveTab("oldloan")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "oldloan"
              ? "bg-white text-amber-700 border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span className="text-base">📋</span>
          <span>Old Loan Payment</span>
          {oldLoans.length > 0 && (
            <span className="bg-amber-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
              {oldLoans.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "ledger"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span className="text-base">🧾</span>
          <span>Official Receipts Ledger</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="w-full">
        {activeTab === "process" ? (
          <RecordPaymentForm
            activeLoans={activeLoans}
            maxActiveFlights={maxActiveFlights}
            strictInstallments={strictInstallments}
            action={action}
            onSuccess={() => setActiveTab("ledger")}
          />
        ) : activeTab === "oldloan" ? (
          <OldLoanPaymentForm
            oldLoans={oldLoans}
            action={oldLoanAction}
            onSuccess={() => setActiveTab("ledger")}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full animate-fadeIn">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Official Receipts Ledger
              </h2>
              <input
                type="text"
                placeholder="Search Employee or OR Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
            
            <div className="p-4 space-y-4">
              {Object.values(
                filteredPayments.reduce((acc, pay) => {
                  const empId = pay.loan.booking.employee.id;
                  if (!acc[empId]) {
                    acc[empId] = {
                      employee: pay.loan.booking.employee,
                      payments: [],
                    };
                  }
                  acc[empId].payments.push(pay);
                  return acc;
                }, {})
              ).length === 0 ? (
                <p className="text-center text-slate-400 font-medium py-10 text-sm">
                  {searchQuery ? "No payments match your search." : "No payments recorded yet."}
                </p>
              ) : (
                Object.values(
                  filteredPayments.reduce((acc, pay) => {
                    const empId = pay.loan.booking.employee.id;
                    if (!acc[empId]) {
                      acc[empId] = {
                        employee: pay.loan.booking.employee,
                        payments: [],
                      };
                    }
                    acc[empId].payments.push(pay);
                    return acc;
                  }, {})
                ).map((group) => {
                  return (
                    <LedgerAccordionGroup key={group.employee.id} group={group} />
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponent for the accordion to manage its own expand/collapse state
function LedgerAccordionGroup({ group }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-primary">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
            {group.employee.fullName.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base">
              {group.employee.fullName}
            </h3>
            <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-wider">
              {group.employee.office.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            {group.payments.length} Receipt(s)
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {isExpanded ? "Hide Details ▲" : "View Receipts ▼"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100/50 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-3 text-xs">OR Number</th>
                  <th scope="col" className="px-4 py-3 text-xs">Booking Ref</th>
                  <th scope="col" className="px-4 py-3 text-xs">Date Paid</th>
                  <th scope="col" className="px-4 py-3 text-xs">Amount</th>
                  <th scope="col" className="px-4 py-3 text-xs">Method</th>
                  <th scope="col" className="px-4 py-3 text-xs">Cashier</th>
                  <th scope="col" className="px-4 py-3 text-xs text-right no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                {group.payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-black font-mono text-slate-800 text-xs">
                      {pay.receiptNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-semibold text-slate-600">
                        {pay.loan.booking.destination}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {pay.loan.booking.referenceNumber}
                      </span>
                      {pay.loan.booking.passengerName && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none">
                          🎫 {pay.loan.booking.passengerName} ({pay.loan.booking.passengerRelationship})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {pay.paymentDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-success">
                      ₱{pay.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {pay.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {pay.cashier.name}
                    </td>
                    <td className="px-4 py-3 text-right no-print">
                      <Link
                        href={`/payments/receipt/${pay.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary-hover hover:underline bg-primary-light px-2 py-1 rounded border border-primary/10 transition-colors"
                      >
                        Print OR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
