"use client";

import { CardData, FeeSettings } from "@/lib/types";

interface Props {
  card: CardData;
  fees: FeeSettings;
}

function calcROI(card: CardData, fees: FeeSettings) {
  const { rawPrice, psa10Price } = card;
  const { gradingFee, shippingToGrader, shippingBack, ebayFeePercent, buyingFeePercent } = fees;
  const buyPrice = rawPrice * (1 + buyingFeePercent / 100);
  const totalCosts = buyPrice + gradingFee + shippingToGrader + shippingBack;
  const saleProceeds = psa10Price * (1 - ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  const breakEven = totalCosts / (1 - ebayFeePercent / 100);
  const multiple = totalCosts > 0 ? saleProceeds / totalCosts : 0;
  const ebayFee = psa10Price * (ebayFeePercent / 100);
  return { buyPrice, totalCosts, saleProceeds, profit, roi, breakEven, multiple, ebayFee };
}

function StatBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "green" | "red" | "yellow" }) {
  const colors = { green: "text-emerald-400", red: "text-red-400", yellow: "text-yellow-400" };
  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-mono mb-1">{label}</p>
      <p className={`text-2xl font-black font-mono ${highlight ? colors[highlight] : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CardResult({ card, fees }: Props) {
  const r = calcROI(card, fees);
  const hasPsa10 = card.psa10Price > 0;
  const roiColor = r.profit > 0 ? "green" : r.profit < 0 ? "red" : "yellow";

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex gap-5 p-6 border-b border-zinc-800">
        {card.image && <img src={card.image} alt={card.name} className="w-28 rounded-lg flex-shrink-0 shadow-xl" />}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black text-white">{card.name}</h2>
          <p className="text-zinc-400 text-sm mt-0.5">{card.set}</p>
          {card.number && <p className="text-zinc-600 text-xs font-mono mt-1">#{card.number}</p>}
          {card.rarity && <span className="inline-block mt-2 text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-0.5 text-zinc-400">{card.rarity}</span>}
        </div>
      </div>

      <div className="p-6 border-b border-zinc-800">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-4">Price Comparison</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 font-mono mb-1">Raw (TCGPlayer Market)</p>
            <p className="text-3xl font-black text-white font-mono">{card.rawPrice > 0 ? `$${card.rawPrice.toFixed(2)}` : "N/A"}</p>
            <p className="text-xs text-zinc-600 mt-1">Near Mint ungraded</p>
          </div>
          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
            <p className="text-xs text-yellow-400/70 font-mono mb-1">PSA 10 (eBay avg)</p>
            <p className="text-3xl font-black text-yellow-400 font-mono">{hasPsa10 ? `$${card.psa10Price.toFixed(2)}` : "N/A"}</p>
            <p className="text-xs text-zinc-600 mt-1">Gem Mint graded</p>
          </div>
        </div>
        {card.rawPrice > 0 && hasPsa10 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-zinc-600 font-mono">PSA 10 is <span className="text-white font-bold">{(card.psa10Price / card.rawPrice).toFixed(1)}x</span> the raw price</span>
          </div>
        )}
        {card.psa9Price != null && card.psa9Price > 0 && (
          <div className="mt-3 bg-zinc-800/30 rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs text-zinc-500 font-mono">PSA 9 value</span>
            <span className="text-sm text-zinc-300 font-mono font-bold">${card.psa9Price.toFixed(2)}</span>
          </div>
        )}
      </div>

      {hasPsa10 && card.rawPrice > 0 ? (
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-4">ROI Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Your total cost" value={`$${r.totalCosts.toFixed(2)}`} sub="incl. grading & shipping" />
              <StatBox label="Sale proceeds" value={`$${r.saleProceeds.toFixed(2)}`} sub={`after ${fees.ebayFeePercent}% fee`} />
              <StatBox label="Net profit" value={`${r.profit >= 0 ? "+" : ""}$${r.profit.toFixed(2)}`} highlight={roiColor} />
              <StatBox label="ROI" value={`${r.profit >= 0 ? "+" : ""}${r.roi.toFixed(1)}%`} sub={`${r.multiple.toFixed(2)}x your money`} highlight={roiColor} />
            </div>
          </div>
          <div className="bg-zinc-800/30 rounded-xl p-4 space-y-2">
            <p className="text-xs text-zinc-500 font-mono mb-3">Cost Breakdown</p>
            {[
              { label: "Raw card price", value: card.rawPrice },
              fees.buyingFeePercent > 0 ? { label: `Buying premium (${fees.buyingFeePercent}%)`, value: r.buyPrice - card.rawPrice } : null,
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
              <span className="text-xs text-zinc-400 font-bold">Break-even PSA 10 price</span>
              <span className="text-sm font-mono font-black text-yellow-400">${r.breakEven.toFixed(2)}</span>
            </div>
          </div>
          <div className={`rounded-xl p-4 border ${r.profit > 0 ? "bg-emerald-500/10 border-emerald-500/20" : r.profit < 0 ? "bg-red-500/10 border-red-500/20" : "bg-zinc-800/40 border-zinc-700"}`}>
            <p className="text-xs font-mono mb-1 text-zinc-500">Verdict</p>
            <p className={`font-bold text-sm ${r.profit > 0 ? "text-emerald-400" : r.profit < 0 ? "text-red-400" : "text-zinc-400"}`}>
              {r.profit > 50 ? `Strong opportunity - you would net $${r.profit.toFixed(2)} (${r.roi.toFixed(0)}% ROI)`
                : r.profit > 0 ? `Marginal profit - $${r.profit.toFixed(2)} after all fees`
                : r.profit < 0 ? `Not worth grading - you would lose $${Math.abs(r.profit).toFixed(2)} at current PSA 10 prices`
                : "Break even at current prices"}
            </p>
            {r.profit < 0 && <p className="text-xs text-zinc-600 mt-1">PSA 10 would need to be ${r.breakEven.toFixed(2)} to break even</p>}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-zinc-600 text-sm font-mono">
          {!hasPsa10 ? "No PSA 10 eBay data available for this card yet." : "Missing raw price data."}
        </div>
      )}
    </div>
  );
}
