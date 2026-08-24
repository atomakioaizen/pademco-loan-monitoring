"use client";

import React, { useState, useMemo } from "react";
import EmployeeCombobox from "@/components/EmployeeCombobox";

export default function BookkeeperConsoleClient({
  user,
  employees,
  oldLoans = [],
  requests = [],
  activeLoans = [],
  approvalAuditLogs = [],
  encodeOldLoanAction,
  deleteOldLoanAction,
  reviewRequestAction,
  initialTab = "ENCODE",
}) {
  const isBookkeeper = user?.role === "BOOKKEEPER";
  const isManager = user?.role === "MANAGER";

  const [activeTab, setActiveTab] = useState(initialTab); // "ENCODE" | "REQUESTS" | "EXISTING_LOANS" | "DECISIONS_LOG"
  
  // Request Queue Sub-Filter State
  const [requestFilter, setRequestFilter] = useState("ALL"); // "ALL" | "PENDING" | "APPROVED" | "REJECTED"

  // View Mode: "TABLE" (Detailed Ticket Table) vs "BORROWER_CARDS" (Grouped by Borrower Person)
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "BORROWER_CARDS"

  // Encoding Form State / Modal
  const [showEncodeModal, setShowEncodeModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [ticketDate, setTicketDate] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [drAmount, setDrAmount] = useState("");
  const [markupAmount, setMarkupAmount] = useState("");
  const [totalTicketAmount, setTotalTicketAmount] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [paymentDateStr, setPaymentDateStr] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [paidTotal, setPaidTotal] = useState("");
  const [unpaidBalance, setUnpaidBalance] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);

  // Expanded Borrower Accordions State in Borrower Cards Mode
  const [expandedBorrowerKeys, setExpandedBorrowerKeys] = useState(new Set());

  // Old Loans Table Filters & Sorting
  const [yearFilter, setYearFilter] = useState("ALL"); // "ALL" | "2022" | "2023" | "2024" | "2025" | "2026"
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "UNPAID" | "PAID"
  const [sortBy, setSortBy] = useState("DATE_DESC");

  // Review Dialog State (For Booking Requests Queue)
  const [reviewRequest, setReviewRequest] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Existing Loans Directory Filters
  const [loanSearch, setLoanSearch] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("ALL");

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId) || null;

  // Derive unique years from oldLoans
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    oldLoans.forEach(ol => {
      const d = ol.ticketDate ? new Date(ol.ticketDate) : (ol.dateSince ? new Date(ol.dateSince) : null);
      if (d && !isNaN(d.getTime())) {
        yearsSet.add(d.getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [oldLoans]);

  // Compute KPI Totals from oldLoans
  const kpiTotals = useMemo(() => {
    let totalValue = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let unpaidCount = 0;
    const uniqueBorrowers = new Set();

    oldLoans.forEach(ol => {
      totalValue += (ol.totalTicketAmount || ol.estimatedAmount || 0);
      totalPaid += (ol.paidTotal || 0);
      totalBalance += (ol.unpaidBalance || 0);
      if ((ol.unpaidBalance || 0) > 0) unpaidCount++;
      if (ol.payeeName) uniqueBorrowers.add(ol.payeeName.toUpperCase().trim());
    });

    return {
      totalTicketsCount: oldLoans.length,
      uniqueBorrowersCount: uniqueBorrowers.size,
      unpaidTicketsCount: unpaidCount,
      totalValue,
      totalPaid,
      totalBalance
    };
  }, [oldLoans]);

  // Filter & Sort Old Loans Schedule Table
  const filteredOldLoans = useMemo(() => {
    return oldLoans.filter(ol => {
      // Year filter
      let yr = "";
      const d = ol.ticketDate ? new Date(ol.ticketDate) : (ol.dateSince ? new Date(ol.dateSince) : null);
      if (d && !isNaN(d.getTime())) yr = d.getFullYear().toString();
      
      if (yearFilter !== "ALL" && yr !== yearFilter) return false;

      // Status filter
      const isUnpaid = (ol.unpaidBalance || 0) > 0;
      if (statusFilter === "UNPAID" && !isUnpaid) return false;
      if (statusFilter === "PAID" && isUnpaid) return false;

      // Search query (payee name, check #, OR #, remarks)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (ol.payeeName || ol.employee?.fullName || "").toLowerCase();
        const chk = (ol.checkNumber || "").toLowerCase();
        const or = (ol.orNumber || "").toLowerCase();
        const rem = (ol.remarks || "").toLowerCase();
        const empCode = (ol.employee?.employeeId || "").toLowerCase();
        const office = (ol.employee?.office?.name || "").toLowerCase();

        const match =
          pName.includes(q) ||
          chk.includes(q) ||
          or.includes(q) ||
          rem.includes(q) ||
          empCode.includes(q) ||
          office.includes(q);

        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.ticketDate ? new Date(a.ticketDate).getTime() : 0;
      const dateB = b.ticketDate ? new Date(b.ticketDate).getTime() : 0;
      const nameA = (a.payeeName || a.employee?.fullName || "").toLowerCase();
      const nameB = (b.payeeName || b.employee?.fullName || "").toLowerCase();
      const amtA = a.totalTicketAmount || a.estimatedAmount || 0;
      const amtB = b.totalTicketAmount || b.estimatedAmount || 0;
      const balA = a.unpaidBalance || 0;
      const balB = b.unpaidBalance || 0;

      if (sortBy === "DATE_DESC") return dateB - dateA;
      if (sortBy === "DATE_ASC") return dateA - dateB;
      if (sortBy === "NAME_ASC") return nameA.localeCompare(nameB);
      if (sortBy === "NAME_DESC") return nameB.localeCompare(nameA);
      if (sortBy === "AMOUNT_DESC") return amtB - amtA;
      if (sortBy === "BALANCE_DESC") return balB - balA;
      return 0;
    });
  }, [oldLoans, yearFilter, statusFilter, searchQuery, sortBy]);

  // Group filteredOldLoans by Borrower / Person for Stat Cards View
  const groupedBorrowers = useMemo(() => {
    const map = new Map();

    filteredOldLoans.forEach(ol => {
      const nameKey = (ol.payeeName || ol.employee?.fullName || "UNKNOWN").toUpperCase().trim();
      if (!map.has(nameKey)) {
        map.set(nameKey, {
          key: nameKey,
          payeeName: ol.payeeName || ol.employee?.fullName,
          employee: ol.employee,
          tickets: [],
          totalTicketAmount: 0,
          totalPaid: 0,
          totalUnpaidBalance: 0,
          oldestDate: ol.ticketDate || ol.dateSince,
        });
      }

      const group = map.get(nameKey);
      group.tickets.push(ol);
      group.totalTicketAmount += (ol.totalTicketAmount || ol.estimatedAmount || 0);
      group.totalPaid += (ol.paidTotal || 0);
      group.totalUnpaidBalance += (ol.unpaidBalance || 0);

      const dCur = ol.ticketDate ? new Date(ol.ticketDate) : (ol.dateSince ? new Date(ol.dateSince) : null);
      const dOld = group.oldestDate ? new Date(group.oldestDate) : null;
      if (dCur && dOld && dCur < dOld) {
        group.oldestDate = ol.ticketDate || ol.dateSince;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalUnpaidBalance - a.totalUnpaidBalance);
  }, [filteredOldLoans]);

  function toggleBorrowerExpand(key) {
    setExpandedBorrowerKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExpandAll() {
    if (expandedBorrowerKeys.size === groupedBorrowers.length) {
      setExpandedBorrowerKeys(new Set());
    } else {
      setExpandedBorrowerKeys(new Set(groupedBorrowers.map(b => b.key)));
    }
  }

  function resetEncodeForm() {
    setEditingRecordId(null);
    setSelectedEmployeeId("");
    setTicketDate("");
    setCheckNumber("");
    setDrAmount("");
    setMarkupAmount("");
    setTotalTicketAmount("");
    setPenaltyAmount("");
    setPaymentDateStr("");
    setOrNumber("");
    setPaidTotal("");
    setUnpaidBalance("");
    setRemarks("");
    setError("");
    setSuccess("");
  }

  function handleEditClick(rec) {
    setEditingRecordId(rec.id);
    setSelectedEmployeeId(rec.employeeId);
    setTicketDate(rec.ticketDate ? new Date(rec.ticketDate).toISOString().substring(0, 10) : "");
    setCheckNumber(rec.checkNumber || "");
    setDrAmount(rec.drAmount ? String(rec.drAmount) : "");
    setMarkupAmount(rec.markupAmount ? String(rec.markupAmount) : "");
    setTotalTicketAmount(rec.totalTicketAmount ? String(rec.totalTicketAmount) : "");
    setPenaltyAmount(rec.penaltyAmount ? String(rec.penaltyAmount) : "");
    setPaymentDateStr(rec.paymentDateStr || "");
    setOrNumber(rec.orNumber || "");
    setPaidTotal(rec.paidTotal ? String(rec.paidTotal) : "");
    setUnpaidBalance(rec.unpaidBalance ? String(rec.unpaidBalance) : "");
    setRemarks(rec.remarks || "");
    setError("");
    setSuccess("");
    setShowEncodeModal(true);
  }

  async function handleEncodeSubmit(e) {
    e.preventDefault();
    if (!isBookkeeper) {
      setError("Only Bookkeepers can encode or edit old loan records.");
      return;
    }
    if (!selectedEmployee) {
      setError("Please select a borrower employee first.");
      return;
    }
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const formData = new FormData();
    if (editingRecordId) formData.append("id", editingRecordId);
    formData.append("employeeId", selectedEmployee.id);
    formData.append("ticketDate", ticketDate);
    formData.append("checkNumber", checkNumber);
    formData.append("drAmount", drAmount);
    formData.append("markupAmount", markupAmount);
    formData.append("totalTicketAmount", totalTicketAmount);
    formData.append("penaltyAmount", penaltyAmount);
    formData.append("paymentDateStr", paymentDateStr);
    formData.append("orNumber", orNumber);
    formData.append("paidTotal", paidTotal);
    formData.append("unpaidBalance", unpaidBalance);
    formData.append("remarks", remarks);

    try {
      const res = await encodeOldLoanAction(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(editingRecordId ? "Record updated successfully!" : "Old loan ticket saved successfully!");
        setTimeout(() => {
          setShowEncodeModal(false);
          resetEncodeForm();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id, name) {
    if (!isBookkeeper) {
      alert("Only Bookkeepers can delete records. Admin access is view-only.");
      return;
    }
    if (!confirm(`Are you sure you want to delete old ticket loan for "${name}"?`)) return;
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
      return {
        id: ol.id,
        type: "OLD_LOAN",
        typeLabel: "Encoded Pre-existing Loan",
        borrowerName: ol.payeeName || ol.employee?.fullName,
        employeeId: ol.employee?.employeeId,
        officeName: ol.employee?.office?.name || "DENR Palawan",
        reference: ol.orNumber ? `OR #${ol.orNumber}` : (ol.checkNumber ? `Check #${ol.checkNumber}` : "Old Ticket"),
        destination: "N/A (Pre-existing Debt)",
        airline: "N/A",
        date: ol.ticketDate || ol.dateSince,
        totalOwed: ol.totalTicketAmount || ol.estimatedAmount || 0,
        totalPaid: ol.paidTotal || 0,
        remainingBalance: ol.unpaidBalance || 0,
        status: (ol.unpaidBalance || 0) > 0 ? "UNPAID OLD LOAN" : "FULLY PAID",
        remarks: ol.remarks,
        rawObj: ol,
      };
    }),
  ];

  const filteredLoansDirectory = combinedExistingLoans.filter(item => {
    const q = loanSearch.toLowerCase().trim();
    const bName = (item.borrowerName || "").toLowerCase();
    const empId = (item.employeeId || "").toLowerCase();
    const office = (item.officeName || "").toLowerCase();
    const ref = (item.reference || "").toLowerCase();
    const typeStr = (item.type || "").toLowerCase();
    const statusStr = (item.status || "").toLowerCase();

    const matchesSearch =
      !q ||
      bName.includes(q) ||
      empId.includes(q) ||
      office.includes(q) ||
      ref.includes(q) ||
      typeStr.includes(q) ||
      statusStr.includes(q);

    const matchesType =
      loanTypeFilter === "ALL" ||
      (loanTypeFilter === "REGULAR" && item.type === "REGULAR") ||
      (loanTypeFilter === "OLD_LOAN" && item.type === "OLD_LOAN");

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* View-Only Alert Banner for Non-Bookkeepers (Admin / Manager) */}
      {!isBookkeeper && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-2xl shadow-sm text-indigo-900 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <span className="text-xl">ℹ️</span>
          <div>
            <span className="font-bold text-indigo-950 block text-sm">
              {isManager ? "🔒 View-Only Manager Mode" : "View-Only Admin Mode"}
            </span>
            {isManager
              ? "As Manager, you have view-only access to inspect the schedule of old ticket loans, view borrower summary cards, search, filter, and export data. Encoding, editing, deleting, and approval decisions are reserved for Bookkeepers."
              : "As Admin, you have view-only access to the Bookkeeper console. You can inspect all records, approval histories, and active debt directories. Encoding, editing, deleting, and decision approvals are reserved strictly for Bookkeepers."}
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border border-slate-200 bg-[#f8fafc] p-1.5 gap-2 rounded-2xl shadow-xs select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab("ENCODE")}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "ENCODE"
              ? "bg-white text-primary border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <span>📋 Old Loans Schedule ({oldLoans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("REQUESTS")}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "REQUESTS"
              ? "bg-white text-primary border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <span>⚖️ Booking Requests Queue</span>
          {pendingCount > 0 ? (
            <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold animate-pulse">
              {pendingCount}
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("EXISTING_LOANS")}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "EXISTING_LOANS"
              ? "bg-white text-primary border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <span>💳 Existing Loans Directory</span>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
            {combinedExistingLoans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("DECISIONS_LOG")}
          className={`flex-1 min-w-[210px] flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "DECISIONS_LOG"
              ? "bg-white text-primary border-slate-200 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/50 border-transparent"
          }`}
        >
          <span>📜 Decisions & Remarks Log</span>
          <span className="bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono">
            {approvalAuditLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OLD LOANS SCHEDULE TABLE & ENCODING */}
      {activeTab === "ENCODE" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Old Tickets</div>
              <div className="text-2xl font-black text-slate-800 mt-1 font-mono">{kpiTotals.totalTicketsCount}</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                Across {kpiTotals.uniqueBorrowersCount} unique borrowers ({kpiTotals.unpaidTicketsCount} unpaid tickets)
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Ticket Value</div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                ₱{kpiTotals.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1">Sum of all tickets</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Amount Collected</div>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                ₱{kpiTotals.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">Recorded payments</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-rose-100 bg-rose-50/20 shadow-sm">
              <div className="text-rose-500 text-xs font-bold uppercase tracking-wider">Outstanding Balance</div>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
                ₱{kpiTotals.totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">Unpaid old loan debt</div>
            </div>
          </div>

          {/* Table Container Card (Full Screen Layout matching screenshot) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Header, View Mode Switcher, & Action Button */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Schedule of Old Ticket Loans</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual absorbed old ticket loans schedule CY 2022–2026. Filter by year, payee, status, or search.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-auto">
                {/* View Mode Toggle Pill */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setViewMode("TABLE")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "TABLE"
                        ? "bg-white text-primary shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>📊 All Tickets Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("BORROWER_CARDS")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "BORROWER_CARDS"
                        ? "bg-white text-primary shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>👤 Borrower Summary Cards ({groupedBorrowers.length})</span>
                  </button>
                </div>

                {isBookkeeper && (
                  <button
                    onClick={() => {
                      resetEncodeForm();
                      setShowEncodeModal(true);
                    }}
                    className="bg-[#1b2a4a] hover:bg-[#15223c] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>➕ Encode New Old Ticket</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              {/* Year Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  FILTER BY YEAR
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
                >
                  <option value="ALL">All Years (2022 – 2026)</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>CY {yr}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  FILTER BY STATUS
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNPAID">🔴 Unpaid (With Balance)</option>
                  <option value="PAID">🟢 Fully Paid</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  SORT RECORDS BY
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
                >
                  <option value="DATE_DESC">Date (Newest First)</option>
                  <option value="DATE_ASC">Date (Oldest First)</option>
                  <option value="NAME_ASC">Borrower Name (A – Z)</option>
                  <option value="NAME_DESC">Borrower Name (Z – A)</option>
                  <option value="AMOUNT_DESC">Ticket Amount (High to Low)</option>
                  <option value="BALANCE_DESC">Unpaid Balance (High to Low)</option>
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
                  SEARCH PAYEE / CHECK / OR
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, check #, OR #..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
                />
              </div>
            </div>

            {/* Results Count Banner */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <div>
                {viewMode === "TABLE" ? (
                  <>Showing <span className="font-bold text-slate-800">{filteredOldLoans.length}</span> of {oldLoans.length} ticket records</>
                ) : (
                  <>Showing <span className="font-bold text-slate-800">{groupedBorrowers.length}</span> borrowers ({filteredOldLoans.length} tickets)</>
                )}
              </div>
              <div className="flex items-center gap-3">
                {viewMode === "BORROWER_CARDS" && (
                  <button
                    onClick={toggleExpandAll}
                    className="text-primary hover:underline font-bold text-xs cursor-pointer"
                  >
                    {expandedBorrowerKeys.size === groupedBorrowers.length ? "Collapse All Cards" : "Expand All Cards"}
                  </button>
                )}
                {(yearFilter !== "ALL" || statusFilter !== "ALL" || searchQuery.trim()) && (
                  <button
                    onClick={() => {
                      setYearFilter("ALL");
                      setStatusFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-rose-600 hover:underline font-bold text-xs cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE 1: DETAILED ALL TICKETS TABLE (Full Size Layout matching user screenshot) */}
            {viewMode === "TABLE" && (
              <>
                {filteredOldLoans.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                    No ticket records match your filter parameters.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-100 text-xs">
                      <thead className="bg-slate-50/80 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                        <tr>
                          <th scope="col" className="px-4 py-3.5 text-left">DATE</th>
                          <th scope="col" className="px-4 py-3.5 text-left">CHECK NO</th>
                          <th scope="col" className="px-4 py-3.5 text-left">BORROWER (PAYEE)</th>
                          <th scope="col" className="px-4 py-3.5 text-right">DR BASE</th>
                          <th scope="col" className="px-4 py-3.5 text-right">MARKUP</th>
                          <th scope="col" className="px-4 py-3.5 text-right">TOTAL TICKET</th>
                          <th scope="col" className="px-4 py-3.5 text-center">PENALTY</th>
                          <th scope="col" className="px-4 py-3.5 text-left">PAYMENT / OR</th>
                          <th scope="col" className="px-4 py-3.5 text-right">PAID TOTAL</th>
                          <th scope="col" className="px-4 py-3.5 text-right">UNPAID BALANCE</th>
                          <th scope="col" className="px-4 py-3.5 text-center">STATUS</th>
                          <th scope="col" className="px-4 py-3.5 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                        {filteredOldLoans.map((rec) => {
                          const isUnpaid = (rec.unpaidBalance || 0) > 0;
                          const dateObj = rec.ticketDate ? new Date(rec.ticketDate) : (rec.dateSince ? new Date(rec.dateSince) : null);
                          const formattedDate = dateObj && !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—";

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-800">
                                {formattedDate}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-500">
                                {rec.checkNumber || "—"}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="font-extrabold text-slate-900 text-sm">{rec.payeeName || rec.employee?.fullName}</div>
                                {rec.payeeExtra && (
                                  <div className="text-[11px] text-slate-400">Note: {rec.payeeExtra}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-600">
                                ₱{(rec.drAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right font-mono text-slate-600">
                                ₱{(rec.markupAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right font-mono font-black text-slate-900">
                                ₱{(rec.totalTicketAmount || rec.estimatedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center font-mono text-rose-600 font-semibold">
                                {(rec.penaltyAmount || 0) > 0 ? `₱${rec.penaltyAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                              </td>
                              <td className="px-4 py-4 text-slate-600 max-w-[150px] truncate" title={`${rec.paymentDateStr || ''} ${rec.orNumber ? 'OR#' + rec.orNumber : ''}`}>
                                {rec.orNumber ? (
                                  <span className="font-mono font-bold text-primary">OR #{rec.orNumber}</span>
                                ) : rec.paymentDateStr ? (
                                  <span>{rec.paymentDateStr}</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right font-mono font-bold text-emerald-700">
                                ₱{(rec.paidTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`px-4 py-4 whitespace-nowrap text-right font-mono font-black ${isUnpaid ? "text-rose-700" : "text-emerald-600"}`}>
                                ₱{(rec.unpaidBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isUnpaid ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  {isUnpaid ? "UNPAID" : "FULLY PAID"}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-xs">
                                <button
                                  onClick={() => setSelectedTicketDetail(rec)}
                                  className="text-slate-500 hover:text-slate-800 font-bold mr-2 cursor-pointer"
                                >
                                  Details
                                </button>
                                {isBookkeeper && (
                                  <>
                                    <button
                                      onClick={() => handleEditClick(rec)}
                                      className="text-primary hover:text-primary-hover font-bold mr-2 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(rec.id, rec.payeeName || rec.employee?.fullName)}
                                      className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* VIEW MODE 2: BORROWER STAT CARDS (Grouped by Borrower Person with Accordion) */}
            {viewMode === "BORROWER_CARDS" && (
              <div className="space-y-4">
                {groupedBorrowers.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                    No borrower records match your filter parameters.
                  </div>
                ) : (
                  groupedBorrowers.map((borrower) => {
                    const isExpanded = expandedBorrowerKeys.has(borrower.key);
                    const isUnpaid = borrower.totalUnpaidBalance > 0;

                    return (
                      <div
                        key={borrower.key}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isUnpaid ? "border-rose-200 bg-white shadow-xs" : "border-slate-200 bg-white"
                        }`}
                      >
                        {/* Borrower Card Header / Summary Row */}
                        <div
                          onClick={() => toggleBorrowerExpand(borrower.key)}
                          className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                              isUnpaid ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              👤
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-slate-900">{borrower.payeeName}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isUnpaid ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  {isUnpaid ? `UNPAID (${borrower.tickets.length} Ticket${borrower.tickets.length > 1 ? 's' : ''})` : "FULLY PAID"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                ID: <span className="font-mono text-slate-600 font-bold">{borrower.employee?.employeeId || "N/A"}</span> • {borrower.employee?.office?.name || "DENR Palawan"}
                              </div>
                            </div>
                          </div>

                          {/* Combined Amounts & Controls */}
                          <div className="flex items-center gap-6 self-end md:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Combined Ticket Total</span>
                              <span className="text-sm font-black font-mono text-slate-800">
                                ₱{borrower.totalTicketAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Paid</span>
                              <span className="text-sm font-black font-mono text-emerald-700">
                                ₱{borrower.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="text-right bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Combined Unpaid Balance</span>
                              <span className="text-base font-black font-mono text-rose-800">
                                ₱{borrower.totalUnpaidBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <button className="text-slate-400 hover:text-slate-800 text-base font-bold transition-transform">
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Nested Tickets Table */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-fadeIn">
                            <div className="text-xs font-bold text-slate-600 mb-3 flex items-center justify-between">
                              <span>Tickets breakdown for {borrower.payeeName} ({borrower.tickets.length} record{borrower.tickets.length > 1 ? 's' : ''}):</span>
                              {isBookkeeper && borrower.employee && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetEncodeForm();
                                    setSelectedEmployeeId(borrower.employee.id);
                                    setShowEncodeModal(true);
                                  }}
                                  className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                                >
                                  + Encode another ticket for this borrower
                                </button>
                              )}
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-100 text-slate-500 font-bold">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Date</th>
                                    <th className="px-3 py-2 text-left">Check No</th>
                                    <th className="px-3 py-2 text-right">DR Base</th>
                                    <th className="px-3 py-2 text-right">Markup</th>
                                    <th className="px-3 py-2 text-right">Total Ticket</th>
                                    <th className="px-3 py-2 text-left">Payment Date / OR</th>
                                    <th className="px-3 py-2 text-right">Paid Total</th>
                                    <th className="px-3 py-2 text-right">Unpaid Balance</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white font-medium">
                                  {borrower.tickets.map((t) => {
                                    const tUnpaid = (t.unpaidBalance || 0) > 0;
                                    return (
                                      <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2.5 font-semibold text-slate-800">
                                          {t.ticketDate ? new Date(t.ticketDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                        </td>
                                        <td className="px-3 py-2.5 font-mono text-slate-600">{t.checkNumber || "—"}</td>
                                        <td className="px-3 py-2.5 text-right font-mono">₱{(t.drAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2.5 text-right font-mono">₱{(t.markupAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2.5 text-right font-mono font-bold">₱{(t.totalTicketAmount || t.estimatedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-3 py-2.5 text-slate-600">
                                          {t.orNumber ? <span className="font-mono text-primary font-bold">OR #{t.orNumber}</span> : (t.paymentDateStr || "—")}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">₱{(t.paidTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td className={`px-3 py-2.5 text-right font-mono font-black ${tUnpaid ? "text-rose-700" : "text-emerald-600"}`}>
                                          ₱{(t.unpaidBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTicketDetail(t);
                                            }}
                                            className="text-slate-500 hover:text-slate-800 font-bold mr-2 text-[11px]"
                                          >
                                            Details
                                          </button>
                                          {isBookkeeper && (
                                            <>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditClick(t);
                                                }}
                                                className="text-primary hover:text-primary-hover font-bold mr-2 text-[11px]"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete(t.id, t.payeeName || borrower.payeeName);
                                                }}
                                                className="text-rose-600 hover:text-rose-800 font-bold text-[11px]"
                                              >
                                                Delete
                                              </button>
                                            </>
                                          )}
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
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENCODE / EDIT MODAL */}
      {showEncodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">
                {editingRecordId ? "✏️ Edit Old Ticket Loan Record" : "✍️ Encode New Old Ticket Loan"}
              </h3>
              <button
                onClick={() => setShowEncodeModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {success}
              </div>
            )}

            <form onSubmit={handleEncodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Borrower Employee <span className="text-rose-500">*</span>
                </label>
                <EmployeeCombobox
                  employees={employees}
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  placeholder="Select borrower employee..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ticket Date
                  </label>
                  <input
                    type="date"
                    value={ticketDate}
                    onChange={(e) => setTicketDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="Check #"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    DR Base (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={drAmount}
                    onChange={(e) => setDrAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Markup (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={markupAmount}
                    onChange={(e) => setMarkupAmount(e.target.value)}
                    placeholder="300.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Ticket (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalTicketAmount}
                    onChange={(e) => setTotalTicketAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    OR Number
                  </label>
                  <input
                    type="text"
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    placeholder="OR #"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Paid (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidTotal}
                    onChange={(e) => setPaidTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unpaid Balance (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={unpaidBalance}
                    onChange={(e) => setUnpaidBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary font-mono text-rose-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Date / Deduction Details
                </label>
                <input
                  type="text"
                  value={paymentDateStr}
                  onChange={(e) => setPaymentDateStr(e.target.value)}
                  placeholder="e.g., Nov 2022 payroll deduction"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Context
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows="2"
                  placeholder="Optional details..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEncodeModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : (editingRecordId ? "Update Record" : "Save Record")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTicketDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Ticket Loan Details
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedTicketDetail.payeeName || selectedTicketDetail.employee?.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketDetail(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Ticket Date</span>
                <span className="font-bold text-slate-800">
                  {selectedTicketDetail.ticketDate ? new Date(selectedTicketDetail.ticketDate).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Check Number</span>
                <span className="font-mono font-bold text-slate-800">{selectedTicketDetail.checkNumber || "—"}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">DR Base Amount</span>
                <span className="font-mono font-bold text-slate-800">₱{(selectedTicketDetail.drAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Markup Amount</span>
                <span className="font-mono font-bold text-slate-800">₱{(selectedTicketDetail.markupAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Ticket Amount</span>
                <span className="font-mono font-black text-slate-900 text-sm">₱{(selectedTicketDetail.totalTicketAmount || selectedTicketDetail.estimatedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">OR Number</span>
                <span className="font-mono font-bold text-primary">{selectedTicketDetail.orNumber || "—"}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Date / Note</span>
                <span className="font-medium text-slate-700">{selectedTicketDetail.paymentDateStr || "—"}</span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Total Paid</span>
                <span className="font-mono font-black text-emerald-800">₱{(selectedTicketDetail.paidTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="bg-rose-50 p-3 rounded-xl">
                <span className="text-rose-700 block text-[10px] uppercase font-bold">Unpaid Balance</span>
                <span className="font-mono font-black text-rose-800">₱{(selectedTicketDetail.unpaidBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {selectedTicketDetail.remarks && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                <span className="font-bold block text-slate-700 text-[10px] uppercase mb-0.5">Remarks</span>
                {selectedTicketDetail.remarks}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTicketDetail(null)}
                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
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
                              <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-150 italic">
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
                              className="bg-primary hover:bg-primary-hover text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all"
                            >
                              Review & Decide
                            </button>
                          ) : (
                            <span className="text-amber-600 font-bold text-xs">Pending Bookkeeper</span>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              setReviewRequest(req);
                              setReviewRemarks(req.remarks || "");
                            }}
                            className="text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                          >
                            Update Decision
                          </button>
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

      {/* REVIEW DECISION DIALOG MODAL */}
      {reviewRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800">
                Review Override Request
              </h3>
              <button
                onClick={() => setReviewRequest(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Borrower:</span>{" "}
                <span className="font-bold text-slate-800">{reviewRequest.employee.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Requested By Agent:</span>{" "}
                <span className="font-bold text-slate-800">{reviewRequest.requestedBy.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bookkeeper Remarks / Reason
              </label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter approval conditions or rejection reason..."
                rows="3"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewRequest(null)}
                disabled={isReviewing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewSubmit("REJECTED")}
                disabled={isReviewing}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                ❌ Reject Request
              </button>
              <button
                onClick={() => handleReviewSubmit("APPROVED")}
                disabled={isReviewing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                ✅ Approve Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXISTING LOANS DIRECTORY */}
      {activeTab === "EXISTING_LOANS" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">Existing Loans Directory</h3>
              <p className="text-xs text-slate-400 mt-1">
                Unified master ledger of all regular flight loans and pre-existing old loan debts.
              </p>
            </div>

            {/* Sub-Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                placeholder="Search borrower, ID, PNR..."
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-primary"
              />
              <select
                value={loanTypeFilter}
                onChange={(e) => setLoanTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Types</option>
                <option value="REGULAR">Regular Loans</option>
                <option value="OLD_LOAN">Old Ticket Loans</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Borrower</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Reference / Details</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Owed</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Paid</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining Balance</th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredLoansDirectory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                        item.type === "REGULAR" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      }`}>
                        {item.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">{item.borrowerName}</div>
                      <div className="text-[10px] text-slate-400">ID: {item.employeeId} • {item.officeName}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                      <div className="font-bold text-slate-800">{item.reference}</div>
                      <div className="text-[10px] text-slate-400">{item.destination}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-mono font-bold text-slate-800">
                      ₱{(item.totalOwed || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-mono font-bold text-emerald-700">
                      ₱{(item.totalPaid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs font-mono font-black text-rose-700">
                      ₱{(item.remainingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DECISIONS & REMARKS LOG */}
      {activeTab === "DECISIONS_LOG" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">Decisions & Audit Log</h3>
            <p className="text-xs text-slate-400 mt-1">
              Historical record of Bookkeeper approvals, rejections, encoding, and system overrides.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Performed By</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Details / Summary</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {approvalAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                      {log.user?.name || "System"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {log.details}
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
