"use client";

import { FeeSettings } from "@/lib/types";

interface Props {
  fees: FeeSettings;
  onChange: (fees: FeeSettings) => void;
}

function FeeInput({ label, value, onChange, prefix, suffix, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1 font-mono">{label}</label>
      <div className="flex items-center bg-zinc-800/60 border border-zinc-700 rounded-lg overflow-hidden">
        {prefix && <span className="px-3 text-zinc-500 text-sm font-mono">{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm font-mono outline-none"
        />
        {suffix && <span className="px-3 text-zinc-500 text-sm font-mono">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ROISettings({ fees, onChange }: Props) {
  const update = (key: keyof FeeSettings, val: number) => onChange({ ...fees, [key]: val });
  const totalFixedFees = fees.gradingFee + fees.shippingToGrader + fees.shippingBack;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">Fee Settings</h3>
        <p className="text-xs text-zinc-600">Adjust to match your actual costs</p>
      </div>
      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Grading Costs</p>
        <FeeInput label="PSA Grading Fee" value={fees.gradingFee} onChange={(v) => update("gradingFee", v)} prefix="$" />
        <FeeInput label="Shipping to PSA" value={fees.shippingToGrader} onChange={(v) => update("shippingToGrader", v)} prefix="$" />
        <FeeInput label="Shipping back to you" value={fees.shippingBack} onChange={(v) => update("shippingBack", v)} prefix="$" />
      </div>
      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Selling Costs</p>
        <FeeInput label="eBay / Platform Fee" value={fees.ebayFeePercent} onChange={(v) => update("ebayFeePercent", v)} suffix="%" step={0.01} />
        <FeeInput label="Buying Premium (above market)" value={fees.buyingFeePercent} onChange={(v) => update("buyingFeePercent", v)} suffix="%" step={0.5} />
      </div>
      <div className="border-t border-zinc-800 pt-4 bg-zinc-800/30 rounded-lg p-3">
        <p className="text-xs text-zinc-500 font-mono mb-1">Total Fixed Costs</p>
        <p className="text-xl font-black text-white font-mono">${totalFixedFees.toFixed(2)}</p>
        <p className="text-xs text-zinc-600 mt-1">+ {fees.ebayFeePercent}% on sale</p>
      </div>
    </div>
  );
}
