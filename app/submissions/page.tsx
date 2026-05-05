"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getSubmissions,
  addSubmission,
  updateSubmission,
  deleteSubmission,
  Submission,
  SubmissionStatus,
} from "@/lib/submissions";
import { useFees } from "@/lib/fees-context";
import Link from "next/link";

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string; next?: SubmissionStatus }> = {
  preparing:  { label: "📦 Preparing",  color: "text-zinc-400",    bg: "bg-zinc-800/50 border-zinc-700",           next: "shipped"  },
  shipped:    { label: "🚚 Shipped",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",        next: "received" },
  received:   { label: "📬 Received",   color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",    next: "grading"  },
  grading:    { label: "🔍 Grading",    color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",    next: "graded"   },
  graded:     { label: "⭐ Graded",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",  next: "returned" },
  returned:   { label: "✅ Returned",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",  next: undefined  },
};

const STATUS_ORDER: SubmissionStatus[] = ["preparing", "shipped", "received", "grading", "graded", "returned"];

function calcExpectedROI(s: Submission, fees: ReturnType<typeof useFees>["fees"]) {
  const totalCosts = s.rawPrice + s.gradingFee + s.shippingCost;
  const saleProceeds = s.psa10Price * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds };
}

function calcActualROI(s: Submission, fees: ReturnType<typeof useFees>["fees"]) {
  if (!s.soldPrice || !s.actualGrade) return null;
  const totalCosts = s.rawPrice + s.gradingFee + s.shippingCost;
  const saleProceeds = s.soldPrice * (1 - fees.ebayFeePercent / 100);
  const profit = saleProceeds - totalCosts;
  const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
  return { profit, roi, totalCosts, saleProceeds };
}

interface AddCardModalProps {
  onClose: () => void;
  onAdd: (s: Submission) => void;
  fees: ReturnType<typeof useFees>["fees"];
}

function AddCardModal({ onClose, onAdd, fees }: AddCardModalProps) {
  const [name, setName] = useState("");
  const [set, setSet] = useState("");
  const [number, setNumber] = useState("");
  const [rarity, setRarity] = useState("");
  const [rawPrice, setRawPrice] = useState(0);
  const [psa10Price, setPsa10Price] = useState(0);
  const [psa9Price, setPsa9Price] = useState(0);
  const [gradingFee, setGradingFee] = useState(fees.gradingFee);
  const [shippingCost, setShippingCost] = useState(fees.shippingToGrader + fees.shippingBack);
  const [submissionNumber, setSubmissionNumber] = useState("");
  const [notes, setNotes] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      tcgPlayerId: "",
      name: name.trim(),
      set: set.trim(),
      image: "",
      rarity: rarity.trim(),
      number: number.trim(),
      rawPrice,
      psa10Price,
      psa9Price,
      gradingFee,
      shippingCost,
      status: "preparing",
      submittedAt: new Date().toISOString(),
      submissionNumber: submissionNumber.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-800 rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Add Card to Tracker</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-zinc-500 font-mono mb-1">CARD NAME *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Charizard EX" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SET</label>
            <input value={set} onChange={(e) => setSet(e.target.value)} placeholder="e.g. XY Promos" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">CARD NUMBER</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. XY29" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">RAW PRICE PAID ($)</label>
            <input type="number" value={rawPrice} onChange={(e) => setRawPrice(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA 10 MARKET ($)</label>
            <input type="number" value={psa10Price} onChange={(e) => setPsa10Price(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA 9 MARKET ($)</label>
            <input type="number" value={psa9Price} onChange={(e) => setPsa9Price(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">GRADING FEE ($)</label>
            <input type="number" value={gradingFee} onChange={(e) => setGradingFee(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">SHIPPING COST ($)</label>
            <input type="number" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA SUBMISSION NUMBER</label>
            <input value={submissionNumber} onChange={(e) => setSubmissionNumber(e.target.value)} placeholder="Optional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-500 font-mono mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!name.trim()} className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}

interface UpdateModalProps {
  submission: Submission;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Submission>) => void;
}

function UpdateModal({ submission, onClose, onUpdate }: UpdateModalProps) {
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [actualGrade, setActualGrade] = useState(submission.actualGrade ?? 0);
  const [soldPrice, setSoldPrice] = useState(submission.soldPrice ?? 0);
  const [notes, setNotes] = useState(submission.notes ?? "");
  const [submissionNumber, setSubmissionNumber] = useState(submission.submissionNumber ?? "");

  function handleSave() {
    const updates: Partial<Submission> = { status, notes, submissionNumber };
    if (actualGrade > 0) updates.actualGrade = actualGrade;
    if (soldPrice > 0) updates.soldPrice = soldPrice;
    if (status === "graded" && !submission.gradedAt) updates.gradedAt = new Date().toISOString();
    if (status === "returned" && !submission.returnedAt) updates.returnedAt = new Date().toISOString();
    onUpdate(submission.id, updates);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Update Submission</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div>
          <p className="text-white font-bold">{submission.name}</p>
          <p className="text-zinc-500 text-xs">{submission.set}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">STATUS</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA SUBMISSION NUMBER</label>
            <input value={submissionNumber} onChange={(e) => setSubmissionNumber(e.target.value)} placeholder="Optional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>

          {(status === "graded" || status === "returned") && (
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-1">ACTUAL GRADE RECEIVED</label>
              <select
                value={actualGrade}
                onChange={(e) => setActualGrade(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none"
              >
                <option value={0}>Select grade...</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((g) => (
                  <option key={g} value={g}>PSA {g}</option>
                ))}
              </select>
            </div>
          )}

          {status === "returned" && (
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-1">SOLD PRICE ($) — optional</label>
              <input type="number" value={soldPrice} onChange={(e) => setSoldPrice(parseFloat(e.target.value) || 0)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Submissions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const { fees } = useFees();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setItems(getSubmissions());
  }, []);

  function handleAdd(s: Submission) {
    addSubmission(s);
    setItems(getSubmissions());
    setShowAddModal(false);
  }

  function handleUpdate(id: string, updates: Partial<Submission>) {
    updateSubmission(id, updates);
    setItems(getSubmissions());
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this card from the tracker?")) return;
    deleteSubmission(id);
    setItems(getSubmissions());
  }

  const filtered = useMemo(() => {
    return statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const stats = useMemo(() => {
    const totalInvested = items.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const returned = items.filter((i) => i.status === "returned" && i.soldPrice);
    const totalEarned = returned.reduce((s, i) => s + (i.soldPrice ?? 0) * (1 - fees.ebayFeePercent / 100), 0);
    const totalCostReturned = returned.reduce((s, i) => s + i.rawPrice + i.gradingFee + i.shippingCost, 0);
    const realizedProfit = totalEarned - totalCostReturned;
    return { totalInvested, realizedProfit, returned: returned.length, inProgress: items.filter(i => i.status !== "returned").length };
  }, [items, fees]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      {showAddModal && <AddCardModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} fees={fees} />}
      {updateTarget && <UpdateModal submission={updateTarget} onClose={() => setUpdateTarget(null)} onUpdate={handleUpdate} />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Back to Search</Link>
            <h1 className="text-4xl font-black mt-2">
              <span className="text-white">SUBMISSION </span>
              <span className="text-orange-400">TRACKER</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Track your PSA submissions from send to sale</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            + Add Card
          </button>
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white font-mono">{items.length}</p>
              <p className="text-xs text-zinc-600 mt-1">Total submitted</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-orange-400 font-mono">{stats.inProgress}</p>
              <p className="text-xs text-zinc-600 mt-1">In progress</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-yellow-400 font-mono">${stats.totalInvested.toFixed(0)}</p>
              <p className="text-xs text-zinc-600 mt-1">Total invested</p>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-black font-mono ${stats.realizedProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {stats.realizedProfit >= 0 ? "+" : ""}${stats.realizedProfit.toFixed(0)}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Realized profit</p>
            </div>
          </div>
        )}

        {/* Status filter */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setStatusFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors ${statusFilter === "all" ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white"}`}
            >
              All ({items.length})
            </button>
            {STATUS_ORDER.map((s) => {
              const count = items.filter((i) => i.status === s).length;
              if (count === 0) return null;
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors ${statusFilter === s ? `${cfg.bg} ${cfg.color}` : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white"}`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-zinc-500 font-mono text-sm mb-2">No submissions tracked yet</p>
            <p className="text-zinc-700 text-xs mb-6">Add cards you have sent or are planning to send to PSA</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              + Add Your First Card
            </button>
          </div>
        )}

        {/* Cards */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((item) => {
              const expected = calcExpectedROI(item, fees);
              const actual = calcActualROI(item, fees);
              const cfg = STATUS_CONFIG[item.status];
              return (
                <div key={item.id} className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition-colors">
                  <div className="flex items-start gap-4">

                    {/* Card info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-12 rounded flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white">{item.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {item.submissionNumber && (
                            <span className="text-xs text-zinc-600 font-mono">#{item.submissionNumber}</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">{item.set} · {item.rarity} · #{item.number}</p>
                        {item.notes && <p className="text-xs text-zinc-500 mt-1 italic">{item.notes}</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setUpdateTarget(item)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors font-mono"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors text-lg px-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="bg-zinc-800/40 rounded-lg p-3">
                      <p className="text-xs text-zinc-600 font-mono">Paid</p>
                      <p className="text-sm font-black text-white font-mono">${item.rawPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-800/40 rounded-lg p-3">
                      <p className="text-xs text-zinc-600 font-mono">Total cost</p>
                      <p className="text-sm font-black text-white font-mono">${expected.totalCosts.toFixed(2)}</p>
                    </div>
                    <div className="bg-yellow-400/5 border border-yellow-400/10 rounded-lg p-3">
                      <p className="text-xs text-yellow-400/60 font-mono">PSA 10 mkt</p>
                      <p className="text-sm font-black text-yellow-400 font-mono">
                        {item.psa10Price > 0 ? `$${item.psa10Price.toFixed(2)}` : "N/A"}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 border ${expected.profit >= 0 ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"}`}>
                      <p className="text-xs text-zinc-600 font-mono">Expected profit</p>
                      <p className={`text-sm font-black font-mono ${expected.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {item.psa10Price > 0 ? `${expected.profit >= 0 ? "+" : ""}$${expected.profit.toFixed(2)}` : "N/A"}
                      </p>
                    </div>

                    {/* Actual grade */}
                    {item.actualGrade && (
                      <div className="bg-zinc-800/40 rounded-lg p-3">
                        <p className="text-xs text-zinc-600 font-mono">Grade received</p>
                        <p className="text-sm font-black text-white font-mono">PSA {item.actualGrade}</p>
                      </div>
                    )}

                    {/* Actual profit */}
                    {actual && (
                      <div className={`rounded-lg p-3 border ${actual.profit >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                        <p className="text-xs text-zinc-600 font-mono">Actual profit</p>
                        <p className={`text-sm font-black font-mono ${actual.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {actual.profit >= 0 ? "+" : ""}${actual.profit.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="mt-4 flex items-center gap-1">
                    {STATUS_ORDER.map((s, idx) => {
                      const isActive = STATUS_ORDER.indexOf(item.status) >= idx;
                      const isCurrent = item.status === s;
                      return (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <div className={`h-1.5 flex-1 rounded-full transition-colors ${isActive ? "bg-yellow-400" : "bg-zinc-800"}`} />
                          {idx === STATUS_ORDER.length - 1 && (
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCurrent ? "bg-yellow-400" : isActive ? "bg-yellow-400" : "bg-zinc-800"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-zinc-700 font-mono">Preparing</span>
                    <span className="text-xs text-zinc-700 font-mono">Returned</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}