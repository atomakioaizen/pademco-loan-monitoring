"use client";

import React, { useState, useRef } from "react";

export default function BookingFormClient({ employees, airlines, settings, createBookingAction, onSuccess }) {
  const [tripType, setTripType] = useState("ONE_WAY");
  const [ticketCost, setTicketCost] = useState("");
  const [termMonths, setTermMonths] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [isRelativeBooking, setIsRelativeBooking] = useState(false);
  const formRef = useRef(null);

  const serviceFee = settings?.service_fee ?? 500.00;
  const baseInterestRate = settings?.interest_rate ?? 1.00;
  const maxActiveFlights = settings?.max_active_flights ?? 4;
  const interestRatePercent = 0; // 0% interest in the first month

  // Dynamic values for premium preview
  const parsedCost = parseFloat(ticketCost) || 0;
  const principal = parsedCost > 0 ? parsedCost + serviceFee : 0;
  const interestAmount = 0; // 0% interest initially
  const totalPayable = principal;
  const monthlyInstallment = totalPayable;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    // Capture form data synchronously BEFORE the async gap
    // (e.currentTarget becomes null after React's event dispatch returns)
    const formData = new FormData(e.currentTarget);
    formData.append("serviceFee", String(serviceFee));
    formData.append("interestRate", "0");
    formData.append("interestType", "PERCENT");
    formData.append("termMonths", "1");

    try {
      const res = await createBookingAction(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess("Booking registered and loan account created successfully!");
        // Use the stable ref to reset the form (e.currentTarget is null here after await)
        if (formRef.current) {
          formRef.current.reset();
        }
        setTicketCost("");
        setTripType("ONE_WAY");
        setTermMonths(1);
        setSelectedEmpId("");
        setIsRelativeBooking(false);
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while creating booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-800">Book Airline Ticket Form</h3>
        <p className="text-xs text-slate-400 mt-1">
          Advances the ticket cost and automatically generates a loan account. Enter employee applicant and flight information below.
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

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        

        {/* SECTION 1: Applicant & Airline Booking Info */}
        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <span className="block text-[10px] font-black text-primary uppercase tracking-widest">
            1. Applicant & Airline Booking Info
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Employee Dropdown */}
            <div>
              <label htmlFor="employeeId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Employee Applicant
              </label>
              <select
                name="employeeId"
                id="employeeId"
                required
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-medium"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => {
                  const outstandingFlights = emp.outstandingFlights || 0;
                  const isLimitReached = outstandingFlights >= maxActiveFlights;
                  const isInactive = emp.status === "INACTIVE";
                  const isDisabled = isLimitReached || isInactive;
                  
                  let label = `${emp.fullName}`;
                  if (isInactive) {
                    label += " (Inactive)";
                  } else if (isLimitReached) {
                    label += ` ${outstandingFlights}/${maxActiveFlights} (Max Loans)`;
                  } else {
                    label += ` ${outstandingFlights}/${maxActiveFlights}`;
                  }

                  return (
                    <option
                      key={emp.id}
                      value={emp.id}
                      disabled={isDisabled}
                      className={isDisabled ? "text-rose-500 bg-rose-50 font-bold" : ""}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Partner Airline */}
            <div>
              <label htmlFor="airlineId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Partner Airline
              </label>
              <select
                name="airlineId"
                id="airlineId"
                required
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white"
              >
                <option value="">Select Airline</option>
                {airlines.map((air) => (
                  <option key={air.id} value={air.id}>
                    {air.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Ref Number */}
            <div>
              <label htmlFor="referenceNumber" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Booking Reference Number
              </label>
              <input
                type="text"
                name="referenceNumber"
                id="referenceNumber"
                required
                autoComplete="off"
                placeholder="e.g., PNR123456"
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
              />
            </div>
          </div>

          {/* Toggle option for Relative / Co-maker booking style */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4 select-none">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRelativeBooking"
                checked={isRelativeBooking}
                onChange={(e) => setIsRelativeBooking(e.target.checked)}
                className="h-5 w-5 rounded border-slate-350 text-primary focus:ring-primary/20 cursor-pointer"
              />
              <label htmlFor="isRelativeBooking" className="text-sm font-bold text-slate-800 cursor-pointer">
                🎫 Booking for a family member or relative?
              </label>
            </div>
            <p className="text-[10px] text-slate-400 max-w-sm font-medium leading-tight">
              Check this box if the ticket traveler is NOT the employee. The loan obligation remains legally bound under the Employee Applicant's profile.
            </p>
          </div>

          {isRelativeBooking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-blue-50/20 border border-blue-100 rounded-xl animate-fadeIn">
              <div>
                <label htmlFor="passengerName" className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                  Passenger's Full Name
                </label>
                <input
                  type="text"
                  name="passengerName"
                  id="passengerName"
                  required
                  autoComplete="off"
                  placeholder="e.g., Maria Dela Cruz"
                  className="mt-1.5 block w-full rounded-xl border border-slate-350 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm transition-all"
                />
              </div>
              <div>
                <label htmlFor="passengerRelationship" className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                  Relationship to Employee Borrower
                </label>
                <select
                  name="passengerRelationship"
                  id="passengerRelationship"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-slate-350 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm transition-all bg-white"
                >
                  <option value="">Select Relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {(() => {
            const selectedEmployee = employees.find((emp) => emp.id === selectedEmpId);
            if (!selectedEmployee) return null;
            
            return (
              <div className="bg-gradient-to-br from-blue-50/70 to-slate-50/50 p-4 rounded-xl border border-blue-100/50 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-blue-100/50 pb-2">
                  <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center gap-1">
                    ✈️ REGISTERED PASSENGER PROFILE {isRelativeBooking && "— (REPRESENTATIVE TICKET)"}
                  </span>
                  <div className="flex items-center gap-2">
                    {isRelativeBooking && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[8px] font-black uppercase tracking-widest">
                        🎫 Relative Passenger
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold uppercase tracking-wider font-mono">
                      {selectedEmployee.employeeId}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Borrower Employee</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Office Division</span>
                    <span className="font-semibold text-slate-700">{selectedEmployee.office?.name || "DENR"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Birth Date</span>
                    <span className="font-semibold text-slate-700">
                      {selectedEmployee.birthDate ? (
                        <>
                          {new Date(selectedEmployee.birthDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Not registered</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                    <span className="font-semibold text-slate-700">{selectedEmployee.gender || <span className="text-slate-400 italic">Not registered</span>}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Number</span>
                    <span className="font-semibold text-slate-700 font-mono text-[11px]">{selectedEmployee.contactNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <span className="font-semibold text-slate-700 truncate block">{selectedEmployee.email || <span className="text-slate-400 italic">Not registered</span>}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* SECTION 2: Flight Route & Schedule details */}
        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <span className="block text-[10px] font-black text-primary uppercase tracking-widest">
            2. Flight Route & Schedule details
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Trip Type Dropdown */}
            <div>
              <label htmlFor="tripType" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Trip Type / Flights
              </label>
              <select
                name="tripType"
                id="tripType"
                value={tripType}
                onChange={(e) => {
                  setTripType(e.target.value);
                }}
                required
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-bold text-slate-700 cursor-pointer"
              >
                <option value="ONE_WAY">One-Way (1 Flight)</option>
                <option value="ROUND_TRIP">Round-Trip (2 Flights)</option>
                <option value="CONNECTING">Connecting Flight (2 Flights)</option>
              </select>
            </div>

            {/* Departure Destination Route */}
            <div>
              <label htmlFor="destination" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Departure Route
              </label>
              <select
                name="destination"
                id="destination"
                required
                onChange={(e) => {
                  const val = e.target.value;
                  // Handle Round-Trip Auto-Reversal
                  if (tripType === "ROUND_TRIP") {
                    const reverseRoutes = {
                      // Manila hub
                      "Manila (MNL) to Palawan (PPS)": "Palawan (PPS) to Manila (MNL)",
                      "Palawan (PPS) to Manila (MNL)": "Manila (MNL) to Palawan (PPS)",
                      "Manila (MNL) to Cebu (CEB)": "Cebu (CEB) to Manila (MNL)",
                      "Cebu (CEB) to Manila (MNL)": "Manila (MNL) to Cebu (CEB)",
                      "Manila (MNL) to Davao (DVO)": "Davao (DVO) to Manila (MNL)",
                      "Davao (DVO) to Manila (MNL)": "Manila (MNL) to Davao (DVO)",
                      "Manila (MNL) to Iloilo (ILO)": "Iloilo (ILO) to Manila (MNL)",
                      "Iloilo (ILO) to Manila (MNL)": "Manila (MNL) to Iloilo (ILO)",
                      "Manila (MNL) to Bacolod (BCD)": "Bacolod (BCD) to Manila (MNL)",
                      "Bacolod (BCD) to Manila (MNL)": "Manila (MNL) to Bacolod (BCD)",
                      "Manila (MNL) to Zamboanga (ZAM)": "Zamboanga (ZAM) to Manila (MNL)",
                      "Zamboanga (ZAM) to Manila (MNL)": "Manila (MNL) to Zamboanga (ZAM)",
                      "Manila (MNL) to General Santos (GES)": "General Santos (GES) to Manila (MNL)",
                      "General Santos (GES) to Manila (MNL)": "Manila (MNL) to General Santos (GES)",
                      "Manila (MNL) to Cagayan de Oro (CGY)": "Cagayan de Oro (CGY) to Manila (MNL)",
                      "Cagayan de Oro (CGY) to Manila (MNL)": "Manila (MNL) to Cagayan de Oro (CGY)",
                      "Manila (MNL) to Butuan (BXU)": "Butuan (BXU) to Manila (MNL)",
                      "Butuan (BXU) to Manila (MNL)": "Manila (MNL) to Butuan (BXU)",
                      "Manila (MNL) to Tacloban (TAC)": "Tacloban (TAC) to Manila (MNL)",
                      "Tacloban (TAC) to Manila (MNL)": "Manila (MNL) to Tacloban (TAC)",
                      "Manila (MNL) to Kalibo (KLO)": "Kalibo (KLO) to Manila (MNL)",
                      "Kalibo (KLO) to Manila (MNL)": "Manila (MNL) to Kalibo (KLO)",
                      "Manila (MNL) to Legazpi (LGP)": "Legazpi (LGP) to Manila (MNL)",
                      "Legazpi (LGP) to Manila (MNL)": "Manila (MNL) to Legazpi (LGP)",
                      "Manila (MNL) to Tuguegarao (TUG)": "Tuguegarao (TUG) to Manila (MNL)",
                      "Tuguegarao (TUG) to Manila (MNL)": "Manila (MNL) to Tuguegarao (TUG)",
                      "Manila (MNL) to Cauayan / Isabela (CYZ)": "Cauayan / Isabela (CYZ) to Manila (MNL)",
                      "Cauayan / Isabela (CYZ) to Manila (MNL)": "Manila (MNL) to Cauayan / Isabela (CYZ)",
                      "Manila (MNL) to Naga (WNP)": "Naga (WNP) to Manila (MNL)",
                      "Naga (WNP) to Manila (MNL)": "Manila (MNL) to Naga (WNP)",
                      "Manila (MNL) to Ozamiz (OZC)": "Ozamiz (OZC) to Manila (MNL)",
                      "Ozamiz (OZC) to Manila (MNL)": "Manila (MNL) to Ozamiz (OZC)",
                      "Manila (MNL) to Pagadian (PAG)": "Pagadian (PAG) to Manila (MNL)",
                      "Pagadian (PAG) to Manila (MNL)": "Manila (MNL) to Pagadian (PAG)",
                      // Cebu hub
                      "Cebu (CEB) to Davao (DVO)": "Davao (DVO) to Cebu (CEB)",
                      "Davao (DVO) to Cebu (CEB)": "Cebu (CEB) to Davao (DVO)",
                      "Cebu (CEB) to Palawan (PPS)": "Palawan (PPS) to Cebu (CEB)",
                      "Palawan (PPS) to Cebu (CEB)": "Cebu (CEB) to Palawan (PPS)",
                      "Cebu (CEB) to Iloilo (ILO)": "Iloilo (ILO) to Cebu (CEB)",
                      "Iloilo (ILO) to Cebu (CEB)": "Cebu (CEB) to Iloilo (ILO)",
                      "Cebu (CEB) to Tacloban (TAC)": "Tacloban (TAC) to Cebu (CEB)",
                      "Tacloban (TAC) to Cebu (CEB)": "Cebu (CEB) to Tacloban (TAC)",
                      "Cebu (CEB) to Zamboanga (ZAM)": "Zamboanga (ZAM) to Cebu (CEB)",
                      "Zamboanga (ZAM) to Cebu (CEB)": "Cebu (CEB) to Zamboanga (ZAM)",
                    };
                    const rev = reverseRoutes[val] || "";
                    const returnEl = document.getElementById("returnDestination");
                    if (returnEl) returnEl.value = rev;
                  }
                }}
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white font-bold cursor-pointer"
              >
                <option value="">Select Departure Sector</option>
                <optgroup label="━━ From Manila (MNL) ━━">
                  <option value="Manila (MNL) to Palawan (PPS)">Manila (MNL) to Palawan (PPS)</option>
                  <option value="Manila (MNL) to Cebu (CEB)">Manila (MNL) to Cebu (CEB)</option>
                  <option value="Manila (MNL) to Davao (DVO)">Manila (MNL) to Davao (DVO)</option>
                  <option value="Manila (MNL) to Iloilo (ILO)">Manila (MNL) to Iloilo (ILO)</option>
                  <option value="Manila (MNL) to Bacolod (BCD)">Manila (MNL) to Bacolod (BCD)</option>
                  <option value="Manila (MNL) to Cagayan de Oro (CGY)">Manila (MNL) to Cagayan de Oro (CGY)</option>
                  <option value="Manila (MNL) to Butuan (BXU)">Manila (MNL) to Butuan (BXU)</option>
                  <option value="Manila (MNL) to Zamboanga (ZAM)">Manila (MNL) to Zamboanga (ZAM)</option>
                  <option value="Manila (MNL) to General Santos (GES)">Manila (MNL) to General Santos (GES)</option>
                  <option value="Manila (MNL) to Tacloban (TAC)">Manila (MNL) to Tacloban (TAC)</option>
                  <option value="Manila (MNL) to Kalibo (KLO)">Manila (MNL) to Kalibo (KLO)</option>
                  <option value="Manila (MNL) to Legazpi (LGP)">Manila (MNL) to Legazpi (LGP)</option>
                  <option value="Manila (MNL) to Tuguegarao (TUG)">Manila (MNL) to Tuguegarao (TUG)</option>
                  <option value="Manila (MNL) to Cauayan / Isabela (CYZ)">Manila (MNL) to Cauayan / Isabela (CYZ)</option>
                  <option value="Manila (MNL) to Naga (WNP)">Manila (MNL) to Naga (WNP)</option>
                  <option value="Manila (MNL) to Ozamiz (OZC)">Manila (MNL) to Ozamiz (OZC)</option>
                  <option value="Manila (MNL) to Pagadian (PAG)">Manila (MNL) to Pagadian (PAG)</option>
                </optgroup>
                <optgroup label="━━ To Manila (MNL) ━━">
                  <option value="Palawan (PPS) to Manila (MNL)">Palawan (PPS) to Manila (MNL)</option>
                  <option value="Cebu (CEB) to Manila (MNL)">Cebu (CEB) to Manila (MNL)</option>
                  <option value="Davao (DVO) to Manila (MNL)">Davao (DVO) to Manila (MNL)</option>
                  <option value="Iloilo (ILO) to Manila (MNL)">Iloilo (ILO) to Manila (MNL)</option>
                  <option value="Bacolod (BCD) to Manila (MNL)">Bacolod (BCD) to Manila (MNL)</option>
                  <option value="Cagayan de Oro (CGY) to Manila (MNL)">Cagayan de Oro (CGY) to Manila (MNL)</option>
                  <option value="Butuan (BXU) to Manila (MNL)">Butuan (BXU) to Manila (MNL)</option>
                  <option value="Zamboanga (ZAM) to Manila (MNL)">Zamboanga (ZAM) to Manila (MNL)</option>
                  <option value="General Santos (GES) to Manila (MNL)">General Santos (GES) to Manila (MNL)</option>
                  <option value="Tacloban (TAC) to Manila (MNL)">Tacloban (TAC) to Manila (MNL)</option>
                  <option value="Kalibo (KLO) to Manila (MNL)">Kalibo (KLO) to Manila (MNL)</option>
                  <option value="Legazpi (LGP) to Manila (MNL)">Legazpi (LGP) to Manila (MNL)</option>
                  <option value="Tuguegarao (TUG) to Manila (MNL)">Tuguegarao (TUG) to Manila (MNL)</option>
                  <option value="Cauayan / Isabela (CYZ) to Manila (MNL)">Cauayan / Isabela (CYZ) to Manila (MNL)</option>
                  <option value="Naga (WNP) to Manila (MNL)">Naga (WNP) to Manila (MNL)</option>
                  <option value="Ozamiz (OZC) to Manila (MNL)">Ozamiz (OZC) to Manila (MNL)</option>
                  <option value="Pagadian (PAG) to Manila (MNL)">Pagadian (PAG) to Manila (MNL)</option>
                </optgroup>
                <optgroup label="━━ Cebu (CEB) Hub ━━">
                  <option value="Cebu (CEB) to Davao (DVO)">Cebu (CEB) to Davao (DVO)</option>
                  <option value="Davao (DVO) to Cebu (CEB)">Davao (DVO) to Cebu (CEB)</option>
                  <option value="Cebu (CEB) to Palawan (PPS)">Cebu (CEB) to Palawan (PPS)</option>
                  <option value="Palawan (PPS) to Cebu (CEB)">Palawan (PPS) to Cebu (CEB)</option>
                  <option value="Cebu (CEB) to Iloilo (ILO)">Cebu (CEB) to Iloilo (ILO)</option>
                  <option value="Iloilo (ILO) to Cebu (CEB)">Iloilo (ILO) to Cebu (CEB)</option>
                  <option value="Cebu (CEB) to Tacloban (TAC)">Cebu (CEB) to Tacloban (TAC)</option>
                  <option value="Tacloban (TAC) to Cebu (CEB)">Tacloban (TAC) to Cebu (CEB)</option>
                  <option value="Cebu (CEB) to Zamboanga (ZAM)">Cebu (CEB) to Zamboanga (ZAM)</option>
                  <option value="Zamboanga (ZAM) to Cebu (CEB)">Zamboanga (ZAM) to Cebu (CEB)</option>
                </optgroup>
              </select>
            </div>

            {/* Departure Dates & Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="travelDate" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  🛫 Date
                </label>
                <input
                  type="date"
                  name="travelDate"
                  id="travelDate"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white"
                />
              </div>
              <div>
                <label htmlFor="outboundTime" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  🛫 Time
                </label>
                <input
                  type="time"
                  name="outboundTime"
                  id="outboundTime"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all bg-white"
                />
              </div>
            </div>
          </div>

          {/* Conditional Second Leg Details (Round-Trip or Connecting) */}
          {(tripType === "ROUND_TRIP" || tripType === "CONNECTING") && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 bg-blue-50/30 border border-blue-100 rounded-xl animate-fadeIn">
              {/* Return or Connecting Destination Selection */}
              <div>
                <label htmlFor="returnDestination" className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                  {tripType === "ROUND_TRIP" ? "🔄 Return Route" : "🔄 Connecting Leg Route"}
                </label>
                <select
                  name="returnDestination"
                  id="returnDestination"
                  required
                  className="mt-1.5 block w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm transition-all font-bold cursor-pointer"
                >
                  <option value="">Select Route Sector</option>
                  <optgroup label="━━ From Manila (MNL) ━━">
                    <option value="Manila (MNL) to Palawan (PPS)">Manila (MNL) to Palawan (PPS)</option>
                    <option value="Manila (MNL) to Cebu (CEB)">Manila (MNL) to Cebu (CEB)</option>
                    <option value="Manila (MNL) to Davao (DVO)">Manila (MNL) to Davao (DVO)</option>
                    <option value="Manila (MNL) to Iloilo (ILO)">Manila (MNL) to Iloilo (ILO)</option>
                    <option value="Manila (MNL) to Bacolod (BCD)">Manila (MNL) to Bacolod (BCD)</option>
                    <option value="Manila (MNL) to Cagayan de Oro (CGY)">Manila (MNL) to Cagayan de Oro (CGY)</option>
                    <option value="Manila (MNL) to Butuan (BXU)">Manila (MNL) to Butuan (BXU)</option>
                    <option value="Manila (MNL) to Zamboanga (ZAM)">Manila (MNL) to Zamboanga (ZAM)</option>
                    <option value="Manila (MNL) to General Santos (GES)">Manila (MNL) to General Santos (GES)</option>
                    <option value="Manila (MNL) to Tacloban (TAC)">Manila (MNL) to Tacloban (TAC)</option>
                    <option value="Manila (MNL) to Kalibo (KLO)">Manila (MNL) to Kalibo (KLO)</option>
                    <option value="Manila (MNL) to Legazpi (LGP)">Manila (MNL) to Legazpi (LGP)</option>
                    <option value="Manila (MNL) to Tuguegarao (TUG)">Manila (MNL) to Tuguegarao (TUG)</option>
                    <option value="Manila (MNL) to Cauayan / Isabela (CYZ)">Manila (MNL) to Cauayan / Isabela (CYZ)</option>
                    <option value="Manila (MNL) to Naga (WNP)">Manila (MNL) to Naga (WNP)</option>
                    <option value="Manila (MNL) to Ozamiz (OZC)">Manila (MNL) to Ozamiz (OZC)</option>
                    <option value="Manila (MNL) to Pagadian (PAG)">Manila (MNL) to Pagadian (PAG)</option>
                  </optgroup>
                  <optgroup label="━━ To Manila (MNL) ━━">
                    <option value="Palawan (PPS) to Manila (MNL)">Palawan (PPS) to Manila (MNL)</option>
                    <option value="Cebu (CEB) to Manila (MNL)">Cebu (CEB) to Manila (MNL)</option>
                    <option value="Davao (DVO) to Manila (MNL)">Davao (DVO) to Manila (MNL)</option>
                    <option value="Iloilo (ILO) to Manila (MNL)">Iloilo (ILO) to Manila (MNL)</option>
                    <option value="Bacolod (BCD) to Manila (MNL)">Bacolod (BCD) to Manila (MNL)</option>
                    <option value="Cagayan de Oro (CGY) to Manila (MNL)">Cagayan de Oro (CGY) to Manila (MNL)</option>
                    <option value="Butuan (BXU) to Manila (MNL)">Butuan (BXU) to Manila (MNL)</option>
                    <option value="Zamboanga (ZAM) to Manila (MNL)">Zamboanga (ZAM) to Manila (MNL)</option>
                    <option value="General Santos (GES) to Manila (MNL)">General Santos (GES) to Manila (MNL)</option>
                    <option value="Tacloban (TAC) to Manila (MNL)">Tacloban (TAC) to Manila (MNL)</option>
                    <option value="Kalibo (KLO) to Manila (MNL)">Kalibo (KLO) to Manila (MNL)</option>
                    <option value="Legazpi (LGP) to Manila (MNL)">Legazpi (LGP) to Manila (MNL)</option>
                    <option value="Tuguegarao (TUG) to Manila (MNL)">Tuguegarao (TUG) to Manila (MNL)</option>
                    <option value="Cauayan / Isabela (CYZ) to Manila (MNL)">Cauayan / Isabela (CYZ) to Manila (MNL)</option>
                    <option value="Naga (WNP) to Manila (MNL)">Naga (WNP) to Manila (MNL)</option>
                    <option value="Ozamiz (OZC) to Manila (MNL)">Ozamiz (OZC) to Manila (MNL)</option>
                    <option value="Pagadian (PAG) to Manila (MNL)">Pagadian (PAG) to Manila (MNL)</option>
                  </optgroup>
                  <optgroup label="━━ Cebu (CEB) Hub ━━">
                    <option value="Cebu (CEB) to Davao (DVO)">Cebu (CEB) to Davao (DVO)</option>
                    <option value="Davao (DVO) to Cebu (CEB)">Davao (DVO) to Cebu (CEB)</option>
                    <option value="Cebu (CEB) to Palawan (PPS)">Cebu (CEB) to Palawan (PPS)</option>
                    <option value="Palawan (PPS) to Cebu (CEB)">Palawan (PPS) to Cebu (CEB)</option>
                    <option value="Cebu (CEB) to Iloilo (ILO)">Cebu (CEB) to Iloilo (ILO)</option>
                    <option value="Iloilo (ILO) to Cebu (CEB)">Iloilo (ILO) to Cebu (CEB)</option>
                    <option value="Cebu (CEB) to Tacloban (TAC)">Cebu (CEB) to Tacloban (TAC)</option>
                    <option value="Tacloban (TAC) to Cebu (CEB)">Tacloban (TAC) to Cebu (CEB)</option>
                    <option value="Cebu (CEB) to Zamboanga (ZAM)">Cebu (CEB) to Zamboanga (ZAM)</option>
                    <option value="Zamboanga (ZAM) to Cebu (CEB)">Zamboanga (ZAM) to Cebu (CEB)</option>
                  </optgroup>
                </select>
              </div>

              {/* Second Leg dates and times */}
              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div>
                  <label htmlFor="returnDate" className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                    🛬 Date
                  </label>
                  <input
                    type="date"
                    name="returnDate"
                    id="returnDate"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="returnTime" className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                    🛬 Time
                  </label>
                  <input
                    type="time"
                    name="returnTime"
                    id="returnTime"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900 text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Ticket Fare & Loan Terms */}
        <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-4">
          <span className="block text-[10px] font-black text-primary uppercase tracking-widest">
            3. Ticket Fare & Loan Terms
          </span>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Ticket Cost */}
            <div>
              <label htmlFor="ticketCost" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ticket Cost
              </label>
              <input
                type="number"
                name="ticketCost"
                id="ticketCost"
                required
                min="1"
                step="0.01"
                autoComplete="off"
                placeholder="0.00"
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
              />
            </div>

            {/* Service Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cooperative Markup / Fee (Surcharge)
              </label>
              <div className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2.5 text-slate-600 text-sm font-bold font-mono">
                ₱{serviceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label htmlFor="remarks" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Booking Notes / Remarks
              </label>
              <input
                type="text"
                name="remarks"
                id="remarks"
                autoComplete="off"
                placeholder="e.g. Booking class, contact number..."
                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Dynamic Loan Breakdown & Submission Dashboard (Full Horizontal Screen space) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center bg-slate-50 border border-slate-200 p-6 rounded-2xl">
          {/* Left Column: Horizontal Loan Summary Breakdown */}
          <div className="lg:col-span-2 space-y-2 select-none">
            <span className="block text-[10px] font-black text-slate-505 uppercase tracking-widest">
              💵 Live Loan Accounts Calculation Preview
            </span>
            {parsedCost > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Principal Loan</span>
                  <span className="block font-bold text-slate-800 text-[13px] mt-0.5">
                    ₱{principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl relative group">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Penalty (1%/mo late)</span>
                  <span className="block font-bold text-rose-600 text-[13px] mt-0.5">
                    ₱{(principal * 0.01).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Total Payable</span>
                  <span className="block font-bold text-primary text-[13px] mt-0.5">
                    ₱{totalPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white border border-emerald-200 bg-emerald-50/20 p-2.5 rounded-xl">
                  <span className="block text-[8px] font-bold text-emerald-800 uppercase">Monthly Payment</span>
                  <span className="block font-black text-emerald-700 text-[13px] mt-0.5">
                    ₱{monthlyInstallment.toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic font-medium pt-1.5">
                Enter ticket cost above to view monthly payment preview.
              </p>
            )}
          </div>

          {/* Right Column: Submission Button */}
          <div className="self-end pt-2 lg:pt-0">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-slate-350 disabled:cursor-not-allowed text-white py-3.5 px-6 rounded-xl text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? "Registering Travel Ticket..." : "Book Airline Ticket & Create Loan"}</span>
              {!isSubmitting && <span className="text-base">✈️</span>}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

