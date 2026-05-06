"use client";

import { CardData, FeeSettings } from "@/lib/types";

interface Props {
  card: CardData;
  fees: FeeSettings;
}

function calcROI(salePrice: number, rawPrice: number, fees: FeeSettings) {
  const buyPrice = rawPrice * (1 + fees.buyingFeePercent / 100);
  const totalCosts = buyPrice + fees.gradingFee + fees.shippingToGrader + fees.shippingBack;
  const saleProceeds = salePrice * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const breakEven = totalCosts / (1 - fees.ebayFeePercent / 100);
  const ebayFee = salePrice * (fees.ebayFeePercent / 100);
  return { buyPrice, totalCosts, saleProceeds, profit, roi, breakEven, ebayFee };
}

function StatBox({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: "green" | "red" | "yellow";
}) {
  const colors = { green: "text-emerald-400", red: "text-red-400", yellow: "text-yellow-400" };
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-mono mb-1">{label}</p>
      <p className={`text-2xl font-black font-mono ${highlight ? colors[highlight] : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function GradePanel({
  label,
  gradeColor,
  salePrice,
  rawPrice,
  fees,
  accent,
}: {
  label: string;
  gradeColor: string;
  salePrice: number;
  rawPrice: number;
  fees: FeeSettings;
  accent: string;
}) {
  if (salePrice <= 0) {
    return (
      <div className="bg-zinc-800/20 border border-zinc-800 rounded-2xl p-5 flex items-center justify-center">
        <p className="text-zinc-600 font-mono text-sm text-center">No {label} eBay data available</p>
      </div>
    );
  }

  const r = calcROI(salePrice, rawPrice, fees);
  const roiColor = r.profit > 0 ? "green" : r.profit < 0 ? "red" : "yellow";

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${accent}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-black ${gradeColor}`}>{label}</h3>
        <span className={`text-2xl font-black font-mono ${gradeColor}`}>${salePrice.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total cost" value={`$${r.totalCosts.toFixed(2)}`} sub="incl. grading & shipping" />
        <StatBox label="Sale proceeds" value={`$${r.saleProceeds.toFixed(2)}`} sub={`after ${fees.ebayFeePercent}% fee`} />
        <StatBox label="Net profit" value={`${r.profit >= 0 ? "+" : ""}$${r.profit.toFixed(2)}`} highlight={roiColor} />
        <StatBox label="ROI" value={`${r.roi >= 0 ? "+" : ""}${r.roi.toFixed(1)}%`} sub={`${(r.saleProceeds / r.totalCosts).toFixed(2)}x money`} highlight={roiColor} />
      </div>

      <div className="bg-zinc-800/30 rounded-xl p-3 space-y-1.5">
        <p className="text-xs text-zinc-500 font-mono mb-2">Cost Breakdown</p>
        {[
          { label: "Raw card price", value: rawPrice },
          fees.buyingFeePercent > 0 ? { label: `Buying premium (${fees.buyingFeePercent}%)`, value: r.buyPrice - rawPrice } : null,
          { label: "PSA grading fee", value: fees.gradingFee },
          { label: "Shipping to grader", value: fees.shippingToGrader },
          { label: "Shipping back", value: fees.shippingBack },
          { label: `eBay fee (${fees.ebayFeePercent}%)`, value: -r.ebayFee },
        ].filter(Boolean).map((item) => (
          <div key={item!.label} className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">{item!.label}</span>
            <span className={`text-xs font-mono font-bold ${item!.value < 0 ? "text-red-400" : "text-zinc-300"}`}>
              {item!.value < 0 ? `-$${Math.abs(item!.value).toFixed(2)}` : `$${item!.value.toFixed(2)}`}
            </span>
          </div>
        ))}
        <div className="border-t border-zinc-700 pt-2 flex justify-between items-center">
          <span className="text-xs text-zinc-400 font-bold">Break-even sale price</span>
          <span className="text-sm font-mono font-black text-yellow-400">${r.breakEven.toFixed(2)}</span>
        </div>
      </div>

      <div className={`rounded-xl p-3 border ${
        r.profit > 0
          ? "bg-emerald-500/10 border-emerald-500/20"
          : r.profit < 0
          ? "bg-red-500/10 border-red-500/20"
          : "bg-zinc-800/40 border-zinc-700"
      }`}>
        <p className="text-xs font-mono mb-1 text-zinc-500">Verdict</p>
        <p className={`font-bold text-sm ${r.profit > 0 ? "text-emerald-400" : r.profit < 0 ? "text-red-400" : "text-zinc-400"}`}>
          {r.profit > 50
            ? `✅ Strong — net $${r.profit.toFixed(2)} (${r.roi.toFixed(0)}% ROI)`
            : r.profit > 0
            ? `🟡 Marginal — $${r.profit.toFixed(2)} after all fees`
            : r.profit < 0
            ? `❌ Loss — -$${Math.abs(r.profit).toFixed(2)} at current prices`
            : "⚪ Break even"}
        </p>
      </div>
    </div>
  );
}

export default function CardResult({ card, fees }: Props) {
  const hasPsa10 = card.psa10Price > 0;
  const hasPsa9 = (card.psa9Price ?? 0) > 0;
  const psa9Price = card.psa9Price ?? 0;

  return (
    <div className="space-y-4">
      {/* Card header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
        <div className="flex gap-5">
          {card.image && (
            <img src={card.image} alt={card.name} className="w-28 rounded-lg flex-shrink-0 shadow-xl" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black text-white">{card.name}</h2>
            <p className="text-zinc-400 text-sm mt-0.5">{card.set}</p>
            {card.number && <p className="text-zinc-600 text-xs font-mono mt-1">#{card.number}</p>}
            {card.rarity && (
              <span className="inline-block mt-2 text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-0.5 text-zinc-400">
                {card.rarity}
              </span>
            )}

            {/* Quick price summary */}
            <div className="flex gap-3 mt-4 flex-wrap">
              <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                <p className="text-xs text-zinc-500 font-mono">Raw</p>
                <p className="text-lg font-black text-white font-mono">
                  {card.rawPrice > 0 ? `$${card.rawPrice.toFixed(2)}` : "N/A"}
                </p>
              </div>
              {hasPsa9 && (
                <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-400/60 font-mono">PSA 9</p>
                  <p className="text-lg font-black text-blue-400 font-mono">${psa9Price.toFixed(2)}</p>
                </div>
              )}
              {hasPsa10 && (
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-400/60 font-mono">PSA 10</p>
                  <p className="text-lg font-black text-yellow-400 font-mono">${card.psa10Price.toFixed(2)}</p>
                </div>
              )}
              {hasPsa9 && hasPsa10 && (
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-zinc-500 font-mono">10 vs 9 premium</p>
                  <p className="text-lg font-black text-white font-mono">
                    +${(card.psa10Price - psa9Price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No data state */}
      {!hasPsa10 && !hasPsa9 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-600 font-mono text-sm">
          No PSA eBay data available for this card yet.
        </div>
      )}

      {/* Grade comparison */}
      {(hasPsa10 || hasPsa9) && card.rawPrice > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600 font-mono uppercase tracking-widest">Grade Comparison</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className={`grid gap-4 ${hasPsa9 && hasPsa10 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {hasPsa10 && (
              <GradePanel
                label="PSA 10 — Gem Mint"
                gradeColor="text-yellow-400"
                salePrice={card.psa10Price}
                rawPrice={card.rawPrice}
                fees={fees}
                accent="bg-yellow-400/5 border-yellow-400/10"
              />
            )}
            {hasPsa9 && (
              <GradePanel
                label="PSA 9 — Mint"
                gradeColor="text-blue-400"
                salePrice={psa9Price}
                rawPrice={card.rawPrice}
                fees={fees}
                accent="bg-blue-400/5 border-blue-400/10"
              />
            )}
          </div>

          {/* Comparison callout */}
          {hasPsa9 && hasPsa10 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-3">Which grade is better to target?</p>
              {(() => {
                const roi10 = calcROI(card.psa10Price, card.rawPrice, fees);
                const roi9 = calcROI(psa9Price, card.rawPrice, fees);
                const diff = roi10.profit - roi9.profit;
                const bothProfitable = roi10.profit > 0 && roi9.profit > 0;
                const neitherProfitable = roi10.profit <= 0 && roi9.profit <= 0;
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-400 font-mono">PSA 10 profit</span>
                      <span className={`text-sm font-black font-mono ${roi10.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {roi10.profit >= 0 ? "+" : ""}${roi10.profit.toFixed(2)} ({roi10.roi.toFixed(0)}% ROI)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-400 font-mono">PSA 9 profit</span>
                      <span className={`text-sm font-black font-mono ${roi9.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {roi9.profit >= 0 ? "+" : ""}${roi9.profit.toFixed(2)} ({roi9.roi.toFixed(0)}% ROI)
                      </span>
                    </div>
                    <div className="border-t border-zinc-800 pt-2">
                      <p className="text-sm text-white font-bold">
                        {neitherProfitable
                          ? "❌ Neither grade is profitable at current prices"
                          : !bothProfitable && roi10.profit > 0
                          ? "⚠️ Only profitable if you hit PSA 10 — PSA 9 is a loss"
                          : !bothProfitable && roi9.profit > 0
                          ? "✅ Even a PSA 9 is profitable on this card"
                          : diff > 20
                          ? `✅ PSA 10 is worth chasing — $${diff.toFixed(2)} more profit than a 9`
                          : `🟡 PSA 9 is nearly as good — only $${diff.toFixed(2)} less than a 10`}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}