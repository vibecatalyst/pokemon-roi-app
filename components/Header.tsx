"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFees } from "@/lib/fees-context";

function FeeInput({ label, value, onChange, prefix, suffix, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1 font-mono">{label}</label>
      <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        {prefix && <span className="px-2 text-zinc-500 text-xs font-mono">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent px-2 py-2 text-white text-sm font-mono outline-none w-20"
        />
        {suffix && <span className="px-2 text-zinc-500 text-xs font-mono">{suffix}</span>}
      </div>
    </div>
  );
}

export default function Header() {
  const [feesPanelOpen, setFeesPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { fees, setFees } = useFees();
  const pathname = usePathname();

  const update = (key: keyof typeof fees, val: number) =>
    setFees({ ...fees, [key]: val });

  const totalFixed = fees.gradingFee + fees.shippingToGrader + fees.shippingBack;

  const navLinks = [
    { href: "/", label: "Search" },
    { href: "/leaderboard", label: "🏆 Top ROI" },
    { href: "/trending", label: "📈 Trending" },
    { href: "/watchlist", label: "★ Watchlist" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-black tracking-tight">
              <span className="text-white">POKE</span>
              <span className="text-yellow-400">ROI</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors font-mono ${
                    pathname === link.href
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Fees button */}
            <button
              onClick={() => { setFeesPanelOpen(!feesPanelOpen); setMobileMenuOpen(false); }}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors font-mono ${
                feesPanelOpen
                  ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400"
                  : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}
            >
              ⚙️ Fees
              <span className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                ${totalFixed.toFixed(0)}
              </span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setFeesPanelOpen(false); }}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-zinc-800 bg-[#0d0d14]/95 backdrop-blur">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm px-3 py-2.5 rounded-lg transition-colors font-mono ${
                    pathname === link.href
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Fee panel dropdown */}
        {feesPanelOpen && (
          <div className="border-t border-zinc-800 bg-[#0d0d14]/95 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex flex-wrap gap-4 items-end">

                <div>
                  <p className="text-xs text-zinc-600 font-mono uppercase tracking-widest mb-2">Grading Costs</p>
                  <div className="flex flex-wrap gap-3">
                    <FeeInput label="PSA Grading Fee" value={fees.gradingFee} onChange={(v) => update("gradingFee", v)} prefix="$" />
                    <FeeInput label="Shipping to PSA" value={fees.shippingToGrader} onChange={(v) => update("shippingToGrader", v)} prefix="$" />
                    <FeeInput label="Shipping Back" value={fees.shippingBack} onChange={(v) => update("shippingBack", v)} prefix="$" />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-600 font-mono uppercase tracking-widest mb-2">Selling Costs</p>
                  <div className="flex flex-wrap gap-3">
                    <FeeInput label="eBay / Platform Fee" value={fees.ebayFeePercent} onChange={(v) => update("ebayFeePercent", v)} suffix="%" step={0.01} />
                    <FeeInput label="Buying Premium" value={fees.buyingFeePercent} onChange={(v) => update("buyingFeePercent", v)} suffix="%" step={0.5} />
                  </div>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-zinc-500 font-mono">Total Fixed</p>
                  <p className="text-2xl font-black text-white font-mono">${totalFixed.toFixed(2)}</p>
                  <p className="text-xs text-zinc-600">+{fees.ebayFeePercent}% on sale</p>
                </div>

                <div className="flex flex-col gap-2 self-end">
                  <button
                    onClick={() => setFees({ gradingFee: 25, shippingToGrader: 8, shippingBack: 8, ebayFeePercent: 13.25, buyingFeePercent: 0 })}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono underline"
                  >
                    Reset to defaults
                  </button>
                  <button
                    onClick={() => setFeesPanelOpen(false)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
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