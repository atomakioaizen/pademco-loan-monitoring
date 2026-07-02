"use client";

export default function ExportButton({ data, filename, headersMap, reportTitle, orgName, orgAddress }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      return; // Silently do nothing — caller should disable button when no data
    }

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

    // Determine headers
    const keys = Object.keys(data[0]);
    const displayHeaders = headersMap ? keys.map((k) => headersMap[k] || k) : keys;

    const csvRows = [];

    // ─── Structured Report Header Block ───────────────────────────────────────
    csvRows.push(`"${orgName || "PADEMCO Multi-Purpose Cooperative"}"`);
    csvRows.push(`"${orgAddress || "Sta. Monica Penro Road, Puerto Princesa City, Palawan"}"`);
    csvRows.push(`"Report: ${reportTitle || filename || "Export"}"`);
    csvRows.push(`"Generated: ${dateStr} at ${timeStr}"`);
    csvRows.push(`"Total Records: ${data.length}"`);
    csvRows.push(""); // blank separator row

    // ─── Column Headers ────────────────────────────────────────────────────────
    csvRows.push(displayHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(","));

    // ─── Data Rows ─────────────────────────────────────────────────────────────
    for (const row of data) {
      const values = keys.map((key) => {
        let val = row[key];
        if (val === null || val === undefined) {
          val = "";
        } else if (val instanceof Date) {
          val = val.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } else {
          val = String(val);
        }
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename || "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isEmpty = !data || data.length === 0;

  return (
    <button
      onClick={handleExport}
      type="button"
      disabled={isEmpty}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all shadow-sm cursor-pointer ${
        isEmpty
          ? "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
          : "text-success hover:text-success-hover bg-success-light border-success/15 hover:shadow-md"
      }`}
      title={isEmpty ? "No data available to export" : "Export data to Excel / CSV format"}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {isEmpty ? "No Data to Export" : "Export to Excel"}
    </button>
  );
}
