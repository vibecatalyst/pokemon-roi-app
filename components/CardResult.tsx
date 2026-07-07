"use client";

import { CardData, FeeSettings } from "@/lib/types";

interface Props {
  card: CardData;
  fees: FeeSettings;
  onImageClick?: () => void;
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
      <p className="text-xs text-zinc-400 font-mono mb-1">{label}</p>
      <p className={"text-2xl font-black font-mono " + (highlight ? colors[highlight] : "text-white")}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CardResult({ card, fees, onImageClick }: Props) {
  const psa10 = card.psa10Price > 0 ? calcROI(card.psa10Price, card.rawPrice, fees) : null;
  const psa9Price = card.psa9Price ?? 0;
  const psa9 = psa9Price > 0 ? calcROI(psa9Price, card.rawPrice, fees) : null;
  const psa8Price = card.psa8Price ?? 0;
  const psa8 = psa8Price > 0 ? calcROI(psa8Price, card.rawPrice, fees) : null;
  const psa7Price = card.psa7Price ?? 0;
  const psa7 = psa7Price > 0 ? calcROI(psa7Price, card.rawPrice, fees) : null;

  return (
    <div className="space-y-6">

      {/* Card header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* Card image */}
          {card.image && (
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <img
                src={card.image}
                alt={card.name}
                onClick={onImageClick}
                className={"w-48 sm:w-56 rounded-xl shadow-2xl shadow-black/50 ring-1 ring-zinc-700 transition-transform hover:scale-[1.03] " + (onImageClick ? "cursor-zoom-in" : "")}
              />
              {onImageClick && (
                <p className="text-center text-xs text-zinc-600 mt-2 font-mono">click to enlarge</p>
              )}
            </div>
          )}

          {/* Card info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">{card.name}</h2>
            <p className="text-zinc-400 text-sm mb-4">{card.set} &middot; {card.rarity} &middot; #{card.number}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <p className="text-xs text-zinc-400 font-mono mb-1">RAW PRICE</p>
                <p className="text-xl font-black text-white font-mono">
                  {card.rawPrice > 0 ? "$" + card.rawPrice.toFixed(2) : "N/A"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">TCGPlayer market</p>
              </div>

              {card.psa10Price > 0 && (
                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-400 font-mono mb-1">PSA 10</p>
                  <p className="text-xl font-black text-yellow-400 font-mono">${card.psa10Price.toFixed(2)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Gem Mint</p>
                </div>
              )}

              {psa9Price > 0 && (
                <div className="bg-blue-400/10 border border-blue-400/20 rounded-xl p-3">
                  <p className="text-xs text-blue-400 font-mono mb-1">PSA 9</p>
                  <p className="text-xl font-black text-blue-400 font-mono">${psa9Price.toFixed(2)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Mint</p>
                </div>
              )}

              {psa8Price > 0 && (
                <div className="bg-purple-400/10 border border-purple-400/20 rounded-xl p-3">
                  <p className="text-xs text-purple-400 font-mono mb-1">PSA 8</p>
                  <p className="text-xl font-black text-purple-400 font-mono">${psa8Price.toFixed(2)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">NM-Mint</p>
                </div>
              )}

              {psa7Price > 0 && (
                <div className="bg-teal-400/10 border border-teal-400/20 rounded-xl p-3">
                  <p className="text-xs text-teal-400 font-mono mb-1">PSA 7</p>
                  <p className="text-xl font-black text-teal-400 font-mono">${psa7Price.toFixed(2)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Near Mint</p>
                </div>
              )}

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <p className="text-xs text-zinc-400 font-mono mb-1">GRADING COST</p>
                <p className="text-xl font-black text-white font-mono">
                  ${(fees.gradingFee + fees.shippingToGrader + fees.shippingBack).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Fee + shipping</p>
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
                <p className="text-xs text-zinc-400 font-mono mb-1">TOTAL COST</p>
                <p className="text-xl font-black text-white font-mono">
                  {psa10 ? "$" + psa10.totalCosts.toFixed(2) : "N/A"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Raw + all fees</p>
              </div>

              {psa10 && (
                <div className={"rounded-xl p-3 border " + (psa10.profit >= 0 ? "bg-emerald-400/10 border-emerald-400/20" : "bg-red-400/10 border-red-400/20")}>
                  <p className={"text-xs font-mono mb-1 " + (psa10.profit >= 0 ? "text-emerald-400" : "text-red-400")}>BREAK EVEN</p>
                  <p className={"text-xl font-black font-mono " + (psa10.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                    ${psa10.breakEven.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Min sale price</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PSA 10 ROI */}
      {psa10 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">PSA 10 &mdash; Gem Mint</h3>
            <div className="text-right">
              <p className={"text-3xl font-black font-mono " + (psa10.roi >= 0 ? "text-emerald-400" : "text-red-400")}>
                {psa10.roi >= 0 ? "+" : ""}{psa10.roi.toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-400 font-mono">ROI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="NET PROFIT"
              value={(psa10.profit >= 0 ? "+" : "") + "$" + psa10.profit.toFixed(2)}
              highlight={psa10.profit >= 0 ? "green" : "red"}
            />
            <StatBox
              label="SALE PROCEEDS"
              value={"$" + psa10.saleProceeds.toFixed(2)}
              sub={"after " + fees.ebayFeePercent + "% platform fee"}
            />
            <StatBox
              label="EBAY FEE"
              value={"$" + psa10.ebayFee.toFixed(2)}
              sub={fees.ebayFeePercent + "% of sale"}
            />
            <StatBox
              label="TOTAL INVESTED"
              value={"$" + psa10.totalCosts.toFixed(2)}
              sub="raw + grading + shipping"
            />
          </div>

          <div className={"mt-4 rounded-xl p-4 border " + (psa10.profit >= 0 ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20")}>
            <p className={"text-base font-bold " + (psa10.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
              {psa10.profit >= 100
                ? "Strong flip — high margin at PSA 10"
                : psa10.profit >= 20
                ? "Profitable at PSA 10"
                : psa10.profit >= 0
                ? "Barely profitable — thin margin"
                : "Not profitable at current prices"}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {psa10.profit >= 0
                ? "You need to sell for at least $" + psa10.breakEven.toFixed(2) + " to break even."
                : "Raw price + fees exceed PSA 10 market price. Wait for prices to move."}
            </p>
          </div>
        </div>
      )}

      {/* PSA 9 ROI */}
      {psa9 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">PSA 9 &mdash; Mint</h3>
            <div className="text-right">
              <p className={"text-3xl font-black font-mono " + (psa9.roi >= 0 ? "text-blue-400" : "text-red-400")}>
                {psa9.roi >= 0 ? "+" : ""}{psa9.roi.toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-400 font-mono">ROI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="NET PROFIT"
              value={(psa9.profit >= 0 ? "+" : "") + "$" + psa9.profit.toFixed(2)}
              highlight={psa9.profit >= 0 ? "green" : "red"}
            />
            <StatBox
              label="SALE PROCEEDS"
              value={"$" + psa9.saleProceeds.toFixed(2)}
              sub={"after " + fees.ebayFeePercent + "% platform fee"}
            />
            <StatBox
              label="EBAY FEE"
              value={"$" + psa9.ebayFee.toFixed(2)}
              sub={fees.ebayFeePercent + "% of sale"}
            />
            <StatBox
              label="TOTAL INVESTED"
              value={"$" + psa9.totalCosts.toFixed(2)}
              sub="raw + grading + shipping"
            />
          </div>

          {psa10 && (
            <div className="mt-4 bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
              <p className="text-sm font-bold text-white">
                {psa10.profit > 0 && psa9.profit > 0 && psa10.profit - psa9.profit > 20
                  ? "PSA 10 worth chasing — $" + (psa10.profit - psa9.profit).toFixed(2) + " more profit than a 9"
                  : psa10.profit > 0 && psa9.profit > 0
                  ? "PSA 9 nearly as good — only $" + (psa10.profit - psa9.profit).toFixed(2) + " less than a 10"
                  : psa10.profit > 0 && psa9.profit <= 0
                  ? "Only profitable if you hit PSA 10 — PSA 9 is a loss"
                  : psa9.profit > 0 && psa10.profit <= 0
                  ? "Even a PSA 9 is profitable on this card"
                  : "Neither grade is profitable at current prices"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* PSA 8 ROI */}
      {psa8 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">PSA 8 &mdash; NM-Mint</h3>
            <div className="text-right">
              <p className={"text-3xl font-black font-mono " + (psa8.roi >= 0 ? "text-purple-400" : "text-red-400")}>
                {psa8.roi >= 0 ? "+" : ""}{psa8.roi.toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-400 font-mono">ROI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="NET PROFIT"
              value={(psa8.profit >= 0 ? "+" : "") + "$" + psa8.profit.toFixed(2)}
              highlight={psa8.profit >= 0 ? "green" : "red"}
            />
            <StatBox
              label="SALE PROCEEDS"
              value={"$" + psa8.saleProceeds.toFixed(2)}
              sub={"after " + fees.ebayFeePercent + "% platform fee"}
            />
            <StatBox
              label="EBAY FEE"
              value={"$" + psa8.ebayFee.toFixed(2)}
              sub={fees.ebayFeePercent + "% of sale"}
            />
            <StatBox
              label="TOTAL INVESTED"
              value={"$" + psa8.totalCosts.toFixed(2)}
              sub="raw + grading + shipping"
            />
          </div>

          {psa9 && (
            <div className="mt-4 bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
              <p className="text-sm font-bold text-white">
                {psa9.profit > 0 && psa8.profit > 0 && psa9.profit - psa8.profit > 20
                  ? "PSA 9 worth chasing — $" + (psa9.profit - psa8.profit).toFixed(2) + " more profit than an 8"
                  : psa9.profit > 0 && psa8.profit > 0
                  ? "PSA 8 nearly as good — only $" + (psa9.profit - psa8.profit).toFixed(2) + " less than a 9"
                  : psa9.profit > 0 && psa8.profit <= 0
                  ? "Only profitable if you hit PSA 9 — PSA 8 is a loss"
                  : psa8.profit > 0 && psa9.profit <= 0
                  ? "Even a PSA 8 is profitable on this card"
                  : "Neither grade is profitable at current prices"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* PSA 7 ROI */}
      {psa7 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white">PSA 7 &mdash; Near Mint</h3>
            <div className="text-right">
              <p className={"text-3xl font-black font-mono " + (psa7.roi >= 0 ? "text-teal-400" : "text-red-400")}>
                {psa7.roi >= 0 ? "+" : ""}{psa7.roi.toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-400 font-mono">ROI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="NET PROFIT"
              value={(psa7.profit >= 0 ? "+" : "") + "$" + psa7.profit.toFixed(2)}
              highlight={psa7.profit >= 0 ? "green" : "red"}
            />
            <StatBox
              label="SALE PROCEEDS"
              value={"$" + psa7.saleProceeds.toFixed(2)}
              sub={"after " + fees.ebayFeePercent + "% platform fee"}
            />
            <StatBox
              label="EBAY FEE"
              value={"$" + psa7.ebayFee.toFixed(2)}
              sub={fees.ebayFeePercent + "% of sale"}
            />
            <StatBox
              label="TOTAL INVESTED"
              value={"$" + psa7.totalCosts.toFixed(2)}
              sub="raw + grading + shipping"
            />
          </div>

          {psa8 && (
            <div className="mt-4 bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
              <p className="text-sm font-bold text-white">
                {psa8.profit > 0 && psa7.profit > 0 && psa8.profit - psa7.profit > 20
                  ? "PSA 8 worth chasing — $" + (psa8.profit - psa7.profit).toFixed(2) + " more profit than a 7"
                  : psa8.profit > 0 && psa7.profit > 0
                  ? "PSA 7 nearly as good — only $" + (psa8.profit - psa7.profit).toFixed(2) + " less than an 8"
                  : psa8.profit > 0 && psa7.profit <= 0
                  ? "Only profitable if you hit PSA 8 — PSA 7 is a loss"
                  : psa7.profit > 0 && psa8.profit <= 0
                  ? "Even a PSA 7 is profitable on this card"
                  : "Neither grade is profitable at current prices"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}