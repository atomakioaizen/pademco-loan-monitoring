"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ViewerDashboardClient({
  bookings,
  loans,
  payments,
  employee,
  session,
  maxActiveFlights,
  activeFlights,
  totalPrincipal,
  totalPayable,
  totalOutstanding,
  totalPaid,
  hasOverdue,
}) {
  const [expandedLoans, setExpandedLoans] = useState({});
  const [receiptFilter, setReceiptFilter] = useState("ALL"); // 'ALL' | 'ACTIVE_PARTIAL' | 'FINISHED'

  const toggleLoanExpand = (loanId) => {
    setExpandedLoans((prev) => (prev[loanId] ? {} : { [loanId]: true }));
  };

  const filteredPayments = payments.filter((pay) => {
    if (receiptFilter === "ACTIVE_PARTIAL") {
      return pay.loanStatus !== "FULLY_PAID";
    }
    if (receiptFilter === "FINISHED") {
      return pay.loanStatus === "FULLY_PAID";
    }
    return true;
  });

  // Returns a breakdown: principal row + one row per month of delay + summary
  const getOverdueBreakdown = (loan) => {
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    const amountPaid = loan.totalAmountPayable - loan.remainingBalance;

    let payStatus = "UNPAID";
    if (loan.remainingBalance <= 0) payStatus = "PAID";
    else if (amountPaid > 0) payStatus = "PARTIAL";

    // Trust the DB status as authoritative — avoid timestamp edge cases
    const isOverdue = (loan.status === "OVERDUE" || dueDate < today) && payStatus !== "PAID";
    let monthsDelayed = 0;

    if (isOverdue) {
      // Compare at DAY level (strip time) to count full months delayed
      const dueDateDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const todayDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const sy = dueDateDay.getFullYear(), sm = dueDateDay.getMonth(), sd = dueDateDay.getDate();
      const ey = todayDay.getFullYear(), em = todayDay.getMonth(), ed = todayDay.getDate();
      monthsDelayed = (ey - sy) * 12 + (em - sm);
      if (ed > sd) monthsDelayed += 1;
      monthsDelayed = Math.max(1, monthsDelayed);
    }

    const penaltyPerMonth = loan.remainingBalance * 0.01;
    const totalPenalty = penaltyPerMonth * monthsDelayed;
    const grandTotal = loan.remainingBalance + totalPenalty;

    return {
      payStatus,
      amountPaid,
      isOverdue,
      monthsDelayed,
      penaltyPerMonth,
      totalPenalty,
      grandTotal,
      dueDate,
      principal: loan.remainingBalance,
    };
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Find earliest due date among active outstanding loans
  const activeLoans = loans.filter((l) => l.remainingBalance > 0);
  const earliestDueDate = activeLoans.length > 0
    ? activeLoans.map((l) => new Date(l.dueDate)).sort((a, b) => a - b)[0]
    : null;

  // Calculate sum of active monthly installments
  const activeMonthlyInstallmentSum = activeLoans.reduce((sum, l) => sum + l.monthlyInstallment, 0);

  // Calculate sum of overdue amounts (including penalty)
  const overdueLoans = activeLoans.filter((l) => l.status === "OVERDUE" || new Date(l.dueDate) < new Date());
  const overdueTotalSum = overdueLoans.reduce((sum, l) => {
    const bd = getOverdueBreakdown(l);
    return sum + bd.grandTotal;
  }, 0);

  const activeBookings = bookings.filter((b) => b.loan && b.loan.status !== "FULLY_PAID");
  const paidBookings = bookings.filter((b) => b.loan && b.loan.status === "FULLY_PAID");

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto font-sans">

      {/* INACTIVE Employee Warning Banner */}
      {employee.status === "INACTIVE" && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-lg shadow-rose-100 animate-fadeIn">
          <span className="text-3xl leading-none mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-base font-black text-rose-800 uppercase tracking-wide">
              Your Profile Has Been Archived by PADEMCO Administration
            </p>
            <p className="text-sm text-rose-700 font-semibold mt-1 leading-relaxed">
              Your account is currently <strong>INACTIVE</strong>. You may no longer avail new airline ticket loans. Please visit the PADEMCO office to settle any outstanding accounts or inquire about your account status.
            </p>
          </div>
        </div>
      )}

      {/* 1. PREMIUM HERO SECTION (Home Credit Vibe) */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-10 text-white shadow-2xl transition-all duration-500 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 shadow-blue-500/30">
        {/* Glassmorphism background elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white/90">
            Hello, {employee.fullName.split(" ")[0]}!
          </h1>
          
          <div className="space-y-1">
            <p className="text-sm md:text-base font-semibold uppercase tracking-widest text-white/80">
              Total Outstanding Balance
            </p>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-md">
              {formatCurrency(totalOutstanding)}
            </h2>
          </div>

          {/* Next Payment Card Alert */}
          {totalOutstanding > 0 ? (
            <div className="mt-6 w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-inner">
              {hasOverdue ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-rose-200 uppercase tracking-wider">⚠️ Overdue Account</p>
                    <p className="text-lg md:text-xl font-bold text-white mt-1">Please settle immediately</p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-rose-200 font-bold uppercase tracking-wider">Overdue Total</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(overdueTotalSum)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-white/80 font-medium uppercase tracking-wider">Next Payment Due</p>
                    <p className="text-xl md:text-2xl font-black text-white mt-1">
                      {earliestDueDate ? formatDate(earliestDueDate) : "No Active Date"}
                    </p>
                  </div>
                  <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                    <p className="text-sm text-white/80 font-medium uppercase tracking-wider">Amount To Pay</p>
                    <p className="text-2xl md:text-3xl font-black text-white mt-1">{formatCurrency(activeMonthlyInstallmentSum)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="mt-6 w-full max-w-lg bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 rounded-2xl p-5 shadow-inner">
               <p className="text-xl font-bold text-emerald-100 flex items-center justify-center gap-2">
                 <span className="text-2xl">🎉</span> You have no outstanding balance!
               </p>
             </div>
          )}
        </div>
      </div>

      {/* 2. SUMMARY CARDS (Clean & Large) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
               <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Advanced</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800">{formatCurrency(totalPayable)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Amount Paid</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE PAYMENT PLANS */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
          My Active Payment Plans
        </h2>

        <div className="space-y-5">
          {activeBookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm">
              <p className="text-lg font-bold text-slate-500">No active ticket loans found.</p>
            </div>
          ) : (
            activeBookings.map((book) => {
              const hasLoan = !!book.loan;
              const isExpanded = !!expandedLoans[book.id];
              const totalPaid = hasLoan ? book.loan.totalAmountPayable - book.loan.remainingBalance : 0;
              const paidPercent = hasLoan ? Math.min(100, (totalPaid / book.loan.totalAmountPayable) * 100) : 0;

              return (
                <div key={book.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-lg">
                  {/* Card Header (Always Visible) */}
                  <div 
                    onClick={() => hasLoan && toggleLoanExpand(book.id)}
                    className="p-6 md:p-8 cursor-pointer group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      
                      {/* Destination and Status */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl md:text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                            {book.destination}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            book.loan?.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : hasLoan
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {book.loan ? book.loan.status : "NO LOAN"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          Travel Date: {formatDate(book.travelDate)}
                        </p>

                        {/* Booking Agent Badge */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold">
                            ✈️ Booked by:{" "}
                            <span className="font-black text-slate-700">
                              {book.bookedBy ? book.bookedBy.name : "Admin (Emergency)"}
                            </span>
                          </span>
                        </div>

                        {book.passengerName && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-black shadow-xs">
                              🎫 Ticket Passenger: {book.passengerName} ({book.passengerRelationship})
                            </span>
                          </div>
                        )}
                      </div>

                      {hasLoan && (
                        <div className="w-full md:w-72 flex items-center justify-end">
                          <span className="text-sm font-bold text-slate-400 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                            {isExpanded ? "Hide Plan ▲" : "View Plan ▼"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content (Installments & Details) */}
                  {hasLoan && isExpanded && (() => {
                    const bd = getOverdueBreakdown(book.loan);
                    const isPaid = bd.payStatus === "PAID";
                    return (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-8 md:px-8">

                        {/* Ref & Carrier */}
                        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-sm font-medium text-slate-500">
                          <div><span className="text-slate-400">Ref No:</span> <span className="font-mono font-bold text-slate-700">{book.referenceNumber}</span></div>
                          <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
                          <div><span className="text-slate-400">Carrier:</span> <span className="font-bold text-slate-700">{book.airline.name}</span></div>
                        </div>

                        <h4 className="text-base md:text-lg font-black text-slate-800 mb-4">Payment Breakdown</h4>

                        <div className="space-y-3">

                          {/* Original Loan Amount row removed as requested - total amount due is sufficient */}

                          {/* ── Penalty rows: one per month of delay ── */}
                          {bd.isOverdue && Array.from({ length: bd.monthsDelayed }, (_, i) => {
                            const monthLabel = new Date(bd.dueDate);
                            monthLabel.setMonth(monthLabel.getMonth() + i + 1);
                            return (
                              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-rose-200 bg-rose-50">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm">
                                    ⚠️
                                  </div>
                                  <div>
                                    <p className="font-black text-rose-800 text-sm">
                                      Month {i + 1} Delay — 1% Penalty
                                    </p>
                                    <p className="text-xs text-rose-500 font-semibold mt-0.5">
                                      Overdue since {formatDate(bd.dueDate)} · 1% of unpaid balance
                                    </p>
                                  </div>
                                </div>
                                <span className="text-lg font-black font-mono text-rose-700">
                                  +{formatCurrency(bd.penaltyPerMonth)}
                                </span>
                              </div>
                            );
                          })}

                          {/* ── Total row ── */}
                          <div className={`flex items-center justify-between p-5 rounded-2xl border-2 ${
                            isPaid
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-blue-50 border-blue-300 shadow-md shadow-blue-100"
                          }`}>
                            <div>
                              <p className="font-black text-slate-900 text-base">Total Amount Due</p>
                              {bd.isOverdue && !isPaid && (
                                <p className="text-xs font-bold text-rose-600 mt-0.5">
                                  Loan + {bd.monthsDelayed} month{bd.monthsDelayed > 1 ? "s" : ""} penalty
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {bd.isOverdue && !isPaid && (
                                <p className="text-xs font-semibold text-rose-500 line-through opacity-70">
                                  {formatCurrency(book.loan.remainingBalance)}
                                </p>
                              )}
                              <span className={`text-2xl font-black font-mono ${
                                isPaid ? "text-emerald-600" : "text-blue-700"
                              }`}>
                                {isPaid ? formatCurrency(book.loan.totalAmountPayable) : formatCurrency(bd.grandTotal)}
                              </span>
                              {bd.isOverdue && !isPaid && (
                                <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                                  incl. {formatCurrency(bd.totalPenalty)} total penalty
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Already Paid Badge */}
                          {bd.amountPaid > 0 && !isPaid && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                              <span className="font-semibold text-emerald-800">✅ Already Paid</span>
                              <span className="font-black font-mono text-emerald-700">{formatCurrency(bd.amountPaid)}</span>
                            </div>
                          )}

                          {/* Pay Now button removed as requested - payments are walk-in only */}

                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. FINISHED LOANS & RECEIPTS LEDGER */}
      <div className="grid grid-cols-1 gap-8 pt-6">
        
        {paidBookings.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
              Finished Loans (Fully Paid)
            </h2>
            <div className="space-y-4">
              {paidBookings.map((book) => {
                const hasLoan = !!book.loan;
                const isExpanded = !!expandedLoans[book.id];
                const totalPaid = hasLoan ? book.loan.totalAmountPayable - book.loan.remainingBalance : 0;

                return (
                  <div key={book.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 hover:border-emerald-300">
                    <div 
                      onClick={() => hasLoan && toggleLoanExpand(book.id)}
                      className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg md:text-xl font-bold text-slate-700">
                            {book.destination}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                            FULLY PAID
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Travel Date: {formatDate(book.travelDate)}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-slate-400 font-medium">Total Paid</p>
                          <p className="text-xl font-black text-emerald-600">{formatCurrency(totalPaid)}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-400">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-6 md:p-8">
                        <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl">✓</div>
                          <div>
                            <p className="font-black text-emerald-800">Loan Fully Settled</p>
                            <p className="text-sm text-emerald-600 font-semibold mt-0.5">
                              Ref: {book.referenceNumber} · {book.airline?.name}
                            </p>
                          </div>
                          <span className="ml-auto text-xl font-black font-mono text-emerald-700">{formatCurrency(totalPaid)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Receipt Ledger Cards List (gaya sa My Active Payment Plans style, uniform at simplified) */}
        <div className="space-y-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
              Payment History & Receipts
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl w-max">
              {['ALL', 'ACTIVE_PARTIAL', 'FINISHED'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setReceiptFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    receiptFilter === filter
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'ACTIVE_PARTIAL' ? 'Active' : 'Finished'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredPayments.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
                <p className="text-lg font-bold text-slate-500">No payment records found.</p>
              </div>
            ) : (
              filteredPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-lg p-6 md:p-8 animate-fadeIn"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Destination and Receipt Details */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-black text-slate-900 text-xs md:text-sm bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
                          Receipt #{pay.receiptNumber}
                        </span>
                        <h3 className="text-lg md:text-xl font-black text-slate-800">
                          {pay.loanDestination}
                        </h3>
                      </div>
                      <p className="text-sm font-semibold text-slate-400">
                        Date Paid: <span className="text-slate-600 font-bold">{formatDate(pay.paymentDate)}</span>
                      </p>
                    </div>

                    {/* Right: Amount Paid and Action */}
                    <div className="flex flex-row items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                      <div className="text-left md:text-right md:min-w-[150px]">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Amount Paid</p>
                        <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">{formatCurrency(pay.amountPaid)}</p>
                      </div>
                      
                      <Link
                        href={`/payments/receipt/${pay.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:text-white border border-blue-200 hover:bg-blue-600 px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer"
                      >
                        View OR &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Padding */}
      <div className="h-10"></div>
    </div>
  );
}
