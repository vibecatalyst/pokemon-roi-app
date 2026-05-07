"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSubmissions } from "@/lib/submissions-context";
import { Submission } from "@/lib/submissions";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

function calcExpected(s: Submission, ebayFee: number) {
  const totalCost = s.rawPrice + s.gradingFee + s.shippingCost;
  const proceeds = s.psa10Price * (1 - ebayFee / 100);
  const profit = proceeds - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { totalCost, proceeds, profit, roi };
}

function calcActual(s: Submission, ebayFee: number) {
  if (!s.soldPrice) return null;
  const totalCost = s.rawPrice + s.gradingFee + s.shippingCost;
  const proceeds = s.soldPrice * (1 - ebayFee / 100);
  const profit = proceeds - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  return { totalCost, proceeds, profit, roi };
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 font-mono mb-1">{label}</p>
      <p className={"text-2xl font-black font-mono " + (color ?? "text-white")}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

const GRADE_COLORS: Record<number, string> = {
  10: "text-yellow-400",
  9: "text-blue-400",
  8: "text-emerald-400",
  7: "text-zinc-300",
  6: "text-zinc-400",
  5: "text-zinc-500",
};

const GRADE_BAR_COLORS: Record<number, string> = {
  10: "bg-yellow-400",
  9: "bg-blue-400",
  8: "bg-emerald-400",
  7: "bg-zinc-500",
  6: "bg-zinc-600",
  5: "bg-zinc-700",
};

export default function Profit() {
  const { submissions, loading } = useSubmissions();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "completed" | "grades">("overview");
  const { fees } = useFees();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    if (!mounted || submissions.length === 0) return null;

    const completed = submissions.filter(s => s.status === "returned");
    const withSale = completed.filter(s => s.soldPrice);
    const inProgress = submissions.filter(s => s.status !== "returned");

    const totalInvested = submissions.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const totalInvestedCompleted = withSale.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const totalEarned = withSale.reduce((s, i) => s + (i.soldPrice ?? 0) * (1 - fees.ebayFeePercent / 100), 0);
    const realizedProfit = totalEarned - totalInvestedCompleted;

    const wins = withSale.filter(s => (calcActual(s, fees.ebayFeePercent)?.profit ?? 0) > 0);
    const winRate = withSale.length > 0 ? (wins.length / withSale.length) * 100 : 0;
    const avgRoi = withSale.length > 0
      ? withSale.reduce((s, i) => s + (calcActual(i, fees.ebayFeePercent)?.roi ?? 0), 0) / withSale.length
      : 0;

    const gradeDistribution: Record<number, number> = {};
    completed.forEach(s => {
      if (s.actualGrade) {
        gradeDistribution[s.actualGrade] = (gradeDistribution[s.actualGrade] ?? 0) + 1;
      }
    });

    const psa10Rate = completed.length > 0
      ? ((gradeDistribution[10] ?? 0) / completed.length) * 100
      : 0;

    const sortedBySale = [...withSale].sort((a, b) => {
      const pa = calcActual(a, fees.ebayFeePercent)?.profit ?? 0;
      const pb = calcActual(b, fees.ebayFeePercent)?.profit ?? 0;
      return pb - pa;
    });

    const bestCard = sortedBySale[0] ?? null;
    const worstCard = sortedBySale.length > 1 ? sortedBySale[sortedBySale.length - 1] : null;

    const expectedProfit = inProgress
      .filter(s => s.psa10Price > 0)
      .reduce((sum, s) => sum + calcExpected(s, fees.ebayFeePercent).profit, 0);

    return {
      completed, withSale, inProgress,
      totalInvested, realizedProfit,
      winRate, avgRoi, gradeDistribution, psa10Rate,
      bestCard, worstCard, expectedProfit,
    };
  }, [submissions, fees, mounted]);

  function exportToCSV() {
    const headers = [
      "Name", "Set", "Rarity", "Number", "Status",
      "Raw Price Paid", "Grading Fee", "Shipping Cost", "Total Cost",
      "PSA 10 Market", "PSA 9 Market", "Expected Profit", "Expected ROI %",
      "Actual Grade", "Sold Price", "Actual Profit", "Actual ROI %",
      "Submission #", "Submitted At", "Graded At", "Returned At", "Notes"
    ];

    const rows = submissions.map((s) => {
      const expected = calcExpected(s, fees.ebayFeePercent);
      const actual = calcActual(s, fees.ebayFeePercent);
      return [
        s.name, s.set, s.rarity, s.number, s.status,
        s.rawPrice.toFixed(2), s.gradingFee.toFixed(2), s.shippingCost.toFixed(2),
        expected.totalCost.toFixed(2),
        s.psa10Price > 0 ? s.psa10Price.toFixed(2) : "",
        s.psa9Price > 0 ? s.psa9Price.toFixed(2) : "",
        s.psa10Price > 0 ? expected.profit.toFixed(2) : "",
        s.psa10Price > 0 ? expected.roi.toFixed(1) + "%" : "",
        s.actualGrade ? "PSA " + s.actualGrade : "",
        s.soldPrice ? s.soldPrice.toFixed(2) : "",
        actual ? actual.profit.toFixed(2) : "",
        actual ? actual.roi.toFixed(1) + "%" : "",
        s.submissionNumber ?? "",
        s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "",
        s.gradedAt ? new Date(s.gradedAt).toLocaleDateString() : "",
        s.returnedAt ? new Date(s.returnedAt).toLocaleDateString() : "",
        s.notes ?? "",
      ];
    });

    const csv = [headers, ...rows].map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grading-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
            <h1 className="text-4xl font-black mt-2">
              <span className="text-white">PROFIT </span>
              <span className="text-emerald-400">SUMMARY</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-zinc-500 text-sm">Your grading performance and realized returns</p>
              <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                ☁ Synced
              </span>
            </div>
          </div>
          {submissions.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              Export CSV
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 animate-spin inline-block">⟳</div>
            <p className="text-zinc-500 font-mono text-sm">Loading from cloud...</p>
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-zinc-500 font-mono text-sm mb-2">No submission data yet</p>
            <p className="text-zinc-700 text-xs mb-6 max-w-sm mx-auto">
              Add cards to your submission tracker and mark them as returned with a sold price to see your profit and loss summary here
            </p>
            <Link href="/submissions" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
              Go to Submission Tracker
            </Link>
          </div>
        )}

        {stats && (
          <div className="space-y-6">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total submitted" value={String(submissions.length)} sub={stats.inProgress.length + " in progress"} />
              <StatCard label="Total invested" value={"$" + stats.totalInvested.toFixed(0)} sub="across all submissions" color="text-yellow-400" />
              <StatCard
                label="Realized profit"
                value={(stats.realizedProfit >= 0 ? "+" : "") + "$" + stats.realizedProfit.toFixed(0)}
                sub={stats.withSale.length + " cards sold"}
                color={stats.realizedProfit >= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <StatCard
                label="Expected profit"
                value={(stats.expectedProfit >= 0 ? "+" : "") + "$" + stats.expectedProfit.toFixed(0)}
                sub="from in-progress cards"
                color={stats.expectedProfit >= 0 ? "text-blue-400" : "text-red-400"}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Win rate"
                value={stats.winRate.toFixed(0) + "%"}
                sub="of sold cards profitable"
                color={stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"}
              />
              <StatCard
                label="Average ROI"
                value={(stats.avgRoi >= 0 ? "+" : "") + stats.avgRoi.toFixed(0) + "%"}
                sub="on completed sales"
                color={stats.avgRoi >= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <StatCard label="PSA 10 rate" value={stats.psa10Rate.toFixed(0) + "%"} sub="of graded cards" color="text-yellow-400" />
              <StatCard label="Cards graded" value={String(stats.completed.length)} sub={stats.withSale.length + " sold"} />
            </div>

            {/* Tabs */}
            <div>
              <div className="flex gap-2 mb-4">
                {(["overview", "completed", "grades"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={"text-sm px-4 py-2 rounded-lg font-mono transition-colors " +
                      (activeTab === tab ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white")}
                  >
                    {tab === "overview" ? "Best & Worst" : tab === "completed" ? "All Completed" : "Grade Distribution"}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stats.withSale.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-zinc-600 font-mono text-sm">
                      No completed sales yet. Update your submissions with a sold price to see best and worst cards.
                    </div>
                  )}

                  {stats.bestCard && (() => {
                    const actual = calcActual(stats.bestCard, fees.ebayFeePercent)!;
                    return (
                      <div
                        onClick={() => stats.bestCard?.tcgPlayerId && router.push("/card/" + stats.bestCard.tcgPlayerId + "?from=" + encodeURIComponent("/profit"))}
                        className="bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 cursor-pointer transition-colors"
                      >
                        <p className="text-xs text-zinc-500 font-mono mb-3">Best Card</p>
                        <div className="flex items-center gap-3 mb-4">
                          {stats.bestCard.image && <img src={stats.bestCard.image} alt={stats.bestCard.name} className="w-14 rounded flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{stats.bestCard.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{stats.bestCard.set}</p>
                            {stats.bestCard.actualGrade && (
                              <span className={"text-xs font-mono font-bold " + (GRADE_COLORS[stats.bestCard.actualGrade] ?? "text-zinc-400")}>
                                PSA {stats.bestCard.actualGrade}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-600">Paid</p><p className="text-white">${stats.bestCard.rawPrice.toFixed(2)}</p></div>
                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-600">Sold for</p><p className="text-white">${(stats.bestCard.soldPrice ?? 0).toFixed(2)}</p></div>
                          <div className="bg-emerald-500/10 rounded-lg p-2"><p className="text-zinc-600">Profit</p><p className="text-emerald-400 font-bold">+${actual.profit.toFixed(2)}</p></div>
                          <div className="bg-emerald-500/10 rounded-lg p-2"><p className="text-zinc-600">ROI</p><p className="text-emerald-400 font-bold">+{actual.roi.toFixed(0)}%</p></div>
                        </div>
                      </div>
                    );
                  })()}

                  {stats.worstCard && (() => {
                    const actual = calcActual(stats.worstCard, fees.ebayFeePercent)!;
                    return (
                      <div
                        onClick={() => stats.worstCard?.tcgPlayerId && router.push("/card/" + stats.worstCard.tcgPlayerId + "?from=" + encodeURIComponent("/profit"))}
                        className="bg-red-500/5 border border-red-500/20 hover:border-red-500/40 rounded-2xl p-5 cursor-pointer transition-colors"
                      >
                        <p className="text-xs text-zinc-500 font-mono mb-3">Worst Card</p>
                        <div className="flex items-center gap-3 mb-4">
                          {stats.worstCard.image && <img src={stats.worstCard.image} alt={stats.worstCard.name} className="w-14 rounded flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{stats.worstCard.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{stats.worstCard.set}</p>
                            {stats.worstCard.actualGrade && (
                              <span className={"text-xs font-mono font-bold " + (GRADE_COLORS[stats.worstCard.actualGrade] ?? "text-zinc-400")}>
                                PSA {stats.worstCard.actualGrade}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-600">Paid</p><p className="text-white">${stats.worstCard.rawPrice.toFixed(2)}</p></div>
                          <div className="bg-zinc-800/40 rounded-lg p-2"><p className="text-zinc-600">Sold for</p><p className="text-white">${(stats.worstCard.soldPrice ?? 0).toFixed(2)}</p></div>
                          <div className="bg-red-500/10 rounded-lg p-2">
                            <p className="text-zinc-600">Profit</p>
                            <p className={"font-bold " + (actual.profit >= 0 ? "text-emerald-400" : "text-red-400")}>{actual.profit >= 0 ? "+" : ""}${actual.profit.toFixed(2)}</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-2">
                            <p className="text-zinc-600">ROI</p>
                            <p className={"font-bold " + (actual.roi >= 0 ? "text-emerald-400" : "text-red-400")}>{actual.roi >= 0 ? "+" : ""}{actual.roi.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "completed" && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                  {stats.completed.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-mono text-sm">No completed submissions yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left text-xs text-zinc-500 font-mono px-4 py-3">CARD</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">GRADE</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PAID</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">TOTAL COST</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">SOLD</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">PROFIT</th>
                            <th className="text-right text-xs text-zinc-500 font-mono px-4 py-3">ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.completed.map((s) => {
                            const actual = calcActual(s, fees.ebayFeePercent);
                            const totalCost = s.rawPrice + s.gradingFee + s.shippingCost;
                            const profitColor = actual ? (actual.profit >= 0 ? "text-emerald-400" : "text-red-400") : "text-zinc-600";
                            return (
                              <tr
                                key={s.id}
                                onClick={() => s.tcgPlayerId && router.push("/card/" + s.tcgPlayerId + "?from=" + encodeURIComponent("/profit"))}
                                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {s.image && <img src={s.image} alt={s.name} className="w-8 rounded flex-shrink-0" />}
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                      <p className="text-xs text-zinc-600 truncate">{s.set}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {s.actualGrade ? (
                                    <span className={"text-sm font-black font-mono " + (GRADE_COLORS[s.actualGrade] ?? "text-zinc-400")}>PSA {s.actualGrade}</span>
                                  ) : <span className="text-zinc-600 text-xs font-mono">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">${s.rawPrice.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-zinc-400">${totalCost.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">{s.soldPrice ? "$" + s.soldPrice.toFixed(2) : "—"}</td>
                                <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + profitColor}>
                                  {actual ? (actual.profit >= 0 ? "+" : "") + "$" + actual.profit.toFixed(2) : "—"}
                                </td>
                                <td className={"px-4 py-3 text-right text-sm font-mono font-bold " + profitColor}>
                                  {actual ? (actual.roi >= 0 ? "+" : "") + actual.roi.toFixed(0) + "%" : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-600 font-mono">
                          {stats.completed.length} completed · {stats.withSale.length} with sale data
                        </span>
                        <button onClick={exportToCSV} className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-1.5 rounded-lg transition-colors text-xs">
                          Export CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "grades" && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
                  {stats.completed.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-mono text-sm">No graded cards yet.</div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-6">
                        Grade breakdown — {stats.completed.length} cards graded
                      </p>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((grade) => {
                        const count = stats.gradeDistribution[grade] ?? 0;
                        if (count === 0) return null;
                        const pct = (count / stats.completed.length) * 100;
                        return (
                          <div key={grade} className="flex items-center gap-4">
                            <span className={"text-sm font-black font-mono w-14 flex-shrink-0 " + (GRADE_COLORS[grade] ?? "text-zinc-400")}>
                              PSA {grade}
                            </span>
                            <div className="flex-1 bg-zinc-800 rounded-full h-3 overflow-hidden">
                              <div
                                className={"h-full rounded-full transition-all " + (GRADE_BAR_COLORS[grade] ?? "bg-zinc-600")}
                                style={{ width: pct + "%" }}
                              />
                            </div>
                            <span className="text-sm font-mono text-zinc-300 w-20 text-right flex-shrink-0">
                              {count} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}