"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSubmissions } from "@/lib/submissions-context";
import { Submission, SubmissionStatus } from "@/lib/submissions";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

const STATUS_OPTIONS: { value: SubmissionStatus; label: string; color: string }[] = [
  { value: "preparing", label: "📦 Preparing", color: "text-zinc-400" },
  { value: "shipped", label: "🚚 Shipped", color: "text-blue-400" },
  { value: "received", label: "📬 Received", color: "text-yellow-400" },
  { value: "grading", label: "🔍 Grading", color: "text-orange-400" },
  { value: "graded", label: "⭐ Graded", color: "text-purple-400" },
  { value: "returned", label: "✅ Returned", color: "text-emerald-400" },
];

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
  return <span className={"text-xs font-mono font-bold " + opt.color}>{opt.label}</span>;
}

interface EditModalProps {
  submission: Submission;
  onSave: (s: Submission) => void;
  onClose: () => void;
}

function EditModal({ submission, onSave, onClose }: EditModalProps) {
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [actualGrade, setActualGrade] = useState(submission.actualGrade ?? 0);
  const [soldPrice, setSoldPrice] = useState(submission.soldPrice ?? 0);
  const [submissionNumber, setSubmissionNumber] = useState(submission.submissionNumber ?? "");
  const [notes, setNotes] = useState(submission.notes ?? "");
  const [rawPrice, setRawPrice] = useState(submission.rawPrice);
  const [psa10Price, setPsa10Price] = useState(submission.psa10Price);
  const [gradingFee, setGradingFee] = useState(submission.gradingFee);
  const [shippingCost, setShippingCost] = useState(submission.shippingCost);

  function handleSave() {
    onSave({
      ...submission,
      status,
      actualGrade: actualGrade > 0 ? actualGrade : undefined,
      soldPrice: soldPrice > 0 ? soldPrice : undefined,
      submissionNumber: submissionNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      rawPrice,
      psa10Price,
      gradingFee,
      shippingCost,
      gradedAt: status === "graded" || status === "returned" ? (submission.gradedAt ?? new Date().toISOString()) : undefined,
      returnedAt: status === "returned" ? (submission.returnedAt ?? new Date().toISOString()) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Update Submission</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="flex items-center gap-3 bg-zinc-800/40 rounded-xl p-3">
          {submission.image && <img src={submission.image} alt={submission.name} className="w-12 rounded flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{submission.name}</p>
            <p className="text-xs text-zinc-500 truncate">{submission.set} · #{submission.number}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-2">STATUS</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={"px-3 py-2 rounded-lg border text-sm font-mono transition-colors text-left " +
                  (status === opt.value
                    ? "bg-zinc-700 border-zinc-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RAW PRICE ($)</label>
            <input type="number" value={rawPrice} onChange={(e) => setRawPrice(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA 10 PRICE ($)</label>
            <input type="number" value={psa10Price} onChange={(e) => setPsa10Price(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">GRADING FEE ($)</label>
            <input type="number" value={gradingFee} onChange={(e) => setGradingFee(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SHIPPING ($)</label>
            <input type="number" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          {(status === "graded" || status === "returned") && (
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-1">ACTUAL GRADE</label>
              <input type="number" min={1} max={10} value={actualGrade || ""} placeholder="1-10" onChange={(e) => setActualGrade(parseInt(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
            </div>
          )}
          {status === "returned" && (
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-1">SOLD PRICE ($)</label>
              <input type="number" value={soldPrice || ""} placeholder="0.00" onChange={(e) => setSoldPrice(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
            </div>
          )}
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA SUB #</label>
            <input value={submissionNumber} onChange={(e) => setSubmissionNumber(e.target.value)} placeholder="Optional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-500 font-mono mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function Submissions() {
  const { submissions, loading, updateItem, deleteItem } = useSubmissions();
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "cost" | "profit">("date");
  const { fees } = useFees();
  const router = useRouter();

  function calcExpected(s: Submission) {
    const totalCost = s.rawPrice + s.gradingFee + s.shippingCost;
    const proceeds = s.psa10Price * (1 - fees.ebayFeePercent / 100);
    const profit = proceeds - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalCost, proceeds, profit, roi };
  }

  function calcActual(s: Submission) {
    if (!s.soldPrice) return null;
    const totalCost = s.rawPrice + s.gradingFee + s.shippingCost;
    const proceeds = s.soldPrice * (1 - fees.ebayFeePercent / 100);
    const profit = proceeds - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalCost, proceeds, profit, roi };
  }

  const filtered = useMemo(() => {
    return submissions
      .filter(s => statusFilter === "all" || s.status === statusFilter)
      .sort((a, b) => {
        if (sortBy === "date") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "cost") return (b.rawPrice + b.gradingFee + b.shippingCost) - (a.rawPrice + a.gradingFee + a.shippingCost);
        const pa = calcExpected(a).profit;
        const pb = calcExpected(b).profit;
        return pb - pa;
      });
  }, [submissions, statusFilter, sortBy, fees]);

  const stats = useMemo(() => {
    const active = submissions.filter(s => s.status !== "returned");
    const returned = submissions.filter(s => s.status === "returned");
    const totalInvested = active.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const totalExpectedProfit = active.filter(s => s.psa10Price > 0).reduce((s, i) => s + calcExpected(i).profit, 0);
    const realizedProfit = returned.filter(s => s.soldPrice).reduce((s, i) => {
      const a = calcActual(i);
      return s + (a?.profit ?? 0);
    }, 0);
    return { active, returned, totalInvested, totalExpectedProfit, realizedProfit };
  }, [submissions, fees]);

  async function handleSave(updated: Submission) {
    await updateItem(updated);
    setEditingSubmission(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this submission?")) return;
    await deleteItem(id);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      {editingSubmission && (
        <EditModal
          submission={editingSubmission}
          onSave={handleSave}
          onClose={() => setEditingSubmission(null)}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Home</Link>
          <h1 className="text-4xl font-black mt-2">
            <span className="text-white">PSA </span>
            <span className="text-orange-400">SUBMISSIONS</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-500 text-sm">Track your grading submissions and returns</p>
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
              ☁ Synced
            </span>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-2xl mb-2 animate-spin inline-block">⟳</div>
            <p className="text-zinc-500 font-mono text-sm">Loading from cloud...</p>
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-zinc-500 font-mono text-sm mb-2">No submissions yet</p>
            <p className="text-zinc-700 text-xs mb-6">Click a card and use the Submit to PSA button to track your submissions</p>
            <Link href="/" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm">
              Find Cards to Grade
            </Link>
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-white font-mono">{submissions.length}</p>
                <p className="text-xs text-zinc-600 mt-1">Total submitted</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-orange-400 font-mono">{stats.active.length}</p>
                <p className="text-xs text-zinc-600 mt-1">In progress</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-yellow-400 font-mono">${stats.totalInvested.toFixed(0)}</p>
                <p className="text-xs text-zinc-600 mt-1">Capital at risk</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className={"text-2xl font-black font-mono " + (stats.totalExpectedProfit >= 0 ? "text-blue-400" : "text-red-400")}>
                  {stats.totalExpectedProfit >= 0 ? "+" : ""}${stats.totalExpectedProfit.toFixed(0)}
                </p>
                <p className="text-xs text-zinc-600 mt-1">Expected profit</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                <p className={"text-2xl font-black font-mono " + (stats.realizedProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {stats.realizedProfit >= 0 ? "+" : ""}${stats.realizedProfit.toFixed(0)}
                </p>
                <p className="text-xs text-zinc-600 mt-1">Realized profit</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={"px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors " + (statusFilter === "all" ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white")}
                >
                  All ({submissions.length})
                </button>
                {STATUS_OPTIONS.map(opt => {
                  const count = submissions.filter(s => s.status === opt.value).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={"px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors " + (statusFilter === opt.value ? "bg-zinc-700 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white")}
                    >
                      {opt.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-zinc-500 font-mono">SORT</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none font-mono"
                >
                  <option value="date">Date Added</option>
                  <option value="name">Name</option>
                  <option value="cost">Total Cost</option>
                  <option value="profit">Expected Profit</option>
                </select>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {filtered.map((sub) => {
                const expected = calcExpected(sub);
                const actual = calcActual(sub);
                const profitColor = expected.profit >= 0 ? "text-emerald-400" : "text-red-400";

                return (
                  <div key={sub.id} className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 transition-colors">
                    <div className="flex items-start gap-4 flex-wrap">

                      {/* Card image + info */}
                      <div
                        className="flex items-center gap-3 flex-1 min-w-48 cursor-pointer"
                        onClick={() => sub.tcgPlayerId && router.push("/card/" + sub.tcgPlayerId + "?from=" + encodeURIComponent("/submissions"))}
                      >
                        {sub.image && <img src={sub.image} alt={sub.name} className="w-14 rounded flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{sub.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{sub.set} · {sub.rarity} · #{sub.number}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <StatusBadge status={sub.status} />
                            {sub.submissionNumber && (
                              <span className="text-xs text-zinc-600 font-mono">Sub #{sub.submissionNumber}</span>
                            )}
                            {sub.actualGrade && (
                              <span className="text-xs font-bold font-mono text-yellow-400">PSA {sub.actualGrade}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="flex gap-4 flex-wrap text-xs font-mono">
                        <div>
                          <p className="text-zinc-600">Paid</p>
                          <p className="text-white font-bold">${sub.rawPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">Total cost</p>
                          <p className="text-white font-bold">${expected.totalCost.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600">PSA 10 market</p>
                          <p className="text-yellow-400 font-bold">{sub.psa10Price > 0 ? "$" + sub.psa10Price.toFixed(2) : "—"}</p>
                        </div>
                        {sub.psa10Price > 0 && (
                          <div>
                            <p className="text-zinc-600">Expected profit</p>
                            <p className={"font-bold " + profitColor}>{expected.profit >= 0 ? "+" : ""}${expected.profit.toFixed(2)}</p>
                          </div>
                        )}
                        {actual && (
                          <div>
                            <p className="text-zinc-600">Actual profit</p>
                            <p className={"font-bold " + (actual.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {actual.profit >= 0 ? "+" : ""}${actual.profit.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {sub.soldPrice && (
                          <div>
                            <p className="text-zinc-600">Sold for</p>
                            <p className="text-white font-bold">${sub.soldPrice.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditingSubmission(sub)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-colors font-mono"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="text-xs bg-zinc-800 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/40 text-zinc-500 hover:text-red-400 font-bold px-3 py-1.5 rounded-lg transition-colors font-mono"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {sub.notes && (
                      <p className="mt-3 text-xs text-zinc-600 font-mono border-t border-zinc-800/50 pt-3">
                        📝 {sub.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-zinc-600 font-mono text-sm">
                No submissions match this filter.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}