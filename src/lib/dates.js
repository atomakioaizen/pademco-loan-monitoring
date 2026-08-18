/**
 * Calculates a due date that is exactly `businessDays` (default 30) working days
 * after `startDate`, excluding Saturdays and Sundays.
 * 
 * @param {Date|string} startDate 
 * @param {number} businessDays 
 * @returns {Date}
 */
export function calculateBusinessDaysDueDate(startDate = new Date(), businessDays = 30) {
  const currentDate = new Date(startDate);
  if (isNaN(currentDate.getTime())) {
    return new Date();
  }

  let daysAdded = 0;
  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

/**
 * Formats a date object or string into a human-readable Philippine format: "MMM DD, YYYY"
 * 
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDateReadable(dateInput) {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
