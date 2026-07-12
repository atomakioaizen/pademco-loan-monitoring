"use client";

import React, { useState, useTransition } from "react";
import { approveUserAction, declineUserAction } from "./actions/adminApprovals";

export default function AdminDashboardClient({ loans, payments, session, stats, pendingUsers = [], oldLoans = [] }) {
  const [activeModal, setActiveModal] = useState(null); // null | 'outstanding' | 'collections' | 'profit' | 'overdue' | 'pending_registrations' | 'old_loans'
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // null | { id, type: 'approve' | 'decline' }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(val);
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "N/A";
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysOverdue = (dueDate) => {
    const diffTime = Math.max(0, Date.now() - new Date(dueDate).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filters for modals
  const filteredOutstanding = loans
    .filter((l) => l.remainingBalance > 0)
    .filter((l) => {
      const empName = l.booking.employee.fullName.toLowerCase();
      const officeName = l.booking.employee.office.name.toLowerCase();
      const dest = l.booking.destination.toLowerCase();
      const query = searchQuery.toLowerCase();
      return empName.includes(query) || officeName.includes(query) || dest.includes(query);
    });

  const filteredCollections = payments.filter((p) => {
    const empName = p.loan.booking.employee.fullName.toLowerCase();
    const orNum = p.receiptNumber.toLowerCase();
    const cashierName = p.cashier.name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return empName.includes(query) || orNum.includes(query) || cashierName.includes(query);
  });

  const filteredProfit = loans.filter((l) => {
    const empName = l.booking.employee.fullName.toLowerCase();
    const dest = l.booking.destination.toLowerCase();
    const officeName = l.booking.employee.office.name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return empName.includes(query) || dest.includes(query) || officeName.includes(query);
  });

  const filteredOverdue = loans
    .filter((l) => l.status === "OVERDUE")
    .filter((l) => {
      const empName = l.booking.employee.fullName.toLowerCase();
      const officeName = l.booking.employee.office.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      return empName.includes(query) || officeName.includes(query);
    });
  const filteredPending = pendingUsers.filter((u) => {
    const name = u.name.toLowerCase();
    const username = u.username.toLowerCase();
    const officeName = u.employee?.office?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || username.includes(query) || officeName.includes(query);
  });

  // Derived data for new secondary stat card modals
  const filteredActiveLoans = loans
    .filter((l) => l.status === "ACTIVE")
    .filter((l) => {
      const empName = l.booking.employee.fullName.toLowerCase();
      const officeName = l.booking.employee.office.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      return empName.includes(query) || officeName.includes(query);
    });

  const filteredFullyPaid = loans
    .filter((l) => l.status === "FULLY_PAID")
    .filter((l) => {
      const empName = l.booking.employee.fullName.toLowerCase();
      const officeName = l.booking.employee.office.name.toLowerCase();
      const query = searchQuery.toLowerCase();
      return empName.includes(query) || officeName.includes(query);
    });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const filteredDueThisMonth = loans
    .filter((l) => {
      const d = new Date(l.dueDate);
      return l.remainingBalance > 0 && d >= startOfMonth && d <= endOfMonth;
    })
    .filter((l) => {
      const empName = l.booking.employee.fullName.toLowerCase();
      const query = searchQuery.toLowerCase();
      return empName.includes(query);
    });

  // Unique employees with loans
  const uniqueBorrowers = Object.values(
    loans.reduce((acc, l) => {
      const emp = l.booking.employee;
      if (!acc[emp.id]) acc[emp.id] = { employee: emp, loanCount: 0, totalBalance: 0 };
      acc[emp.id].loanCount++;
      acc[emp.id].totalBalance += l.remainingBalance;
      return acc;
    }, {})
  ).filter((b) => {
    const query = searchQuery.toLowerCase();
    return b.employee.fullName.toLowerCase().includes(query) || b.employee.office.name.toLowerCase().includes(query);
  });

  const filteredOldLoans = oldLoans.filter((ol) => {
    const empName = ol.employee.fullName.toLowerCase();
    const empId = ol.employee.employeeId.toLowerCase();
    const officeName = ol.employee.office?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return empName.includes(query) || empId.includes(query) || officeName.includes(query);
  });

  const openModal = (type) => {
    setActiveModal(type);
    setSearchQuery("");
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card - Premium Redesign */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden border border-blue-900/30">
        {/* Decorative glows */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mb-16 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-blue-500/20 border border-blue-400/30 px-3 py-1.5 rounded-full font-black uppercase tracking-wider text-blue-300">
                  {session.role} Dashboard
                </span>
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-full font-black text-emerald-300 uppercase tracking-wider">
                  ● Live
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                Welcome, <span className="text-blue-300">{session.name || "Administrator"}!</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-medium max-w-xl">
                PADEMCO Airline Loan Monitoring Portal — Click any stat card to view the full transaction breakdown.
              </p>
            </div>

            {/* Quick stats pills */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active</p>
                <p className="text-xl font-black text-blue-300 mt-0.5">{stats.activeLoansCount}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Overdue</p>
                <p className={`text-xl font-black mt-0.5 ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{stats.overdueCount}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Paid</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.fullyPaidCount}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Borrowers</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">{stats.employeesWithLoansCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clickable Stat Cards Grid */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
          Primary Report Summary (Click a card to view breakdown)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* CARD 1: Outstanding Balance */}
          <div
            onClick={() => openModal("outstanding")}
            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
              <div className="bg-teal-50 text-teal-700 p-2 rounded-2xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-teal-750 transition-colors block font-mono">
                {formatCurrency(stats.totalOutstandingBalance)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Total balance of all active ticket loans
              </span>
            </div>
            <div className="mt-4 text-[10px] font-black text-teal-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View List &rarr;
            </div>
          </div>

          {/* CARD 2: Total Collections */}
          <div
            onClick={() => openModal("collections")}
            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Collections</span>
              <div className="bg-emerald-50 text-emerald-750 p-2 rounded-2xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-emerald-750 transition-colors block font-mono">
                {formatCurrency(stats.totalCollections)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Total collection amount from installment payments
              </span>
            </div>
            <div className="mt-4 text-[10px] font-black text-emerald-750 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View List &rarr;
            </div>
          </div>

          {/* CARD 3: Profit Earned */}
          <div
            onClick={() => openModal("profit")}
            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit Earned</span>
              <div className="bg-blue-50 text-blue-700 p-2 rounded-2xl">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-blue-750 transition-colors block font-mono">
                {formatCurrency(stats.totalProfit)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Total profit generated from cooperative loan interest
              </span>
            </div>
            <div className="mt-4 text-[10px] font-black text-blue-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View List &rarr;
            </div>
          </div>

          {/* CARD 4: Overdue Accounts */}
          <div
            onClick={() => openModal("overdue")}
            className="group bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-500 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Accounts</span>
              <div className={`p-2 rounded-2xl ${stats.overdueCount > 0 ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-rose-50 text-rose-700"}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-rose-750 transition-colors block font-mono">
                {stats.overdueCount} Accounts
              </span>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                Accounts that have exceeded their payment due date
              </span>
            </div>
            <div className="mt-4 text-[10px] font-black text-rose-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View List &rarr;
            </div>
          </div>

          {/* CARD 5: Pending Registrations (Admin Only) */}
          {session.role === "ADMIN" && (
            <div
              onClick={() => openModal("pending_registrations")}
              className={`group bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md hover:border-amber-500 transition-all cursor-pointer relative overflow-hidden ${pendingUsers.length > 0 ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Registrations</span>
                <div className={`p-2 rounded-2xl ${pendingUsers.length > 0 ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-700"}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-amber-750 transition-colors block font-mono">
                  {pendingUsers.length} Requests
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">
                  New users waiting for credentials validation
                </span>
              </div>
              <div className="mt-4 text-[10px] font-black text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View & Approve &rarr;
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Clickable Stats Section - "Other Information" */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Other Information
          <span className="text-slate-500 font-normal normal-case tracking-normal">(click to view)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Active Loans */}
          <div
            onClick={() => openModal("active_loans")}
            className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">View →</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Loans</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{stats.activeLoansCount}</span>
          </div>

          {/* Fully Paid */}
          <div
            onClick={() => openModal("fully_paid")}
            className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">View →</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fully Paid</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{stats.fullyPaidCount}</span>
          </div>

          {/* Due This Month */}
          <div
            onClick={() => openModal("due_this_month")}
            className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">View →</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due This Month</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{stats.dueThisMonthCount}</span>
          </div>

          {/* Total Borrowers */}
          <div
            onClick={() => openModal("total_borrowers")}
            className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-400 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[9px] font-black text-violet-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">View →</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Borrowers</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{stats.employeesWithLoansCount}</span>
          </div>

          {/* Pre-existing Old Loans Card */}
          <div
            onClick={() => openModal("old_loans")}
            className="group bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-450 hover:shadow-rose-50/55 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">View →</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pre-existing Old Loans</span>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">{oldLoans.length}</span>
          </div>
        </div>
      </div>

      {/* Modals for Breakdowns */}
      {activeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">             {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {activeModal === "outstanding" && "Outstanding Balance Breakdown"}
                  {activeModal === "collections" && "Total Collections Ledger"}
                  {activeModal === "profit" && "Profit & Interest Earnings"}
                  {activeModal === "overdue" && "Overdue Loan Accounts"}
                  {activeModal === "pending_registrations" && "Pending Registration Requests"}
                  {activeModal === "active_loans" && "Active Loan List"}
                  {activeModal === "fully_paid" && "Fully Paid Loan List"}
                  {activeModal === "due_this_month" && "Loans Due This Month"}
                  {activeModal === "total_borrowers" && "Cooperative Borrowers Directory"}
                  {activeModal === "old_loans" && "Borrowers with Pre-existing Old Loans"}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {activeModal === "outstanding" && "List of all active loans with remaining balance."}
                  {activeModal === "collections" && "Audit log of all payments collected."}
                  {activeModal === "profit" && "Detailed report of cooperative profit earned via interest."}
                  {activeModal === "overdue" && "List of accounts that have missed their payment schedules."}
                  {activeModal === "pending_registrations" && "Review and approve/decline self-registered borrower profiles."}
                  {activeModal === "active_loans" && "All loan agreements currently running with a balance."}
                  {activeModal === "fully_paid" && "Archived loan agreements that are 100% paid."}
                  {activeModal === "due_this_month" && "Active loans scheduled to be collected during this current calendar month."}
                  {activeModal === "total_borrowers" && "Full registry of DENR employees who have created system profiles."}
                  {activeModal === "old_loans" && "List of registered borrowers with outstanding unpaid old loans."}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Subheader with Search */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder={
                    activeModal === "collections"
                      ? "Search by OR #, Employee, or Cashier..."
                      : activeModal === "profit"
                      ? "Search by Employee, Route, or Office..."
                      : activeModal === "pending_registrations"
                      ? "Search by Name, Username, or Office..."
                      : activeModal === "total_borrowers"
                      ? "Search by Name, Office, or Position..."
                      : activeModal === "old_loans"
                      ? "Search by Name, ID, or Office..."
                      : "Search by Employee or Office..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-250 rounded-2xl focus:outline-none focus:border-teal-500 bg-white font-semibold placeholder:font-medium placeholder:text-slate-400"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-all"
                >
                  Clear Filter
                </button>
              )}
            </div>

            {/* Modal Scrollable Content Table */}
            <div className="flex-1 overflow-auto">
              {activeModal === "outstanding" && (
                <div className="p-4 space-y-4">
                  {filteredOutstanding.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No records found matching the query.
                    </p>
                  ) : (
                    Object.values(
                      filteredOutstanding.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <OutstandingAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "collections" && (
                <div className="p-4 space-y-4">
                  {filteredCollections.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No collections recorded matching the query.
                    </p>
                  ) : (
                    Object.values(
                      filteredCollections.reduce((acc, p) => {
                        const empId = p.loan.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: p.loan.booking.employee,
                            payments: [],
                          };
                        }
                        acc[empId].payments.push(p);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <CollectionsAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "profit" && (
                <div className="p-4 space-y-4">
                  {filteredProfit.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No records found matching the query.
                    </p>
                  ) : (
                    Object.values(
                      filteredProfit.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <ProfitAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "overdue" && (
                <div className="p-4 space-y-4">
                  {filteredOverdue.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No overdue loan accounts found.
                    </p>
                  ) : (
                    Object.values(
                      filteredOverdue.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <OverdueAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "active_loans" && (
                <div className="p-4 space-y-4">
                  {filteredActiveLoans.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No active loans found.
                    </p>
                  ) : (
                    Object.values(
                      filteredActiveLoans.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <OutstandingAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "fully_paid" && (
                <div className="p-4 space-y-4">
                  {filteredFullyPaid.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No fully paid loans found.
                    </p>
                  ) : (
                    Object.values(
                      filteredFullyPaid.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <OutstandingAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "due_this_month" && (
                <div className="p-4 space-y-4">
                  {filteredDueThisMonth.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No loans due this month.
                    </p>
                  ) : (
                    Object.values(
                      filteredDueThisMonth.reduce((acc, l) => {
                        const empId = l.booking.employee.id;
                        if (!acc[empId]) {
                          acc[empId] = {
                            employee: l.booking.employee,
                            loans: [],
                          };
                        }
                        acc[empId].loans.push(l);
                        return acc;
                      }, {})
                    ).map((group) => (
                      <OutstandingAccordionGroup key={group.employee.id} group={group} />
                    ))
                  )}
                </div>
              )}

              {activeModal === "total_borrowers" && (
                <div className="p-4 space-y-4">
                  {uniqueBorrowers.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No borrowers directory profiles found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold">
                          <tr>
                            <th scope="col" className="px-6 py-3">Employee Name</th>
                            <th scope="col" className="px-6 py-3">Office Station</th>
                            <th scope="col" className="px-6 py-3">Position</th>
                            <th scope="col" className="px-6 py-3 text-center">Total Loans Logged</th>
                            <th scope="col" className="px-6 py-3 text-right">Current Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                          {uniqueBorrowers.map((b) => (
                            <tr key={b.employee.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-extrabold text-slate-800 text-sm block">{b.employee.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {b.employee.employeeId}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">{b.employee.office.name}</td>
                              <td className="px-6 py-4 text-slate-500">{b.employee.position}</td>
                              <td className="px-6 py-4 text-center font-bold">{b.loanCount} Loan(s)</td>
                              <td className="px-6 py-4 text-right font-black font-mono text-slate-900">
                                ₱{b.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeModal === "old_loans" && (
                <div className="p-4 space-y-4">
                  {filteredOldLoans.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-12">
                      No borrowers with old loans found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold">
                          <tr>
                            <th scope="col" className="px-6 py-3">Borrower / Employee</th>
                            <th scope="col" className="px-6 py-3">Office Station</th>
                            <th scope="col" className="px-6 py-3 text-center">Unrecorded Old Loans Count</th>
                            <th scope="col" className="px-6 py-3">Old Loans Exist Since</th>
                            <th scope="col" className="px-6 py-3">Encoded By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-700 bg-white font-medium">
                          {filteredOldLoans.map((ol) => (
                            <tr key={ol.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-extrabold text-slate-800 text-sm block">{ol.employee.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {ol.employee.employeeId}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                                {ol.employee.office?.name || "DENR"}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 font-black text-xs animate-pulse">
                                  {ol.totalOldLoans} Unpaid Loan(s)
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium">
                                {new Date(ol.dateSince).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                <span className="font-bold text-slate-700">{ol.encodedBy?.name || "Bookkeeper"}</span>
                                <span className="block text-[9px] text-slate-400">On {new Date(ol.createdAt).toLocaleDateString()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeModal === "pending_registrations" && (
                <div className="p-6 space-y-6">
                  {actionError && (
                    <div className="rounded-xl bg-danger-light p-4 border-l-4 border-danger">
                      <p className="text-sm font-semibold text-danger-dark">{actionError}</p>
                    </div>
                  )}
                  {filteredPending.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">🎉</div>
                      <p className="text-slate-400 font-extrabold text-sm">
                        No pending registration requests!
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        All self-registered accounts are currently verified.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredPending.map((u) => {
                        const handleApprove = () => {
                          setConfirmingAction({ id: u.id, type: "approve" });
                        };
                        const handleDecline = () => {
                          setConfirmingAction({ id: u.id, type: "decline" });
                        };
                        const executeApprove = () => {
                          setConfirmingAction(null);
                          setActionError(null);
                          startTransition(async () => {
                            const result = await approveUserAction(u.id);
                            if (result && result.error) {
                              setActionError(result.error);
                            }
                          });
                        };
                        const executeDecline = () => {
                          setConfirmingAction(null);
                          setActionError(null);
                          startTransition(async () => {
                            const result = await declineUserAction(u.id);
                            if (result && result.error) {
                              setActionError(result.error);
                            }
                          });
                        };
                        const cancelConfirm = () => {
                          setConfirmingAction(null);
                        };

                        return (
                          <div key={u.id} className="border border-slate-200 rounded-3xl p-5 bg-white shadow-sm flex flex-col justify-between hover:border-amber-400 transition-all">
                            <div className="space-y-4">
                              {/* Header Profile */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-800 text-sm">{u.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold">Username: <strong className="font-mono text-slate-600">{u.username}</strong></p>
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
                                <div>
                                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Employee ID</span>
                                  <strong className="text-slate-700 font-mono">{u.employee?.employeeId || "N/A"}</strong>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Office</span>
                                  <strong className="text-slate-700">{u.employee?.office?.name || "N/A"}</strong>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Position</span>
                                  <strong className="text-slate-700">{u.employee?.position || "N/A"}</strong>
                                </div>
                                <div>
                                  <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Contact</span>
                                  <strong className="text-slate-700">{u.employee?.contactNumber || "N/A"}</strong>
                                </div>
                                {u.employee?.email && (
                                  <div className="col-span-2">
                                    <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Email</span>
                                    <strong className="text-slate-700">{u.employee.email}</strong>
                                  </div>
                                )}
                                {(u.employee?.govIdType || u.employee?.govIdNumber) && (
                                  <div className="col-span-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Verification ID ({u.employee.govIdType || "Gov ID"})</span>
                                      <strong className="text-[10px] font-mono text-slate-700">{u.employee.govIdNumber || "N/A"}</strong>
                                    </div>
                                    <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">UNVERIFIED</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Buttons */}
                            <div className="flex flex-col gap-2 border-t border-slate-100 mt-4 pt-4">
                              {confirmingAction?.id === u.id ? (
                                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                  <p className="text-[10px] font-black text-center uppercase tracking-wider text-slate-600">
                                    Confirm {confirmingAction.type === "approve" ? "Approval" : "Declination"}?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={confirmingAction.type === "approve" ? executeApprove : executeDecline}
                                      disabled={isPending}
                                      className="flex-1 bg-primary text-white rounded-xl py-1.5 px-3 text-[10px] font-black cursor-pointer shadow-sm hover:shadow transition-all uppercase text-center"
                                    >
                                      ✓ Yes, Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelConfirm}
                                      disabled={isPending}
                                      className="flex-1 bg-white border border-slate-200 text-slate-500 rounded-xl py-1.5 px-3 text-[10px] font-bold cursor-pointer hover:bg-slate-100 transition-all uppercase text-center"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleApprove}
                                    disabled={isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-2 px-3 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span>✓ Approve</span>
                                  </button>
                                  <button
                                    onClick={handleDecline}
                                    disabled={isPending}
                                    className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl py-2 px-3 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <span>✕ Decline</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>
                {activeModal === "outstanding" && `Total items: ${filteredOutstanding.length}`}
                {activeModal === "collections" && `Total items: ${filteredCollections.length}`}
                {activeModal === "profit" && `Total items: ${filteredProfit.length}`}
                {activeModal === "overdue" && `Total items: ${filteredOverdue.length}`}
                {activeModal === "active_loans" && `Total items: ${filteredActiveLoans.length}`}
                {activeModal === "fully_paid" && `Total items: ${filteredFullyPaid.length}`}
                {activeModal === "due_this_month" && `Total items: ${filteredDueThisMonth.length}`}
                {activeModal === "total_borrowers" && `Total items: ${uniqueBorrowers.length}`}
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="bg-white border border-slate-205 hover:bg-slate-100 text-slate-700 px-4 py-1.5 rounded-xl font-bold uppercase transition-all"
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

// Subcomponent for Outstanding Balance Accordion
function OutstandingAccordionGroup({ group }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalBalance = group.loans.reduce((sum, l) => sum + l.remainingBalance, 0);

  // Helper to format currency
  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-primary">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 font-black text-lg border border-rose-100">
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
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-500">
              {group.loans.length} Active Loan(s)
            </span>
            <span className="block text-sm font-mono font-black text-rose-700">
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-4 border-l pl-4 border-slate-200">
            {isExpanded ? "Hide Details ▲" : "View Loans ▼"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
          {group.loans.map((l) => (
            <OutstandingLoanCard key={l.id} loan={l} />
          ))}
        </div>
      )}
    </div>
  );
}

// Subcomponent to render the specific loan schedule drill-down
function OutstandingLoanCard({ loan }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInstallmentSchedule = (loan) => {
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    const totalPaid = loan.totalAmountPayable - loan.remainingBalance;
    
    let status = "UNPAID";
    let paidAmount = totalPaid;
    if (loan.remainingBalance <= 0) {
      status = "PAID";
    } else if (totalPaid > 0) {
      status = "PARTIAL";
    }
    
    let penalty = 0;
    // Trust DB status as authoritative — avoids timestamp/timezone edge cases
    const isOverdue = (loan.status === "OVERDUE" || dueDate < today) && status !== "PAID";
    
    if (isOverdue) {
      const startYear = dueDate.getFullYear();
      const startMonth = dueDate.getMonth();
      const startDay = dueDate.getDate();
      const endYear = today.getFullYear();
      const endMonth = today.getMonth();
      const endDay = today.getDate();
      let monthsDelayed = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (endDay > startDay) {
        monthsDelayed += 1;
      }
      monthsDelayed = Math.max(1, monthsDelayed);
      
      penalty = loan.remainingBalance * 0.01 * monthsDelayed;
    }
    
    return [{
      monthNumber: 1,
      dueDate: dueDate,
      originalAmount: loan.totalAmountPayable,
      amount: loan.totalAmountPayable + penalty,
      paidAmount,
      penalty,
      isOverdue,
      status,
      isNextDue: status !== "PAID",
    }];
  };

  const schedule = getInstallmentSchedule(loan);
  const totalPaid = loan.totalAmountPayable - loan.remainingBalance;
  const paidPercent = Math.min(100, (totalPaid / loan.totalAmountPayable) * 100);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex flex-col md:flex-row justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              {loan.booking.destination}
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
              loan.status === "OVERDUE"
                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                : "bg-teal-50 text-teal-700 border-teal-200"
            }`}>
              {loan.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold">
            <span>Ref: <strong className="font-mono text-slate-700">{loan.booking.referenceNumber}</strong></span>
            <span>Final Due: <strong className="text-slate-700">{formatDate(loan.dueDate)}</strong></span>
          </div>
          {loan.booking.passengerName && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg leading-none">
                🎫 Passenger: {loan.booking.passengerName} ({loan.booking.passengerRelationship})
              </span>
            </div>
          )}
          {/* Booking Agent Badge */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg leading-none">
              ✈️ Agent: <strong className="text-slate-700">{loan.booking.bookedBy ? loan.booking.bookedBy.name : "Admin"}</strong>
            </span>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-1.5 min-w-[200px]">
          <div className="flex justify-between w-full text-xs font-bold text-slate-500">
            <span>Paid: {formatCurrency(totalPaid)}</span>
            <span>Total: {formatCurrency(loan.totalAmountPayable)}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full mt-1">
            <span className="text-[10px] font-bold text-primary">{formatCurrency(loan.monthlyInstallment)} / month</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              {isExpanded ? "Hide Details ▲" : "View Schedule ▼"}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/50 text-slate-500 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-2">Month</th>
                  <th scope="col" className="px-4 py-2">Due Date</th>
                  <th scope="col" className="px-4 py-2 text-right">Scheduled Amount</th>
                  <th scope="col" className="px-4 py-2 text-right">Amount Paid</th>
                  <th scope="col" className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium bg-white">
                {schedule.map((inst) => (
                  <tr key={inst.monthNumber} className={`hover:bg-slate-50/50 ${inst.isNextDue ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-slate-600">Month {inst.monthNumber}</span>
                      {inst.isNextDue && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">
                          Due Now
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {formatDate(inst.dueDate)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">
                      {formatCurrency(inst.amount)}
                      {inst.penalty > 0 && (
                        <span className="block text-[9px] text-rose-500 font-bold">+ 1% Penalty</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-bold">
                      {inst.paidAmount > 0 ? formatCurrency(inst.paidAmount) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        inst.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : inst.status === "PARTIAL"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : inst.isOverdue
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {inst.status === "UNPAID" && inst.isOverdue ? "OVERDUE" : inst.status}
                      </span>
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

// Subcomponent for Collections Accordion
function CollectionsAccordionGroup({ group }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalPaid = group.payments.reduce((sum, p) => sum + p.amountPaid, 0);

  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-emerald-500">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-lg border border-emerald-100">
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
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-500">
              {group.payments.length} Payments
            </span>
            <span className="block text-sm font-mono font-black text-emerald-600">
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-4 border-l pl-4 border-slate-200">
            {isExpanded ? "Hide Details ▲" : "View Payments ▼"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/50 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-3">OR Number</th>
                  <th scope="col" className="px-4 py-3">Route / Details</th>
                  <th scope="col" className="px-4 py-3">Date Paid</th>
                  <th scope="col" className="px-4 py-3">Method</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount Paid</th>
                  <th scope="col" className="px-4 py-3">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium bg-white">
                {group.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{p.receiptNumber}</td>
                    <td className="px-4 py-3.5">
                      <span className="block font-semibold">{p.loan.booking.destination}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">Ref: {p.loan.booking.referenceNumber}</span>
                      {p.loan.booking.passengerName && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none">
                          🎫 {p.loan.booking.passengerName} ({p.loan.booking.passengerRelationship})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{formatDate(p.paymentDate)}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-250 font-bold text-slate-600">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-800">{formatCurrency(p.amountPaid)}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{p.cashier.name}</td>
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

// Subcomponent for Profit Accordion
function ProfitAccordionGroup({ group }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLoanInterestPaid = (loan) => {
    if (!loan.payments || loan.payments.length === 0 || loan.totalAmountPayable <= 0) return 0;
    const paidAmount = loan.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    return (paidAmount / loan.totalAmountPayable) * loan.interestAmount;
  };

  const totalProfit = group.loans.reduce((sum, l) => sum + getLoanInterestPaid(l), 0);

  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-blue-500">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-lg border border-blue-100">
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
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-500">
              {group.loans.length} Loans
            </span>
            <span className="block text-sm font-mono font-black text-blue-700">
              +{formatCurrency(totalProfit)} Earned Profit
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-4 border-l pl-4 border-slate-200">
            {isExpanded ? "Hide Details ▲" : "View Loans ▼"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/50 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-3">Route / Flight</th>
                  <th scope="col" className="px-4 py-3 text-right">Base Ticket Cost</th>
                  <th scope="col" className="px-4 py-3 text-right">Service Fee</th>
                  <th scope="col" className="px-4 py-3 text-right">Target Interest</th>
                  <th scope="col" className="px-4 py-3 text-right font-black text-blue-700">Paid Profit</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Payable</th>
                  <th scope="col" className="px-4 py-3 text-center">Interest Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium bg-white">
                {group.loans.map((l) => {
                  const paidInterest = getLoanInterestPaid(l);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="block font-bold text-slate-800">{l.booking.destination}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">Ref: {l.booking.referenceNumber}</span>
                        {l.booking.passengerName && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none">
                            🎫 {l.booking.passengerName} ({l.booking.passengerRelationship})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">{formatCurrency(l.booking.ticketCost)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-indigo-700">{formatCurrency(l.booking.serviceFee)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-500 font-bold">{formatCurrency(l.interestAmount)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-teal-850 font-black">+{formatCurrency(paidInterest)}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">{formatCurrency(l.totalAmountPayable)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                          {l.interestRate}% ({l.interestType})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent for Overdue Accordion
function OverdueAccordionGroup({ group }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (val) => {
    return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Compute months overdue + penalty for one loan (DB status-aware)
  const getLoanPenalty = (loan) => {
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    const isPaid = loan.remainingBalance <= 0;
    if (isPaid) return { monthsDelayed: 0, penaltyPerMonth: 0, totalPenalty: 0, grandTotal: loan.remainingBalance };

    // Trust DB status — day-level comparison avoids timezone edge cases
    const dueDateDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let monthsDelayed = (todayDay.getFullYear() - dueDateDay.getFullYear()) * 12
                      + (todayDay.getMonth()     - dueDateDay.getMonth());
    if (todayDay.getDate() > dueDateDay.getDate()) monthsDelayed += 1;
    monthsDelayed = Math.max(1, monthsDelayed);

    const penaltyPerMonth = loan.remainingBalance * 0.01;
    const totalPenalty = penaltyPerMonth * monthsDelayed;
    return { monthsDelayed, penaltyPerMonth, totalPenalty, grandTotal: loan.remainingBalance + totalPenalty };
  };

  // Total balance + all accrued penalties for the group header
  const totalWithPenalty = group.loans.reduce((sum, l) => sum + getLoanPenalty(l).grandTotal, 0);
  const totalBalance     = group.loans.reduce((sum, l) => sum + l.remainingBalance, 0);

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm transition-all hover:border-rose-500">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-black text-lg border border-rose-100">
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
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-500">
              {group.loans.length} Overdue Loan(s)
            </span>
            <span className="block text-sm font-mono font-black text-rose-700 animate-pulse">
              {formatCurrency(totalWithPenalty)}
            </span>
            <span className="block text-[10px] font-semibold text-rose-400">
              incl. penalties
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-4 border-l pl-4 border-slate-200">
            {isExpanded ? "Hide Details ▲" : "View Loans ▼"}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100/50 text-slate-600 font-bold">
                <tr>
                  <th scope="col" className="px-4 py-3">Carrier / Route</th>
                  <th scope="col" className="px-4 py-3 text-right">Balance</th>
                  <th scope="col" className="px-4 py-3">Due Date</th>
                  <th scope="col" className="px-4 py-3 text-center">Months Overdue</th>
                  <th scope="col" className="px-4 py-3 text-right text-rose-700">Penalty (1%/mo)</th>
                  <th scope="col" className="px-4 py-3 text-right font-black text-rose-900">Total to Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium bg-white">
                {group.loans.map((l) => {
                  const { monthsDelayed, penaltyPerMonth, totalPenalty, grandTotal } = getLoanPenalty(l);
                  return (
                    <tr key={l.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="block font-semibold">{l.booking.destination}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">Ref: {l.booking.referenceNumber}</span>
                        {l.booking.passengerName && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-none">
                            🎫 {l.booking.passengerName} ({l.booking.passengerRelationship})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">{formatCurrency(l.remainingBalance)}</td>
                      <td className="px-4 py-3.5 font-mono text-rose-800 font-bold">{formatDate(l.dueDate)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 border border-rose-300 font-black">
                          {monthsDelayed} mo.
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-black text-rose-700 font-mono">+{formatCurrency(totalPenalty)}</span>
                        <span className="block text-[9px] text-rose-400 font-semibold">
                          {formatCurrency(penaltyPerMonth)}/mo × {monthsDelayed}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-black text-rose-900 font-mono text-sm">{formatCurrency(grandTotal)}</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Group total row */}
                <tr className="bg-rose-50 border-t-2 border-rose-300">
                  <td colSpan={5} className="px-4 py-3 font-black text-rose-900 uppercase tracking-wider text-right">
                    Total to Collect
                  </td>
                  <td className="px-4 py-3 text-right font-black text-rose-900 font-mono text-sm">
                    {formatCurrency(totalWithPenalty)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
