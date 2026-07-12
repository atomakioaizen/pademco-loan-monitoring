"use client";

import { useState } from "react";

export default function OldLoanPaymentForm({ oldLoans, action, onSuccess }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOldLoanId, setSelectedOldLoanId] = useState("");
  const [paymentType, setPaymentType] = useState("FULL");
  const [amount, setAmount] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  const selectedLoan = oldLoans.find((ol) => ol.id === selectedOldLoanId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("oldLoanId", selectedOldLoanId);
      formData.append("receiptNumber", receiptNumber);
      formData.append("amount", amount);
      formData.append("paymentType", paymentType);
      formData.append("remarks", remarks);

      const res = await action(formData);

      if (res && res.error) {
        setError(res.error);
      } else {
        setSuccess(`✅ Old loan payment recorded successfully! OR# ${receiptNumber}`);
        setSelectedOldLoanId("");
        setAmount("");
        setReceiptNumber("");
        setRemarks("");
        setPaymentType("FULL");
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
      {/* Payment Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 space-y-5 self-start">
        <div>
          <h3 className="text-base font-black text-amber-800 flex items-center gap-2">
            <span>📋</span> Record Old Loan Payment
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cashier selects the borrower with an old loan and chooses full or partial settlement. Only cashiers can decide the payment type.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold animate-pulse">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Borrower Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Borrower (Old Loan)
            </label>
            <select
              required
              value={selectedOldLoanId}
              onChange={(e) => {
                setSelectedOldLoanId(e.target.value);
                setAmount("");
              }}
              className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 text-slate-900 text-sm transition-all bg-white"
            >
              <option value="">-- Select a borrower with old loan --</option>
              {oldLoans.map((ol) => (
                <option key={ol.id} value={ol.id}>
                  {ol.employeeName} — {ol.totalOldLoans} old loan(s) | {ol.employeeOffice}
                </option>
              ))}
            </select>
          </div>

          {/* Loan Summary Card */}
          {selectedLoan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-amber-900">Borrower:</span>
                <span className="font-mono text-amber-800">{selectedLoan.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-amber-900">Total Old Loans:</span>
                <span className="font-mono">{selectedLoan.totalOldLoans}</span>
              </div>
              {selectedLoan.estimatedAmount && (
                <div className="flex justify-between">
                  <span className="font-bold text-amber-900">Estimated Total:</span>
                  <span className="font-mono font-black">₱{selectedLoan.estimatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-amber-200 pt-2 mt-2">
                <span className="font-bold text-emerald-800">Total Paid So Far:</span>
                <span className="font-mono font-black text-emerald-700">₱{selectedLoan.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              {selectedLoan.estimatedAmount && (
                <div className="flex justify-between">
                  <span className="font-bold text-rose-800">Remaining Balance:</span>
                  <span className="font-mono font-black text-rose-700">
                    ₱{Math.max(0, selectedLoan.estimatedAmount - selectedLoan.totalPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {selectedLoan.payments.length > 0 && (
                <div className="border-t border-amber-200 pt-2">
                  <span className="font-bold text-amber-900 block mb-1">{selectedLoan.payments.length} previous payment(s)</span>
                  {selectedLoan.payments.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between text-[10px] text-amber-700">
                      <span>{p.paymentType} — OR# {p.receiptNumber}</span>
                      <span className="font-mono">₱{p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payment Type — Cashier decides */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Type (Cashier Decision)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("FULL")}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  paymentType === "FULL"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                }`}
              >
                ✅ Full Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("PARTIAL")}
                className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  paymentType === "PARTIAL"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                }`}
              >
                🔄 Partial Payment
              </button>
            </div>
            {paymentType === "PARTIAL" && (
              <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                ⚠️ Partial payments are allowed for old loans. Only full payments are required for regular ticket loans.
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount Paid (₱)
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 5000.00"
              className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
            />
          </div>

          {/* OR Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Official Receipt (OR) Number
            </label>
            <input
              type="text"
              required
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="e.g., OR-2024-00123"
              className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all font-mono"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !selectedOldLoanId}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
          >
            {loading ? "Processing..." : `Post ${paymentType === "FULL" ? "Full" : "Partial"} Payment →`}
          </button>
        </form>
      </div>

      {/* Old Loans List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden self-start">
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/50">
          <h3 className="text-sm font-black text-amber-900">Old Loan Registry</h3>
          <p className="text-xs text-slate-500 mt-0.5">{oldLoans.length} borrowers with pre-existing old loans</p>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {oldLoans.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm font-medium">
              No old loan records found.
            </div>
          ) : (
            oldLoans.map((ol) => (
              <div
                key={ol.id}
                onClick={() => setSelectedOldLoanId(ol.id)}
                className={`p-4 cursor-pointer transition-all hover:bg-amber-50 ${
                  selectedOldLoanId === ol.id ? "bg-amber-50 border-l-4 border-amber-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-slate-800">{ol.employeeName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{ol.employeeOffice}</p>
                  </div>
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    {ol.totalOldLoans} old loan(s)
                  </span>
                </div>
                {ol.estimatedAmount && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-slate-500">Est. Total: <span className="font-mono font-bold text-slate-700">₱{ol.estimatedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
                    <span className="text-emerald-700">Paid: <span className="font-mono font-bold">₱{ol.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
                  </div>
                )}
                <div className="mt-1 text-[10px] text-slate-400">
                  {ol.payments.length > 0 ? `${ol.payments.length} payment(s) recorded` : "No payments yet"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
