import "./globals.css";
import { db } from "@/lib/db";

export const metadata = {
  title: "PADEMCO - DENR Airline Ticket Loan Monitoring System",
  description: "Web-based system for tracking airline ticket loans, installment payments, and financial reports for DENR Camarines Norte employees.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }) {
  let customColor = "#1e3a8a";
  let customLogoUrl = "";
  try {
    const settingsList = await db.systemSetting.findMany({
      where: { key: { in: ["brand_color", "system_logo"] } },
    });
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    customColor = settings.brand_color || "#1e3a8a";
    customLogoUrl = settings.system_logo || "";
  } catch (e) {
    // DB not ready — use defaults
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body 
        className="min-h-full flex flex-col bg-background-gray text-slate-900"
        style={{
          "--color-brand-primary": customColor,
          "--color-brand-primary-hover": customColor,
          "--color-brand-primary-dark": customColor,
          "--color-brand-primary-light": customColor + "20",
          "--system-logo-url": customLogoUrl ? `url('${customLogoUrl}')` : "none",
          "--system-logo-display": customLogoUrl ? "none" : "block",
        }}
      >
        {children}
      </body>
    </html>
  );
}
