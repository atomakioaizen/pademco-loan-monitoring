import { db } from "@/lib/db";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "Sign In - PADEMCO Loan Monitoring System",
  description: "Sign in to the PADEMCO DENR Employee Airline Ticket Loan System portal.",
};

export default async function LoginPage() {
  // Load address from settings; fall back to Palawan default
  let orgAddress = "Sta. Monica Penro Road, Puerto Princesa City, Palawan";
  try {
    const setting = await db.systemSetting.findUnique({ where: { key: "org_address" } });
    if (setting?.value) {
      orgAddress = setting.value;
    }
  } catch {
    // DB not ready or setting missing — use default
  }

  return <LoginClient orgAddress={orgAddress} />;
}
