import "./globals.css";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const metadata = {
  title: "PADEMCO - DENR Airline Ticket Loan Monitoring System",
  description: "Web-based system for tracking airline ticket loans, installment payments, and financial reports for DENR Camarines Norte employees.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PADEMCO Loan",
  },
};

export const dynamic = "force-dynamic";

// Cache layout settings for 1 hour — brand_color and system_logo rarely change
const getCachedLayoutSettings = unstable_cache(
  async () => {
    try {
      const settingsList = await db.systemSetting.findMany({
        where: { key: { in: ["brand_color", "system_logo"] } },
      });
      const settings = settingsList.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      return {
        customColor: settings.brand_color || "#1e3a8a",
        customLogoUrl: settings.system_logo || "",
      };
    } catch {
      return { customColor: "#1e3a8a", customLogoUrl: "" };
    }
  },
  ["layout-settings"],
  { revalidate: 3600 } // Cache for 1 hour
);

export default async function RootLayout({ children }) {
  let customColor = "#1e3a8a";
  let customLogoUrl = "";

  try {
    const settings = await getCachedLayoutSettings();
    if (settings) {
      customColor = settings.customColor || "#1e3a8a";
      customLogoUrl = settings.customLogoUrl || "";
    }
  } catch (e) {
    console.warn("Could not fetch layout settings:", e);
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
