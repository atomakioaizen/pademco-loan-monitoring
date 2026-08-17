/**
 * Case-insensitive, punctuation-agnostic, and word-order-independent name matching.
 * Handles variations like:
 * - "Maria Santos" vs "MARIA SANTOS" vs "maria santos"
 * - "Santos, Maria" vs "Maria Santos" vs "Santos Maria"
 * - "Juan Dela Cruz" vs "dela cruz, juan"
 */
export function isSamePersonName(name1, name2) {
  if (!name1 || !name2) return false;

  // Normalize: lowercase, remove punctuation (commas/dots/dashes/quotes), collapse whitespace
  const clean1 = String(name1)
    .toLowerCase()
    .replace(/['"`,.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const clean2 = String(name2)
    .toLowerCase()
    .replace(/['"`,.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean1 === clean2) return true;

  // Split into unique sorted word tokens
  const words1 = clean1.split(" ").filter(Boolean).sort();
  const words2 = clean2.split(" ").filter(Boolean).sort();

  if (words1.length !== words2.length) return false;

  return words1.join(" ") === words2.join(" ");
}

/**
 * Checks if a name matches any existing User name or Employee fullName in the database.
 * Returns the matching existing name if found, or null if unique.
 */
export function findExistingMatchingName(inputName, allUsers = [], allEmployees = [], excludeUserId = null, excludeEmployeeId = null) {
  if (!inputName) return null;

  for (const u of allUsers) {
    if (excludeUserId && u.id === excludeUserId) continue;
    if (u.name && isSamePersonName(inputName, u.name)) {
      return u.name;
    }
  }

  for (const e of allEmployees) {
    if (excludeEmployeeId && e.id === excludeEmployeeId) continue;
    if (e.fullName && isSamePersonName(inputName, e.fullName)) {
      return e.fullName;
    }
  }

  return null;
}
