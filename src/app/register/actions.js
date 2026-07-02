"use server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Hardcoded Palawan office stations
const PALAWAN_OFFICES = [
  "PENRO Palawan",
  "CENRO Coron",
  "CENRO Brookes Point",
  "CENRO Puerto Princesa",
  "CENRO Quezon",
  "CENRO Roxas",
  "CENRO Taytay",
];

export async function registerAction(prevState, formData) {
  const username = formData.get("username")?.trim();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const name = formData.get("name")?.trim();

  const employeeId = formData.get("employeeId")?.trim() || null; // Now optional
  const officeName = formData.get("officeName"); // Use office name, not ID
  const position = formData.get("position")?.trim();
  const contactNumber = formData.get("contactNumber")?.trim();
  const birthDate = formData.get("birthDate");
  const gender = formData.get("gender");
  const email = formData.get("email")?.trim();
  const govIdType = formData.get("govIdType")?.trim();
  const govIdNumber = formData.get("govIdNumber")?.trim();

  // Validate required fields (employeeId is now optional)
  if (!username || !password || !confirmPassword || !name || !officeName || !position || !contactNumber) {
    return { error: "Please fill in all required fields." };
  }

  // Validate office name is one of the Palawan offices
  if (!PALAWAN_OFFICES.includes(officeName)) {
    return { error: "Please select a valid office station." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    // 1. Check if username already exists (case-insensitive)
    const allUsers = await db.user.findMany();
    const existingUserByUsername = allUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (existingUserByUsername) {
      return { error: "Username is already taken." };
    }

    // 2. Check if name / fullName already exists (case-insensitive)
    const existingUserByName = allUsers.find(
      (u) => u.name.toLowerCase() === name.toLowerCase()
    );
    const allEmployees = await db.employee.findMany();
    const existingEmployeeByName = allEmployees.find(
      (e) => e.fullName.toLowerCase() === name.toLowerCase()
    );
    if (existingUserByName || existingEmployeeByName) {
      return { error: "An account or profile with this Full Name is already registered." };
    }

    // 3. If employeeId provided, check if it already exists (case-insensitive)
    if (employeeId) {
      const existingEmployee = allEmployees.find(
        (e) => e.employeeId.toLowerCase() === employeeId.toLowerCase()
      );
      if (existingEmployee) {
        return { error: "Employee ID is already registered." };
      }
    }

    // 4. Get or create the office record
    let office = await db.office.findFirst({ where: { name: officeName } });
    if (!office) {
      office = await db.office.create({ data: { name: officeName } });
    }

    // 5. Create employee and user in a transaction with status PENDING
    const passwordHash = hashPassword(password);

    await db.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          employeeId: employeeId || `EMP-${Date.now()}`, // Auto-generate if not provided
          fullName: name,
          officeId: office.id,
          position,
          contactNumber,
          birthDate: birthDate || null,
          gender: gender || null,
          email: email || null,
          govIdType: govIdType || null,
          govIdNumber: govIdNumber || null,
          status: "ACTIVE",
        }
      });

      await tx.user.create({
        data: {
          username,
          name,
          passwordHash,
          role: "VIEWER",
          status: "PENDING",
          employeeId: emp.id,
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Register Server Action error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
