/**
 * Dynamic Late Penalty Calculation Helper
 * Business Rule:
 * 1. Uses the interest rate LOCKED on the specific Loan record at booking time (e.g., loan.interestRate = 1.00%).
 * 2. If Admin changes the default system rate in Settings, PAST BOOKINGS RETAIN THEIR LOCKED RATE (contractual protection).
 * 3. ONLY NEW BOOKINGS inherit the new Admin rate.
 *
 * Math Logic:
 * Total Penalty = Principal Balance * (Locked Rate / 100) * Months Delayed
 */

export function getMonthsDelayed(dueDateInput, asOfDateInput = new Date()) {
  if (!dueDateInput) return 0;
  const dueDate = new Date(dueDateInput);
  const today = new Date(asOfDateInput);
  if (dueDate >= today) return 0;

  const sy = dueDate.getFullYear(), sm = dueDate.getMonth(), sd = dueDate.getDate();
  const ey = today.getFullYear(), em = today.getMonth(), ed = today.getDate();
  let monthsDelayed = (ey - sy) * 12 + (em - sm);
  if (ed > sd) monthsDelayed += 1;
  return Math.max(1, monthsDelayed);
}

export function calculateAccruedPenalty(loan, defaultRatePercent = 1, asOfDateInput = new Date()) {
  if (!loan || !loan.dueDate) return 0;
  const dueDate = new Date(loan.dueDate);
  const today = new Date(asOfDateInput);

  if (loan.status !== "OVERDUE" && dueDate >= today) {
    return 0;
  }

  // Contractual Lock: Use loan.interestRate if saved on record; fallback to defaultRatePercent if 0/null
  const rate = (loan.interestRate != null && loan.interestRate > 0)
    ? parseFloat(loan.interestRate)
    : (parseFloat(defaultRatePercent) || 1);

  const months = getMonthsDelayed(loan.dueDate, today);
  const remaining = loan.remainingBalance || 0;
  
  // Math: Principal * (Locked Rate %) * Months Delayed
  const penalty = remaining * (rate / 100) * months;
  return Math.round(penalty * 100) / 100;
}
