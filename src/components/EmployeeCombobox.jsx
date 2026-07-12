"use client";

import React, { useState, useEffect, useRef } from "react";

export default function EmployeeCombobox({
  employees,
  value,
  onChange,
  placeholder = "Select Borrower",
  disabled = false,
  maxActiveFlights = 4,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const selectedEmp = employees.find((e) => e.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filtered = employees.filter((emp) => {
    const term = search.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(term) ||
      emp.employeeId.toLowerCase().includes(term) ||
      (emp.office?.name && emp.office.name.toLowerCase().includes(term))
    );
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-350 bg-white px-4 py-2.5 text-left text-slate-900 text-sm font-medium shadow-sm hover:border-slate-450 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer select-none"
      >
        {selectedEmp ? (
          <span className="truncate">
            {selectedEmp.fullName} 
            <span className="text-[10px] text-slate-400 font-semibold ml-2 font-mono">
              ({selectedEmp.employeeId})
            </span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-fadeIn max-h-80 flex flex-col overflow-hidden">
          {/* Search bar inside the dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Search borrower by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-250 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <span className="absolute left-2.5 top-2 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
          </div>

          {/* List down */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50 max-h-56">
            {filtered.length > 0 ? (
              filtered.map((emp) => {
                const outstandingFlights = emp.outstandingFlights || 0;
                const isLimitReached = emp.outstandingFlights !== undefined && emp.outstandingFlights >= maxActiveFlights;
                const isInactive = emp.status === "INACTIVE";
                const isDisabled = isLimitReached || isInactive;
                const isSelected = emp.id === value;

                let labelSuffix = "";
                if (isInactive) {
                  labelSuffix = " (Inactive)";
                } else if (emp.outstandingFlights !== undefined) {
                  labelSuffix = ` (${outstandingFlights} active)`;
                }

                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(emp.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-all flex flex-col gap-0.5 disabled:opacity-50 disabled:bg-rose-50/20 disabled:cursor-not-allowed ${
                      isSelected ? "bg-primary/5 border-l-4 border-primary pl-3" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between font-bold text-slate-800">
                      <span>{emp.fullName}{labelSuffix}</span>
                      {emp.hasOldLoan && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-150 border border-amber-250 text-amber-800 text-[8px] font-black uppercase tracking-wider font-mono scale-90">
                          ⚠️ Old Loan
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ID: {emp.employeeId} • {emp.office?.name || "DENR"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-xs text-slate-400 text-center italic">
                No borrowers found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
