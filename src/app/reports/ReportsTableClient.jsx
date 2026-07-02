"use client";

import React, { useState } from "react";

export default function ReportsTableClient({
  reportData = [],
  reportType,
  ledgerEmployee = null,
  ledgerSummary = {}
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Blazing-fast page rendering limit!

  const totalRecords = reportData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const paginatedData = reportData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper to render table contents (can be called for paginated screen data or full print data)
  const renderTableRows = (dataToRender) => {
    if (dataToRender.length === 0) {
      const colSpan = reportType === "aging" ? 8 : (reportType === "inactive" || reportType === "ledger" ? 6 : 7);
      return (
        <tr>
          <td colSpan={colSpan} className="px-6 py-10 text-center text-slate-400">
            No records found matching filters.
          </td>
        </tr>
      );
    }

    if (reportType === "outstanding") {
      return dataToRender.map((l) => (
        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4">
            <span className="font-bold text-slate-800 font-mono block text-xs">{l.booking.referenceNumber}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{l.booking.airline.name}</span>
          </td>
          <td className="px-6 py-4 font-bold text-slate-700">
            {l.booking.employee.fullName}
            {l.booking.passengerName && (
              <span className="flex items-center gap-1 mt-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded w-max">
                🎫 {l.booking.passengerName} ({l.booking.passengerRelationship})
              </span>
            )}
          </td>
          <td className="px-6 py-4 text-slate-600 font-medium">{l.booking.employee.office.name}</td>
          <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(l.dueDate).toLocaleDateString()}</td>
          <td className="px-6 py-4 font-mono text-slate-600">₱{l.principalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-slate-600">₱{l.interestAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono font-black text-slate-800">₱{l.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>
      ));
    }

    if (reportType === "fullypaid") {
      return dataToRender.map((l) => (
        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4 font-bold font-mono text-slate-700 text-xs">{l.booking.referenceNumber}</td>
          <td className="px-6 py-4 font-bold text-slate-700">
            {l.booking.employee.fullName}
            {l.booking.passengerName && (
              <span className="flex items-center gap-1 mt-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded w-max">
                🎫 {l.booking.passengerName} ({l.booking.passengerRelationship})
              </span>
            )}
          </td>
          <td className="px-6 py-4 text-slate-600 font-medium">{l.booking.employee.office.name}</td>
          <td className="px-6 py-4 font-mono">₱{l.principalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono">₱{l.interestAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono font-bold text-success">₱{l.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(l.updatedAt).toLocaleDateString()}</td>
        </tr>
      ));
    }

    if (reportType === "overdue") {
      return dataToRender.map((l) => {
        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(l.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
        return (
          <tr key={l.id} className="hover:bg-rose-50/50 transition-colors">
            <td className="px-6 py-4 font-bold font-mono text-slate-700 text-xs">{l.booking.referenceNumber}</td>
            <td className="px-6 py-4 font-bold text-slate-700">
              {l.booking.employee.fullName}
              {l.booking.passengerName && (
                <span className="flex items-center gap-1 mt-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded w-max">
                  🎫 {l.booking.passengerName} ({l.booking.passengerRelationship})
                </span>
              )}
            </td>
            <td className="px-6 py-4 text-slate-600 font-medium">{l.booking.employee.office.name}</td>
            <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(l.dueDate).toLocaleDateString()}</td>
            <td className="px-6 py-4 font-bold text-danger text-xs font-mono">{daysOverdue} days</td>
            <td className="px-6 py-4 font-mono">₱{l.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td className="px-6 py-4 font-mono font-bold text-danger">₱{l.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          </tr>
        );
      });
    }

    if (reportType === "collections") {
      return dataToRender.map((p) => (
        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4 font-bold font-mono text-slate-800 text-xs">{p.receiptNumber}</td>
          <td className="px-6 py-4 font-bold text-slate-700">
            {p.loan.booking.employee.fullName}
            {p.loan.booking.passengerName && (
              <span className="flex items-center gap-1 mt-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded w-max">
                🎫 {p.loan.booking.passengerName} ({p.loan.booking.passengerRelationship})
              </span>
            )}
          </td>
          <td className="px-6 py-4 text-slate-600 font-medium">{p.loan.booking.employee.office.name}</td>
          <td className="px-6 py-4 font-mono text-xs text-slate-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
          <td className="px-6 py-4 uppercase font-mono text-xs font-bold text-slate-600">{p.paymentMethod}</td>
          <td className="px-6 py-4 font-mono font-bold text-success">₱{p.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.cashier.name}</td>
        </tr>
      ));
    }

    if (reportType === "profit") {
      return dataToRender.map((l) => (
        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4 font-bold font-mono text-slate-700 text-xs">{l.booking.referenceNumber}</td>
          <td className="px-6 py-4 font-bold text-slate-700">{l.booking.employee.fullName}</td>
          <td className="px-6 py-4 text-slate-600 font-medium">{l.booking.employee.office.name}</td>
          <td className="px-6 py-4 font-mono">₱{l.principalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-xs uppercase font-bold text-slate-500">
            {l.interestType === "PERCENT" ? `${l.interestRate}%` : `₱${l.interestRate}`}
          </td>
          <td className="px-6 py-4 font-mono font-bold text-success">₱{l.interestAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono">₱{l.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>
      ));
    }

    if (reportType === "aging") {
      return dataToRender.map((a, i) => (
        <tr key={i} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4 font-bold text-slate-800">{a.name}</td>
          <td className="px-6 py-4 font-medium text-slate-600">{a.office}</td>
          <td className="px-6 py-4 font-mono font-bold text-slate-900">₱{a.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-slate-500">₱{a.current.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-amber-600 font-medium">₱{a.days1to30.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-amber-700 font-medium">₱{a.days31to60.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-rose-600 font-medium">₱{a.days61to90.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td className="px-6 py-4 font-mono text-danger font-bold">₱{a.daysOver90.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>
      ));
    }

    if (reportType === "inactive") {
      return dataToRender.map((e, idx) => (
        <tr key={idx} className="hover:bg-slate-50 transition-colors">
          <td className="px-6 py-4 font-mono font-bold text-slate-700 text-xs">{e.employeeId}</td>
          <td className="px-6 py-4 font-bold text-slate-800">{e.fullName}</td>
          <td className="px-6 py-4 text-slate-600 font-medium">{e.office.name}</td>
          <td className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{e.position}</td>
          <td className="px-6 py-4 font-mono font-bold text-slate-600">{e.activeFlights} / 4 flights</td>
          <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shadow-sm ${
              e.status === "INACTIVE"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {e.reason}
            </span>
          </td>
        </tr>
      ));
    }

    return null;
  };

  const renderTableHeader = () => {
    if (reportType === "outstanding") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">PNR / Carrier</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Due Date</th>
          <th scope="col" className="px-6 py-3.5">Principal</th>
          <th scope="col" className="px-6 py-3.5">Interest</th>
          <th scope="col" className="px-6 py-3.5">Balance</th>
        </tr>
      );
    }
    if (reportType === "fullypaid") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">PNR Reference</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Advanced Principal</th>
          <th scope="col" className="px-6 py-3.5">Profit Earned</th>
          <th scope="col" className="px-6 py-3.5">Total Paid</th>
          <th scope="col" className="px-6 py-3.5">Settled Date</th>
        </tr>
      );
    }
    if (reportType === "overdue") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">PNR Reference</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Original Due Date</th>
          <th scope="col" className="px-6 py-3.5">Days Overdue</th>
          <th scope="col" className="px-6 py-3.5">Original Cost</th>
          <th scope="col" className="px-6 py-3.5">Outstanding Balance</th>
        </tr>
      );
    }
    if (reportType === "collections") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">OR Number</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Payment Date</th>
          <th scope="col" className="px-6 py-3.5">Method</th>
          <th scope="col" className="px-6 py-3.5">Amount Paid</th>
          <th scope="col" className="px-6 py-3.5">Cashier</th>
        </tr>
      );
    }
    if (reportType === "profit") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">PNR Reference</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Principal Cost</th>
          <th scope="col" className="px-6 py-3.5">Interest Rate</th>
          <th scope="col" className="px-6 py-3.5">Coop Profit Earned</th>
          <th scope="col" className="px-6 py-3.5">Total Payable</th>
        </tr>
      );
    }
    if (reportType === "aging") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office/Division</th>
          <th scope="col" className="px-6 py-3.5">Outstanding Total</th>
          <th scope="col" className="px-6 py-3.5">Current (Not Due)</th>
          <th scope="col" className="px-6 py-3.5">1-30 Days</th>
          <th scope="col" className="px-6 py-3.5">31-60 Days</th>
          <th scope="col" className="px-6 py-3.5">61-90 Days</th>
          <th scope="col" className="px-6 py-3.5">Over 90 Days</th>
        </tr>
      );
    }
    if (reportType === "inactive") {
      return (
        <tr className="bg-slate-50 text-slate-600 font-bold">
          <th scope="col" className="px-6 py-3.5">Employee ID</th>
          <th scope="col" className="px-6 py-3.5">Employee Name</th>
          <th scope="col" className="px-6 py-3.5">Office</th>
          <th scope="col" className="px-6 py-3.5">Position</th>
          <th scope="col" className="px-6 py-3.5">Active Loans</th>
          <th scope="col" className="px-6 py-3.5">Deactivation Reason</th>
        </tr>
      );
    }
    return null;
  };

  // Special renderer for LEDGER report to avoid duplicating too much layout
  if (reportType === "ledger") {
    return (
      <div className="p-6 space-y-6">
        {!ledgerEmployee ? (
          <div className="text-center py-10 text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
            Select an employee from the dropdown filters above to load their complete advanced loan ledger statement.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Borrower Profile:</span>
                <h3 className="text-lg font-black text-primary mt-1">{ledgerEmployee.fullName}</h3>
                <span className="text-xs text-slate-500 font-semibold">{ledgerEmployee.office.name}</span>
              </div>
              <div className="text-slate-600 text-xs space-y-1 md:border-l md:border-slate-200 md:pl-6">
                <p><span className="font-bold">Employee ID:</span> <span className="font-mono">{ledgerEmployee.employeeId}</span></p>
                <p><span className="font-bold">Position:</span> {ledgerEmployee.position}</p>
                <p><span className="font-bold">Contact No:</span> <span className="font-mono">{ledgerEmployee.contactNumber}</span></p>
              </div>
              <div className="text-slate-600 text-xs space-y-1 md:border-l md:border-slate-200 md:pl-6">
                <p><span className="font-bold">Total Advanced:</span> <span className="font-mono font-bold">₱{ledgerSummary.totalAdvanced?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
                <p><span className="font-bold">Total Paid:</span> <span className="font-mono font-bold text-success">₱{ledgerSummary.totalPaid?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
                <p><span className="font-bold">Outstanding Balance:</span> <span className="font-mono font-black text-danger">₱{ledgerSummary.balance?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Transaction Type</th>
                    <th scope="col" className="px-4 py-3">Details / Flight Info</th>
                    <th scope="col" className="px-4 py-3">OR Number</th>
                    <th scope="col" className="px-4 py-3 text-right">Debit (Loan)</th>
                    <th scope="col" className="px-4 py-3 text-right">Credit (Paid)</th>
                    <th scope="col" className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No transactions recorded for this employee yet.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                            row.type === "DEBIT"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-success-light text-success border-success-light"
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs leading-relaxed max-w-xs truncate" title={row.details}>
                          {row.details}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{row.orNumber || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {row.type === "DEBIT" ? `₱${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-success font-medium">
                          {row.type === "CREDIT" ? `₱${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          ₱{row.runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* 1. SCREEN-ONLY VIEW (Paginated and gorgeous!) */}
      <div className="print:hidden">
        {/* Dynamic page entries settings */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-700 cursor-pointer shadow-sm focus:outline-none"
            >
              <option value={10}>10 entries</option>
              <option value={25}>25 entries</option>
              <option value={50}>50 entries</option>
              <option value={100}>100 entries</option>
            </select>
            <span>of <span className="text-slate-800 font-extrabold">{totalRecords}</span> matching records</span>
          </div>
          {totalPages > 1 && (
            <div className="text-slate-400">
              Page <span className="text-slate-850 font-black">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold">
              {renderTableHeader()}
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {renderTableRows(paginatedData)}
            </tbody>
          </table>
        </div>

        {/* Stateful Client-Side Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-500">
            <div>
              Showing <span className="text-slate-800 font-black">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="text-slate-800 font-black">{Math.min(currentPage * pageSize, totalRecords)}</span> of{" "}
              <span className="text-slate-800 font-black">{totalRecords}</span> entries
            </div>

            <div className="flex items-center gap-1.5 self-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold shadow-sm"
              >
                &larr; Prev
              </button>

              <div className="hidden md:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, arr) => {
                    const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer shadow-sm text-xs ${
                            currentPage === page
                              ? "bg-primary text-white border border-primary"
                              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold shadow-sm"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT-ONLY FULL VIEW (Renders 100% of all data on paperheets!) */}
      <div className="hidden print:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300">
            {renderTableHeader()}
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {renderTableRows(reportData)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
