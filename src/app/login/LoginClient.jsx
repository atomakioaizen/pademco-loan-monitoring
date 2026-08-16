"use client";

import { useState, useEffect, useTransition } from "react";
import { loginAction } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginClient({ orgAddress }) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Mobile Device Check (phones & tablets)
      const checkMobile = () => {
        const userAgentMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const screenMobile = window.innerWidth < 768;
        setIsMobile(userAgentMobile || screenMobile);
      };

      // 2. Standalone / Installed App Check
      const checkInstalled = () => {
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          window.navigator.standalone ||
          document.referrer.includes("android-app://");
        if (isStandalone) {
          setIsInstalled(true);
        }
      };

      checkMobile();
      checkInstalled();

      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.target);

    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result && result.error) {
        setError(result.error);
      } else if (result && result.redirectTo) {
        setIsNavigating(true);
        router.push(result.redirectTo);
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-50 to-slate-50 relative">
      <div className="w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
            <svg
              className="h-9 w-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-primary">
            PADEMCO
          </h2>
          <p className="mt-2 text-sm font-semibold text-success uppercase tracking-wider">
            DENR Employee Airline Ticket Loan System
          </p>
          <p className="mt-1 text-xs text-slate-500">{orgAddress}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white px-8 py-8 shadow-xl rounded-2xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-danger-light p-4 border-l-4 border-danger animate-pulse">
                <div className="flex">
                  <div className="shrink-0">
                    <svg
                      className="h-5 w-5 text-danger"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-danger-dark">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 transition-all font-semibold"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending || isNavigating}
                className="group relative flex w-full justify-center rounded-xl bg-primary hover:bg-primary-hover px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer animate-fadeIn"
              >
                {isPending || isNavigating ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>
                      {isNavigating
                        ? "Opening Portal Dashboard..."
                        : "Verifying Credentials..."}
                    </span>
                  </div>
                ) : (
                  "Sign In to Portal"
                )}
              </button>
            </div>
            <div className="text-center mt-4">
              <span className="text-xs text-slate-500 font-semibold">
                No account yet?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary-hover font-bold hover:underline"
                >
                  Register as Loaner
                </Link>
              </span>
            </div>
          </form>

          {/* Install App Section (Visible ONLY on Mobile devices when NOT yet installed) */}
          {isMobile && !isInstalled && (
            <div className="pt-5 border-t border-slate-100 mt-6 text-center space-y-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-4 py-3.5 rounded-xl shadow-md transition-all text-sm cursor-pointer hover:shadow-lg active:scale-98"
              >
                <svg
                  className="w-5 h-5 text-white animate-bounce"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>📱 Install PADEMCO Mobile App</span>
              </button>
              <p className="text-[11px] text-slate-400">
                Install directly on your phone for 1-tap offline access.
              </p>
            </div>
          )}

          <div className="mt-4 text-center text-[11px] text-slate-400">
            Secure login. Unauthorized access is strictly prohibited.
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Pademco Multi-Purpose Cooperative.
          All rights reserved.
        </div>
      </div>

      {/* Interactive Modal Instructions if Install Prompt isn't triggered automatically */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl">
              📱
            </div>
            <h3 className="text-lg font-black text-slate-800">
              Install PADEMCO Mobile App
            </h3>
            <div className="text-xs text-slate-600 leading-relaxed text-left bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p>
                <strong>Chrome / Android:</strong> Tap the browser menu (⋮) at top right ➔ select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
              </p>
              <p>
                <strong>Safari / iPhone:</strong> Tap the Share button (⎋) at the bottom ➔ select <strong>"Add to Home Screen"</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="w-full bg-slate-900 text-white text-xs font-bold py-3 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
