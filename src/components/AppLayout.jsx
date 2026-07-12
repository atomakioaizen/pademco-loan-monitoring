"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";

export default function AppLayout({ children, user }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const isAdminRoute = ["/offices", "/airlines", "/employees", "/settings"].some(p => pathname.startsWith(p));
  const [adminMenuOpen, setAdminMenuOpen] = useState(isAdminRoute);

  // Sync state if path changes to one of admin pages
  useEffect(() => {
    if (isAdminRoute) {
      setAdminMenuOpen(true);
    }
  }, [pathname, isAdminRoute]);

  // Update clock in the header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }) +
          " | " +
          now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-close mobile menu on path change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    {
      name: "Dashboard",
      href: "/",
      roles: ["ADMIN", "AGENT", "CASHIER", "VIEWER", "BOOKKEEPER"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Bookkeeper Console",
      href: "/bookkeeper",
      roles: ["BOOKKEEPER", "ADMIN"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: "Bookings & Loans",
      href: "/bookings",
      roles: ["AGENT", "ADMIN"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      name: "Commissions",
      href: "/commissions",
      roles: ["ADMIN", "CASHIER", "AGENT"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Payments & ORs",
      href: "/payments",
      roles: ["CASHIER"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Reports Hub",
      href: "/reports",
      roles: ["ADMIN", "BOOKKEEPER"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: "Audit Trail",
      href: "/audit",
      roles: ["ADMIN"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "My Profile",
      href: "/profile",
      roles: ["ADMIN", "AGENT", "CASHIER", "BOOKKEEPER"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: "Admin Console",
      roles: ["ADMIN"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      subLinks: [
        {
          name: "Offices & Units",
          href: "/offices",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: "Airlines",
          href: "/airlines",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-7a1 1 0 11-2 0 1 1 0 012 0zm3.191 6c.42.599.819 1.254 1.168 1.945M18.809 13.056c-.059-.39-.199-.77-.417-1.116" />
            </svg>
          ),
        },
        {
          name: "Employees",
          href: "/employees",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: "System Settings",
          href: "/settings",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      name: "Bookkeeper Tools",
      roles: ["BOOKKEEPER"],
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      subLinks: [
        {
          name: "Employees / Loaners",
          href: "/employees",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: "Create Account",
          href: "/settings",
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          ),
        },
      ],
    },
  ];

  const filteredLinks = navLinks.filter(
    (link) => link.roles.includes(user?.role)
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "AGENT":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CASHIER":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "BOOKKEEPER":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getBreadcrumb = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Dashboard";
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" > ");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* 1. Desktop Sidebar (no-print hides this when printing) */}
      <aside className="no-print hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-primary text-white shadow-xl z-20">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo & Branding */}
          <div className="flex items-center shrink-0 px-6 gap-3 mb-6">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 shadow-inner bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "var(--system-logo-url)" }}
            >
              <svg 
                className="h-6 w-6 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                style={{ display: "var(--system-logo-display)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider leading-none">PADEMCO</h1>
              <span className="text-[10px] font-bold text-success-light uppercase tracking-widest block mt-0.5">DENR COOP SYSTEM</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 flex-1 px-4 space-y-1">
            {filteredLinks.map((link) => {
              if (link.subLinks) {
                const subActive = link.subLinks.some(sub => pathname === sub.href || pathname.startsWith(sub.href));
                return (
                  <div key={link.name} className="space-y-1">
                    <button
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                        subActive
                          ? "bg-white/10 text-white shadow-inner font-bold border-l-4 border-success-light pl-3"
                          : "text-blue-100 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`mr-3 transition-transform group-hover:scale-110 ${subActive ? "text-success-light" : "text-blue-200"}`}>
                          {link.icon}
                        </span>
                        {link.name}
                      </div>
                      <svg
                        className={`h-4 w-4 transition-transform duration-200 ${adminMenuOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {adminMenuOpen && (
                      <div className="pl-6 space-y-1 border-l border-white/10 ml-6 mt-1 animate-fadeIn">
                        {link.subLinks.map((sub) => {
                          const active = pathname === sub.href || pathname.startsWith(sub.href);
                          return (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                active
                                  ? "bg-white/15 text-white font-bold"
                                  : "text-blue-200 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              <span className={`mr-2.5 ${active ? "text-success-light" : "text-blue-300"}`}>
                                {sub.icon}
                              </span>
                              {sub.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    active
                      ? "bg-white/10 text-white shadow-inner font-bold border-l-4 border-success-light pl-3"
                      : "text-blue-100 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className={`mr-3 transition-transform group-hover:scale-110 ${active ? "text-success-light" : "text-blue-200"}`}>
                    {link.icon}
                  </span>
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile and logout button */}
        <div className="shrink-0 p-4 border-t border-blue-800 bg-primary-dark/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/15 border border-white/10 flex items-center justify-center font-bold text-blue-100 shadow-inner">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <Link href="/profile" className="text-xs font-bold truncate text-white leading-tight hover:text-success-light transition-colors block">{user?.name}</Link>
              <span className={`mt-0.5 inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full border ${getRoleBadge(user?.role)}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={() => logoutAction()}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Hamburger Drawer Menu */}
      <div className="no-print">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between bg-primary text-white px-4 py-3.5 fixed top-0 left-0 right-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 rounded-md text-blue-200 hover:text-white focus:outline-none cursor-pointer"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-black text-sm tracking-widest uppercase">PADEMCO</span>
          </div>
          <span className="text-[10px] font-black bg-white/10 px-2.5 py-1 rounded-full border border-white/5 uppercase">
            {user?.role}
          </span>
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            {/* Dark mask overlay */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-primary text-white shadow-2xl animate-slide-right">
              {/* Close Button */}
              <div className="absolute top-0 right-0 -mr-12 pt-4">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-slate-900/50 cursor-pointer"
                >
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Branding */}
              <div className="flex items-center px-6 pt-6 pb-4 border-b border-blue-800 gap-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: "var(--system-logo-url)" }}
                >
                  <svg 
                    className="h-6 w-6 text-white" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    style={{ display: "var(--system-logo-display)" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-wider leading-none">PADEMCO</h1>
                  <span className="text-[10px] font-bold text-success-light uppercase tracking-widest block mt-0.5">DENR COOP</span>
                </div>
              </div>

              {/* Mobile Navigation links */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {filteredLinks.map((link) => {
                  if (link.subLinks) {
                    const subActive = link.subLinks.some(sub => pathname === sub.href || pathname.startsWith(sub.href));
                    return (
                      <div key={link.name} className="space-y-1">
                        <button
                          onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                          className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                            subActive
                              ? "bg-white/10 text-white shadow-inner font-bold border-l-4 border-success-light pl-3"
                              : "text-blue-100 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center">
                            <span className={`mr-3 ${subActive ? "text-success-light" : "text-blue-200"}`}>
                              {link.icon}
                            </span>
                            {link.name}
                          </div>
                          <svg
                            className={`h-4 w-4 transition-transform duration-200 ${adminMenuOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {adminMenuOpen && (
                          <div className="pl-6 space-y-1 border-l border-white/10 ml-6 mt-1">
                            {link.subLinks.map((sub) => {
                              const active = pathname === sub.href || pathname.startsWith(sub.href);
                              return (
                                <Link
                                  key={sub.name}
                                  href={sub.href}
                                  className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    active
                                      ? "bg-white/15 text-white font-bold"
                                      : "text-blue-200 hover:bg-white/5 hover:text-white"
                                  }`}
                                >
                                  <span className={`mr-2.5 ${active ? "text-success-light" : "text-blue-300"}`}>
                                    {sub.icon}
                                  </span>
                                  {sub.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                        active
                          ? "bg-white/10 text-white shadow-inner font-bold border-l-4 border-success-light pl-3"
                          : "text-blue-100 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={`mr-3 ${active ? "text-success-light" : "text-blue-200"}`}>
                        {link.icon}
                      </span>
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Profile/Logout */}
              <div className="shrink-0 p-4 border-t border-blue-800 bg-primary-dark/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-white/15 border border-white/10 flex items-center justify-center font-bold text-blue-100">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href="/profile" className="text-xs font-bold truncate text-white leading-tight hover:text-success-light transition-colors block">{user?.name}</Link>
                    <span className={`mt-0.5 inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full border ${getRoleBadge(user?.role)}`}>
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={() => logoutAction()}
                    className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Sticky desktop header (no-print hides this when printing) */}
        <header className="no-print hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <span className="text-slate-400">PADEMCO</span>
            <span className="text-slate-300">/</span>
            <span className="text-primary font-bold">{getBreadcrumb()}</span>
          </div>

          {/* Clock Info Panel */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-mono">{currentDateTime}</span>
            </div>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
