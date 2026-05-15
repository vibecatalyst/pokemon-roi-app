"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFees, PSA_TIERS } from "@/lib/fees-context";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

interface UsageData {
  dailyLimit: number | null;
  dailyRemaining: number | null;
  dailyReset: number | null;
  minuteLimit: number | null;
  minuteRemaining: number | null;
}

function FeeInput({ label, value, onChange, prefix, suffix, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1 font-mono font-semibold">{label}</label>
      <div className="flex items-center bg-zinc-800 border border-zinc-600 rounded-lg overflow-hidden">
        {prefix && <span className="px-2 text-zinc-300 text-sm font-mono">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent px-2 py-2 text-white text-sm font-mono outline-none w-20"
        />
        {suffix && <span className="px-2 text-zinc-300 text-sm font-mono">{suffix}</span>}
      </div>
    </div>
  );
}

export default function Header() {
  const [feesPanelOpen, setFeesPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [usagePanelOpen, setUsagePanelOpen] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const { fees, setFees, psaTier, setPsaTier } = useFees();
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  const update = (key: keyof typeof fees, val: number) =>
    setFees({ ...fees, [key]: val });

  const totalFixed = fees.gradingFee + fees.shippingToGrader + fees.shippingBack;

const navLinks = [
  { href: "/", label: "🏠 Home" },
  { href: "/leaderboard", label: "🏆 Top ROI" },
  { href: "/sealed", label: "🎁 Sealed" },
  { href: "/trending", label: "📈 Trending" },
  { href: "/watchlist", label: "★ Watchlist" },
  { href: "/submissions", label: "📦 Submissions" },
  { href: "/profit", label: "💰 Profit" },
];

  async function fetchUsage() {
    setUsageLoading(true);
    try {
      const res = await fetch("/api/usage");
      const json = await res.json();
      setUsage(json);
    } catch {
      // ignore
    } finally {
      setUsageLoading(false);
    }
  }

  function toggleUsagePanel() {
    const next = !usagePanelOpen;
    setUsagePanelOpen(next);
    setFeesPanelOpen(false);
    setMobileMenuOpen(false);
    if (next && !usage) fetchUsage();
  }

  function getDailyColor() {
    if (!usage?.dailyRemaining || !usage?.dailyLimit) return "text-zinc-300";
    const pct = (usage.dailyRemaining / usage.dailyLimit) * 100;
    if (pct > 50) return "text-emerald-400";
    if (pct > 20) return "text-yellow-400";
    return "text-red-400";
  }

  function getResetTime() {
    if (!usage?.dailyReset) return null;
    const resetDate = new Date(usage.dailyReset * 1000);
    return resetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function getDailyBarWidth() {
    if (!usage?.dailyRemaining || !usage?.dailyLimit) return "0%";
    return ((usage.dailyRemaining / usage.dailyLimit) * 100) + "%";
  }

  function getDailyBarColor() {
    if (!usage?.dailyRemaining || !usage?.dailyLimit) return "bg-zinc-600";
    const pct = (usage.dailyRemaining / usage.dailyLimit) * 100;
    if (pct > 50) return "bg-emerald-400";
    if (pct > 20) return "bg-yellow-400";
    return "bg-red-400";
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-black tracking-tight flex-shrink-0">
              <span className="text-white">POKE</span>
              <span className="text-yellow-400">ROI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={"text-sm px-3 py-2 rounded-lg transition-colors font-semibold whitespace-nowrap " +
                    (pathname === link.href
                      ? "bg-zinc-700 text-white border border-zinc-500"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">

            {/* Auth */}
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <button className="text-sm px-3 py-2 rounded-lg border border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-400 transition-colors font-semibold">
                  Sign In
                </button>
              </SignInButton>
            ) : (
              <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
            )}

            {/* API usage button */}
            <button
              onClick={toggleUsagePanel}
              className={"flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors font-semibold " +
                (usagePanelOpen
                  ? "bg-blue-400/20 border-blue-400/40 text-blue-300"
                  : "border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-400")}
            >
              ⚡ API
              {usage?.dailyRemaining != null && (
                <span className={"hidden sm:inline text-xs bg-zinc-700 px-1.5 py-0.5 rounded font-mono " + getDailyColor()}>
                  {usage.dailyRemaining.toLocaleString()}
                </span>
              )}
            </button>

            {/* Fees button */}
            <button
              onClick={() => { setFeesPanelOpen(!feesPanelOpen); setMobileMenuOpen(false); setUsagePanelOpen(false); }}
              className={"flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors font-semibold " +
                (feesPanelOpen
                  ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                  : "border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-400")}
            >
              ⚙️ Fees
              <span className="hidden sm:inline text-xs bg-zinc-700 px-1.5 py-0.5 rounded font-mono text-zinc-200">
                {psaTier} · ${fees.gradingFee.toFixed(2)}
              </span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setFeesPanelOpen(false); setUsagePanelOpen(false); }}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-600 text-zinc-200 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-700 bg-[#0d0d14]/98 backdrop-blur">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={"text-base px-3 py-3 rounded-lg transition-colors font-semibold " +
                    (pathname === link.href
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* API usage panel */}
        {usagePanelOpen && (
          <div className="border-t border-zinc-700 bg-[#0d0d14]/98 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest">API Usage</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchUsage}
                    disabled={usageLoading}
                    className="text-sm text-zinc-300 hover:text-white font-semibold transition-colors disabled:text-zinc-600"
                  >
                    {usageLoading ? "Refreshing..." : "⟳ Refresh"}
                  </button>
                  <button onClick={() => setUsagePanelOpen(false)} className="text-sm text-zinc-400 hover:text-zinc-200 font-semibold">
                    Close ✕
                  </button>
                </div>
              </div>

              {usageLoading && !usage && (
                <div className="text-zinc-400 font-mono text-sm">Loading usage data...</div>
              )}

              {usage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-800/80 border border-zinc-600 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest">Daily Credits</p>
                      {getResetTime() && (
                        <p className="text-xs text-zinc-400 font-mono">Resets {getResetTime()}</p>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <p className={"text-3xl font-black font-mono " + getDailyColor()}>
                        {usage.dailyRemaining?.toLocaleString() ?? "—"}
                      </p>
                      <p className="text-zinc-400 font-mono text-sm mb-1">
                        / {usage.dailyLimit?.toLocaleString() ?? "—"}
                      </p>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={"h-full rounded-full transition-all " + getDailyBarColor()}
                        style={{ width: getDailyBarWidth() }}
                      />
                    </div>
                    {usage.dailyRemaining != null && usage.dailyLimit != null && (
                      <p className="text-xs text-zinc-400 font-mono">
                        {((usage.dailyRemaining / usage.dailyLimit) * 100).toFixed(0)}% remaining · {(usage.dailyLimit - usage.dailyRemaining).toLocaleString()} used today
                      </p>
                    )}
                  </div>

                  <div className="bg-zinc-800/80 border border-zinc-600 rounded-xl p-4 space-y-3">
                    <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest">Per Minute</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-black font-mono text-blue-400">
                        {usage.minuteRemaining ?? "—"}
                      </p>
                      <p className="text-zinc-400 font-mono text-sm mb-1">
                        / {usage.minuteLimit ?? "—"}
                      </p>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all"
                        style={{ width: usage.minuteLimit ? ((usage.minuteRemaining ?? 0) / usage.minuteLimit * 100) + "%" : "0%" }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 font-mono">
                      Resets every 60 seconds
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fee panel */}
        {feesPanelOpen && (
          <div className="border-t border-zinc-700 bg-[#0d0d14]/98 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

              <div>
                <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest mb-2">PSA Submission Tier</p>
                <div className="flex flex-wrap gap-2">
                  {PSA_TIERS.map((tier) => (
                    <button
                      key={tier.label}
                      onClick={() => setPsaTier(tier.label)}
                      className={"flex flex-col px-3 py-2 rounded-lg border text-left transition-colors " +
                        (psaTier === tier.label
                          ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                          : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400")}
                    >
                      <span className="text-sm font-bold font-mono">{tier.label}</span>
                      <span className="text-xs text-zinc-400">{tier.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest mb-2">Grading Costs</p>
                  <div className="flex flex-wrap gap-3">
                    <FeeInput label="PSA Grading Fee" value={fees.gradingFee} onChange={(v) => update("gradingFee", v)} prefix="$" />
                    <FeeInput label="Shipping to PSA" value={fees.shippingToGrader} onChange={(v) => update("shippingToGrader", v)} prefix="$" />
                    <FeeInput label="Shipping Back" value={fees.shippingBack} onChange={(v) => update("shippingBack", v)} prefix="$" />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-zinc-200 font-bold uppercase tracking-widest mb-2">Selling Costs</p>
                  <div className="flex flex-wrap gap-3">
                    <FeeInput label="eBay / Platform Fee" value={fees.ebayFeePercent} onChange={(v) => update("ebayFeePercent", v)} suffix="%" step={0.01} />
                    <FeeInput label="Buying Premium" value={fees.buyingFeePercent} onChange={(v) => update("buyingFeePercent", v)} suffix="%" step={0.5} />
                  </div>
                </div>

                <div className="bg-zinc-800/80 border border-zinc-600 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-zinc-400 font-mono">Total Fixed</p>
                  <p className="text-2xl font-black text-white font-mono">${totalFixed.toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">+{fees.ebayFeePercent}% on sale</p>
                </div>

                <div className="flex flex-col gap-2 self-end">
                  <button
                    onClick={() => { setPsaTier("Value Bulk"); setFees({ gradingFee: 24.99, shippingToGrader: 10, shippingBack: 0, ebayFeePercent: 13.25, buyingFeePercent: 0 }); }}
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-semibold underline"
                  >
                    Reset to defaults
                  </button>
                  <button
                    onClick={() => setFeesPanelOpen(false)}
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-semibold"
                  >
                    Close ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}