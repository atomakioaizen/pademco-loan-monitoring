"use client";

import React, { useState } from "react";
import ExcelJS from "exceljs";

export default function ExportButton({ data, filename, headersMap, reportTitle, orgName, orgAddress }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) return;

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "PADEMCO Loan Monitoring System";
      workbook.lastModifiedBy = "PADEMCO System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Schedule of Unpaid Tickets", {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: "landscape", fitToPage: true },
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // ─── 1. REPORT HEADER BLOCK ──────────────────────────────────────────────
      const titleRow1 = worksheet.addRow([orgName || "PALAWAN DENR EMPLOYEES MULTI-PURPOSE COOPERATIVE (PADEMCO)"]);
      titleRow1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF1E3A8A" } };

      const titleRow2 = worksheet.addRow([`SCHEDULE OF UNPAID TICKETS`]);
      titleRow2.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FF334155" } };

      const titleRow3 = worksheet.addRow([`Generated on ${dateStr} at ${timeStr} | Total Records: ${data.length}`]);
      titleRow3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };

      worksheet.addRow([]); // Blank spacer row

      // ─── 2. COLUMN HEADERS ───────────────────────────────────────────────────
      const keys = Object.keys(data[0]);
      const displayHeaders = headersMap ? keys.map((k) => headersMap[k] || k) : keys;

      const headerRow = worksheet.addRow(displayHeaders);
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E3A8A" }, // Dark Navy Blue
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "medium", color: { argb: "FF0F172A" } },
          left: { style: "thin", color: { argb: "FF94A3B8" } },
          bottom: { style: "medium", color: { argb: "FF0F172A" } },
          right: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      });

      // Currency field keys for formatting
      const currencyKeys = new Set([
        "DR", "MARK UP", "TOTAL AMOUNT OF TICKET", "PENALTY", 
        "MARK UP (Payment)", 
        "Baggage", "Ticket Purchased", "TOTAL AMOUNT", "UNPAID BALANCE",
        "Ticket Cost", "Coop Fee", "Total Advanced", "Coop Interest/Profit",
        "Total Payable", "Outstanding Balance", "Principal Cost", "Coop Profit Earned",
        "Amount Paid", "Principal"
      ]);

      // Initialize totals for footer
      const totalsMap = {};
      keys.forEach((k) => { totalsMap[k] = 0; });

      // ─── 3. DATA ROWS WITH STYLING & BORDERS ────────────────────────────────
      data.forEach((rowObj, rowIndex) => {
        const rowValues = keys.map((k) => rowObj[k] ?? "");
        const row = worksheet.addRow(rowValues);
        row.height = 20;

        const isEven = rowIndex % 2 === 0;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const key = keys[colNumber - 1];
          const val = rowObj[key];

          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          // Apply number / currency formatting
          if (currencyKeys.has(key) && typeof val === "number") {
            cell.value = val;
            cell.numFmt = '₱#,##0.00;[Red](₱#,##0.00);"-"';
            cell.alignment = { vertical: "middle", horizontal: "right" };
            totalsMap[key] += val;
          } else if (typeof val === "number") {
            cell.value = val;
            cell.alignment = { vertical: "middle", horizontal: "right" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: key === "DATE" || key === "OR NO." || key === "DATE PAYMENT" ? "center" : "left" };
          }

          // Special highlight for UNPAID BALANCE > 0
          if (key === "UNPAID BALANCE" && typeof val === "number" && val > 0) {
            cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFB91C1C" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
          }
        });
      });

      // ─── 4. GRAND TOTALS FOOTER ROW ─────────────────────────────────────────
      const footerValues = keys.map((k, idx) => {
        if (idx === 0) return "GRAND TOTALS";
        if (currencyKeys.has(k)) return totalsMap[k];
        return "";
      });

      const footerRow = worksheet.addRow(footerValues);
      footerRow.height = 24;

      footerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = keys[colNumber - 1];

        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" }, // Light Slate Gray fill
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF475569" } },
          left: { style: "thin", color: { argb: "CBD5E1" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } }, // Classic accounting double underline
          right: { style: "thin", color: { argb: "CBD5E1" } },
        };

        if (currencyKeys.has(key)) {
          cell.numFmt = '₱#,##0.00;[Red](₱#,##0.00);"-"';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else {
          cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "left" : "center" };
        }
      });

      // ─── 5. AUTO-FIT COLUMN WIDTHS ──────────────────────────────────────────
      worksheet.columns.forEach((column, colIdx) => {
        const key = keys[colIdx];
        let maxLen = displayHeaders[colIdx] ? displayHeaders[colIdx].toString().length : 12;

        data.forEach((row) => {
          const val = row[key];
          if (val !== null && val !== undefined) {
            const strLen = typeof val === "number" ? val.toFixed(2).length + 4 : val.toString().length;
            if (strLen > maxLen) maxLen = strLen;
          }
        });

        column.width = Math.max(maxLen + 4, 14);
      });

      // ─── 6. DOWNLOAD BINARY .XLSX FILE ──────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ? filename.replace(/\.csv$/, ".xlsx") : `Schedule_of_Unpaid_Tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const isEmpty = !data || data.length === 0;

  return (
    <button
      onClick={handleExport}
      type="button"
      disabled={isEmpty || isExporting}
      className={`inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl border transition-all shadow-sm cursor-pointer ${
        isEmpty
          ? "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
          : "text-emerald-800 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border-emerald-300 hover:shadow-md active:scale-95"
      }`}
      title={isEmpty ? "No data available to export" : "Download Premium Excel (.xlsx) Report with Borders & Formats"}
    >
      <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {isExporting ? "Generating Excel..." : isEmpty ? "No Data to Export" : "Export Premium Excel (.xlsx)"}
    </button>
  );
}
