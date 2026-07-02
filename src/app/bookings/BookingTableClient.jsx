"use client";

import React, { useState, useTransition } from "react";
import DeleteButton from "@/components/DeleteButton";

export default function BookingTableClient({ bookings, airlines, session, maxActiveFlights = 4, cancelBookingAction, updateBookingAction, settings = {} }) {
  const [editingBooking, setEditingBooking] = useState(null);
  const [historyBooking, setHistoryBooking] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleOpenHistory = (booking) => {
    setHistoryBooking(booking);
  };

  const handleCloseHistory = () => {
    setHistoryBooking(null);
  };

  // Advanced Ledger Filtering & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate dynamic active outstanding flight counts for each employee borrower on the client side
  const flightCountMap = bookings.reduce((acc, b) => {
    if (b.loan && b.loan.status !== "FULLY_PAID") {
      acc[b.employeeId] = (acc[b.employeeId] || 0) + b.flightCount;
    }
    return acc;
  }, {});

  const handleOpenEdit = (booking) => {
    setEditingBooking({
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      airlineId: booking.airlineId,
      tripType: booking.tripType || "ONE_WAY",
      destination: booking.destination,
      travelDate: new Date(booking.travelDate).toISOString().substring(0, 10),
      outboundTime: booking.outboundTime || "",
      returnDate: booking.returnDate ? new Date(booking.returnDate).toISOString().substring(0, 10) : "",
      returnTime: booking.returnTime || "",
      ticketCost: booking.ticketCost,
      serviceFee: booking.serviceFee,
      remarks: booking.remarks || "",
      histories: booking.histories || [],
    });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleCloseEdit = () => {
    setEditingBooking(null);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    const rebookingFeeVal = parseFloat(settings.rebooking_fee || "200.00");
    const confirmMsg = `Are you sure you want to proceed with this rebooking? A non-refundable Rebooking Fee of ₱${rebookingFeeVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} will be added to the loan balance.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData(e.target);
    formData.append("bookingId", editingBooking.id);

    startTransition(async () => {
      const res = await updateBookingAction(formData);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Flight rebooked and loan details updated successfully!");
        setTimeout(() => {
          setEditingBooking(null);
        }, 1500);
      }
    });
  };

  // Filter bookings based on Search and Status Filter (Active & Overdue only)
  const filteredBookings = bookings.filter((book) => {
    // Exclude fully paid records from the active monitoring console entirely
    if (book.loan?.status === "FULLY_PAID") return false;

    const term = searchTerm.toLowerCase().trim();
    const refMatch = book.referenceNumber.toLowerCase().includes(term);
    const empMatch = book.employee.fullName.toLowerCase().includes(term);
    const destMatch = book.destination.toLowerCase().includes(term);
    const airMatch = book.airline.name.toLowerCase().includes(term);
    const matchesSearch = !term || refMatch || empMatch || destMatch || airMatch;

    const loanStatus = book.loan?.status || "NO_LOAN";
    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = loanStatus === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Count aggregates for navigation tab badges (Active & Overdue only)
  const activeOnly = bookings.filter((b) => b.loan?.status !== "FULLY_PAID");
  const countAll = activeOnly.length;
  const countActive = activeOnly.filter((b) => b.loan?.status === "ACTIVE").length;
  const countOverdue = activeOnly.filter((b) => b.loan?.status === "OVERDUE").length;

  // Pagination indexing calculations
  const totalRecords = filteredBookings.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Booking Ledgers & Loan Accounts Console
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Search, filter, and inspect cooperative active flight balances and loan details.
          </p>
        </div>
      </div>

      {/* Advanced Filter, Search, and Page Size Options */}
      <div className="p-4 bg-slate-50/20 border-b border-slate-200 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search employee, reference, destination, or airline..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full rounded-xl border border-slate-250 pl-9 pr-4 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white font-medium shadow-sm"
            />
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 shrink-0">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-250 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 bg-white cursor-pointer font-bold font-mono text-xs shadow-sm"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        {/* Tab Badges for Quick Filtering */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "All Active Debts", count: countAll, bg: "bg-slate-100 text-slate-700 border border-slate-200/50", activeBg: "bg-slate-800 text-white" },
            { id: "ACTIVE", label: "Active Loans", count: countActive, bg: "bg-blue-50 text-blue-700 border border-blue-100/50", activeBg: "bg-blue-600 text-white" },
            { id: "OVERDUE", label: "Overdue Debts", count: countOverdue, bg: "bg-rose-50 text-rose-700 border border-rose-100/50", activeBg: "bg-rose-600 text-white animate-pulse" }
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none shadow-sm ${
                  isActive ? tab.activeBg : `${tab.bg} hover:brightness-95`
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black ${
                  isActive ? "bg-white/20 text-white" : "bg-black/5 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HORIZONTAL SCROLL CONTAINER TO PREVENT ELEMENTS HORIZONTAL OVERFLOW */}
      <div className="overflow-x-auto w-full select-none">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Ref No. / Airline</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Employee / Office</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100 text-center">Max Flights</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Destination & Flights</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Ticket Cost</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Loan Payable</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Balance</th>
              <th scope="col" className="px-4 py-3 border-b border-slate-100">Status</th>
              {(session.role === "AGENT" || session.role === "ADMIN") && (
                <th scope="col" className="px-4 py-3 text-right no-print border-b border-slate-100">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
            {paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400 font-medium">
                  {searchTerm || statusFilter !== "ALL"
                    ? "No records matched your active search and filter criteria."
                    : "No bookings created yet. Complete the form to register one."}
                </td>
              </tr>
            ) : (
              paginatedBookings.map((book) => {
                const loan = book.loan;
                const hasHistories = book.histories && book.histories.length > 0;
                const outstandingFlights = flightCountMap[book.employeeId] || 0;

                return (
                  <tr key={book.id} className="hover:bg-slate-50/50 transition-colors border-l-4 border-transparent hover:border-primary">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="block font-black text-slate-800 font-mono text-xs">{book.referenceNumber}</span>
                      <span className="block text-[10px] font-bold text-slate-400 mt-0.5">{book.airline.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-primary text-xs">{book.employee.fullName}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-black border ${
                          outstandingFlights >= maxActiveFlights 
                            ? "bg-rose-50 text-rose-700 border-rose-100" 
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`} title="Outstanding flights / limit">
                          {outstandingFlights}/{maxActiveFlights}
                        </span>
                      </div>
                      <span className="block text-[9px] font-black text-slate-400 mt-0.5 uppercase tracking-wide">{book.employee.office.name}</span>
                      {book.passengerName && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-50/70 border border-rose-200 px-2 py-0.5 rounded-lg shadow-xs leading-none">
                            🎫 Relative: {book.passengerName} ({book.passengerRelationship})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                      <span className={`inline-flex px-2 py-1 rounded text-xs ${
                        outstandingFlights >= maxActiveFlights 
                          ? "bg-rose-50 text-rose-700 border border-rose-100" 
                          : "bg-slate-50 text-slate-700 border border-slate-100"
                      }`}>
                        {outstandingFlights}/{maxActiveFlights}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block font-bold text-slate-700 text-xs">{book.destination}</span>
                      
                      {/* Separate Outbound and Inbound Trip Information */}
                      <div className="mt-1 space-y-0.5 text-[10px] font-medium text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="text-primary font-bold">🛫 Out:</span>
                          <span>
                            {new Date(book.travelDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {book.outboundTime && (
                            <span className="font-mono text-slate-400">
                              @{book.outboundTime}
                            </span>
                          )}
                        </div>

                        {book.tripType === "ROUND_TRIP" && book.returnDate && (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-800 font-bold">🛬 Ret:</span>
                            <span>
                              {new Date(book.returnDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            {book.returnTime && (
                              <span className="font-mono text-slate-400">
                                @{book.returnTime}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <span className={`inline-flex mt-1.5 px-1 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                        book.tripType === "ROUND_TRIP"
                          ? "bg-blue-50 text-blue-700 border-blue-200/50"
                          : "bg-slate-50 text-slate-600 border-slate-200/50"
                      }`}>
                        {book.tripType === "ROUND_TRIP" ? "🔄 Round-Trip" : "➡️ One-Way"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-600 whitespace-nowrap">
                      ₱{book.ticketCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      {book.serviceFee > 0 && (
                        <span className="block text-[9px] text-slate-400 font-normal mt-0.5">
                          + ₱{book.serviceFee} markup
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                      {loan ? (
                        <>
                          <span className="block font-bold text-primary">
                            ₱{loan.totalAmountPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="block text-[9px] text-slate-400 mt-0.5 font-medium">
                            ₱{loan.monthlyInstallment.toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo ({Math.round(loan.totalAmountPayable / loan.monthlyInstallment)}m)
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium">No Loan</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {loan ? `₱${loan.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        {loan && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                              loan.status === "ACTIVE"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : loan.status === "FULLY_PAID"
                                ? "bg-success-light text-success border-success-light"
                                : "bg-danger-light text-danger border-danger-light animate-pulse"
                            }`}
                          >
                            {loan.status}
                          </span>
                        )}
                        {hasHistories && (
                          <button
                            onClick={() => handleOpenHistory(book)}
                            type="button"
                            className="block text-[8px] font-black text-amber-600 uppercase bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-center w-max cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                            title="Click to view full rebooking history log"
                          >
                            🔄 Rebooked ({book.histories.length})
                          </button>
                        )}
                      </div>
                    </td>
                    {(session.role === "AGENT" || session.role === "ADMIN") && (() => {
                      const travelDateObj = new Date(book.travelDate);
                      const returnDateObj = book.returnDate ? new Date(book.returnDate) : null;
                      const targetDate = returnDateObj && returnDateObj > travelDateObj ? returnDateObj : travelDateObj;
                      const isExpired = targetDate < new Date();

                      return (
                        <td className="px-4 py-3.5 text-right no-print space-x-1 whitespace-nowrap">
                          {isExpired ? (
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg select-none inline-block">
                              Flight Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenEdit(book)}
                              className="text-primary hover:text-primary-hover font-bold text-[10px] transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 border border-slate-200 cursor-pointer inline-block"
                            >
                              Rebook
                            </button>
                          )}
                          <DeleteButton
                            id={book.id}
                            action={cancelBookingAction}
                            label="🗑️ Archive"
                            className="text-danger hover:text-danger/90 font-bold text-[10px] transition-colors py-1 px-2 rounded-lg hover:bg-rose-50 border border-rose-200 cursor-pointer inline-block disabled:opacity-50"
                            confirmMessage={`Are you sure you want to archive booking reference "${book.referenceNumber}"? This will move the booking and its associated loan to the archived trashbin.`}
                          />
                        </td>
                      );
                    })()}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Stateful Client-Side Pagination controls */}
      {totalRecords > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <div>
            Showing <span className="text-slate-800 font-black">{(activePage - 1) * pageSize + 1}</span> to{" "}
            <span className="text-slate-800 font-black">{Math.min(activePage * pageSize, totalRecords)}</span> of{" "}
            <span className="text-slate-800 font-black">{totalRecords}</span> entries
            {searchTerm && <span> (filtered from {countAll} total)</span>}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto select-none">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold shadow-sm"
            >
              &larr; Prev
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
                .map((page, idx, arr) => {
                  const isEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {isEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-7.5 h-7.5 flex items-center justify-center rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                          activePage === page
                            ? "bg-primary text-white border-primary"
                            : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={activePage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-bold shadow-sm"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Editing / Rebooking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Rebook Ticket / Edit Details
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reference Code: <span className="font-mono font-bold text-primary">{editingBooking.referenceNumber}</span>
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Error / Success Toast alerts */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold leading-relaxed">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-success-light border border-success-light text-success rounded-xl text-xs font-bold leading-relaxed">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              {/* Airline Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Partner Airline
                </label>
                <select
                  name="airlineId"
                  required
                  defaultValue={editingBooking.airlineId}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm bg-white"
                >
                  {airlines.map((air) => (
                    <option key={air.id} value={air.id}>
                      {air.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trip Type selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Trip Type / Flights Count (Uri ng Byahe)
                </label>
                <select
                  name="tripType"
                  required
                  value={editingBooking.tripType}
                  onChange={(e) => setEditingBooking({ ...editingBooking, tripType: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm bg-white font-semibold text-slate-700"
                >
                  <option value="ONE_WAY">One-Way (1 Flight)</option>
                  <option value="ROUND_TRIP">Round-Trip (2 Flights - Balikan)</option>
                  <option value="CONNECTING">Connecting Flight (2 Flights - Via)</option>
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Destination
                </label>
                <input
                  type="text"
                  name="destination"
                  required
                  autoComplete="off"
                  defaultValue={editingBooking.destination}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm"
                />
              </div>

              {/* Outbound Travel Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="block text-[11px] font-black text-primary uppercase tracking-widest">
                  🛫 Outbound (Papunta) Details
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      name="travelDate"
                      required
                      defaultValue={editingBooking.travelDate}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      name="outboundTime"
                      required
                      defaultValue={editingBooking.outboundTime}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Inbound (Round-Trip) or Connecting Travel Details */}
              {(editingBooking.tripType === "ROUND_TRIP" || editingBooking.tripType === "CONNECTING") && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 transition-all animate-fadeIn">
                  <span className="block text-[11px] font-black text-blue-800 uppercase tracking-widest">
                    {editingBooking.tripType === "ROUND_TRIP" ? "🛬 Return (Pabalik) Details" : "🛬 Connecting Leg Details (Layovers)"}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 uppercase">
                        Date (Petsa)
                      </label>
                      <input
                        type="date"
                        name="returnDate"
                        required
                        autoComplete="off"
                        defaultValue={editingBooking.returnDate}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 uppercase">
                        Time (Oras)
                      </label>
                      <input
                        type="time"
                        name="returnTime"
                        required
                        autoComplete="off"
                        defaultValue={editingBooking.returnTime}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ticket Cost & Standard Service Fee & Rebooking Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ticket Cost (₱)
                  </label>
                  <input
                    type="number"
                    name="ticketCost"
                    required
                    min="1"
                    step="0.01"
                    autoComplete="off"
                    value={editingBooking.ticketCost}
                    onChange={(e) => setEditingBooking({ ...editingBooking, ticketCost: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Service Fee / Markup
                  </label>
                  <div className="mt-1 block w-full rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-2.5 text-emerald-800 text-sm font-bold font-mono">
                    ₱{editingBooking.serviceFee?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider">
                    Rebooking Fee
                  </label>
                  <div className="mt-1 block w-full rounded-xl border border-amber-250 bg-amber-50 px-4 py-2.5 text-amber-800 text-sm font-bold font-mono">
                    ₱{(parseFloat(settings.rebooking_fee || "200.00")).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Calculated New Loan Total banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between text-blue-900">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-blue-700">Calculated Loan Total</span>
                  <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Ticket Cost + Service Fee + Rebooking Fee</p>
                </div>
                <span className="text-xl font-black font-mono">
                  ₱{(editingBooking.ticketCost + (editingBooking.serviceFee || 0) + parseFloat(settings.rebooking_fee || "200.00")).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Remarks / Change Reason
                </label>
                <textarea
                  name="remarks"
                  rows="2"
                  defaultValue={editingBooking.remarks}
                  placeholder="Reason for rebooking..."
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm"
                />
              </div>

              {/* Rebooking History logs */}
              {editingBooking.histories.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <span className="block text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg mb-2">
                    🔄 Rebooking / Edit Log History ({editingBooking.histories.length})
                  </span>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {editingBooking.histories.map((hist) => (
                      <div key={hist.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] space-y-0.5">
                        <p className="font-semibold text-slate-700 leading-relaxed">{hist.changeLog}</p>
                        <p className="text-slate-400 font-mono text-[9px]">
                          Updated by {hist.updatedBy} on {new Date(hist.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Save Changes (Rebook)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rebooking History Details modal */}
      {historyBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>🔄 Rebooking & Change History Logs</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reference Code: <span className="font-mono font-bold text-primary">{historyBooking.referenceNumber}</span> &bull; Employee: <span className="font-bold text-slate-700">{historyBooking.employee.fullName}</span>
                </p>
              </div>
              <button
                onClick={handleCloseHistory}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {historyBooking.histories.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No change history logged.</p>
              ) : (
                historyBooking.histories.map((hist, idx) => (
                  <div key={hist.id} className="relative pl-6 pb-2 border-l border-slate-200 last:border-0 last:pb-0">
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
                    <div className="p-4 bg-amber-50/20 hover:bg-amber-50/40 border border-amber-100/50 rounded-xl space-y-2.5 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <span className="font-black text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full text-[10px]">
                          Revision #{historyBooking.histories.length - idx}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          📅 {new Date(hist.createdAt).toLocaleString()} &bull; 👤 By {hist.updatedBy}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-750 font-medium leading-relaxed bg-white border border-slate-100 p-3 rounded-lg space-y-1">
                        <p className="font-bold text-slate-800 mb-1 text-[10px] uppercase tracking-wider text-slate-400">Details of Modifications:</p>
                        {hist.changeLog.includes("modified:") ? (
                          hist.changeLog.split("modified:")[1].split(";").map((change, cIdx) => (
                            <div key={cIdx} className="flex items-center gap-1.5 pl-2 py-0.5 border-l-2 border-amber-300">
                              <span className="font-semibold text-slate-850">{change.trim()}</span>
                            </div>
                          ))
                        ) : (
                          <p>{hist.changeLog}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleCloseHistory}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Close History Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
