import { isSamePersonName, findExistingMatchingName } from "../src/lib/nameMatching.js";

console.log("--- TESTING NAME MATCHING UTILITY ---");

const testCases = [
  { a: "Maria Santos", b: "MARIA SANTOS", expected: true },
  { a: "Maria Santos", b: "maria santos", expected: true },
  { a: "Maria Santos", b: "Santos, Maria", expected: true },
  { a: "Maria Santos", b: "Santos Maria", expected: true },
  { a: "Juan Dela Cruz", b: "dela cruz, juan", expected: true },
  { a: "Maria Clara Santos", b: "Santos, Maria Clara", expected: true },
  { a: "Maria Santos", b: "Maria Clara Santos", expected: false },
  { a: "Juan Cruz", b: "Pedro Cruz", expected: false },
];

let passed = 0;
for (const tc of testCases) {
  const result = isSamePersonName(tc.a, tc.b);
  const ok = result === tc.expected;
  if (ok) passed++;
  console.log(`[${ok ? "PASS" : "FAIL"}] "${tc.a}" vs "${tc.b}" => ${result} (Expected: ${tc.expected})`);
}

console.log(`\nResult: ${passed}/${testCases.length} tests passed.`);

const existingUsers = [
  { id: "u1", name: "Santos, Maria" },
  { id: "u2", name: "Juan Dela Cruz" }
];

const existingEmps = [
  { id: "e1", fullName: "Dela Rosa, Jose" }
];

console.log("\n--- TESTING DATABASE MATCH FINDER ---");
console.log('Match for "MARIA SANTOS":', findExistingMatchingName("MARIA SANTOS", existingUsers, existingEmps));
console.log('Match for "jose dela rosa":', findExistingMatchingName("jose dela rosa", existingUsers, existingEmps));
console.log('Match for "Pedro Penduko":', findExistingMatchingName("Pedro Penduko", existingUsers, existingEmps));
