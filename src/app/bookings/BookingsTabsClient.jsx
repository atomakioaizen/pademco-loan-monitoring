"use client";

import React, { useState } from "react";
import BookingTableClient from "./BookingTableClient";
import BookingFormClient from "./BookingFormClient";

export default function BookingsTabsClient({
  bookings,
  airlines,
  session,
  maxActiveFlights,
  cancelBookingAction,
  updateBookingAction,
  employees,
  settings,
  createBookingAction,
}) {
  // Default to "FORM" (Book Airline Ticket) tab as requested by the user
  const [activeTab, setActiveTab] = useState("FORM"); // "FORM" | "LEDGER"

  const showFormOption = session.role === "AGENT" || session.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Tab Switcher: "Book Airline Ticket" is first, "Loan & Booking Ledgers Console" is second */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2 rounded-2xl shadow-sm border select-none">
        {showFormOption && (
          <button
            onClick={() => setActiveTab("FORM")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
              activeTab === "FORM"
                ? "bg-white text-primary border-slate-250 shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
            }`}
          >
            <span className="text-base">✈️</span>
            <span>Book Airline Ticket</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer border select-none ${
            activeTab === "LEDGER"
              ? "bg-white text-primary border-slate-250 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-transparent"
          }`}
        >
          <span className="text-base">📊</span>
          <span>Loan & Booking Ledgers Console</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="w-full">
        {activeTab === "LEDGER" ? (
          <div className="w-full">
            <BookingTableClient
              bookings={bookings}
              airlines={airlines}
              session={session}
              maxActiveFlights={maxActiveFlights}
              cancelBookingAction={cancelBookingAction}
              updateBookingAction={updateBookingAction}
              settings={settings}
            />
          </div>
        ) : (
          showFormOption && (
            <div className="w-full">
              <BookingFormClient
                employees={employees}
                airlines={airlines}
                settings={settings}
                createBookingAction={createBookingAction}
                onSuccess={() => setActiveTab("LEDGER")} // Automatically redirect to ledger after successful booking
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
