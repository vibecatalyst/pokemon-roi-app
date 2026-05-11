"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { mapApiCard } from "@/lib/api";
import { useFees } from "@/lib/fees-context";
import { useWatchlist } from "@/lib/watchlist-context";
import { useSubmissions } from "@/lib/submissions-context";
import { Submission } from "@/lib/submissions";
import WatchlistPicker from "@/components/WatchlistPicker";
import PriceChart from "@/components/PriceChart";
import CardResult from "@/components/CardResult";

type MappedCard = ReturnType<typeof mapApiCard>;
type PriceHistory = Record<string, Record<string, { average: number; count: number }>>;

interface SubmitModalProps {
  card: MappedCard;
  fees: ReturnType<typeof useFees>["fees"];
  onClose: () => void;
  onSubmit: (submission: Submission) => void;
}

function SubmitModal({ card, fees, onClose, onSubmit }: SubmitModalProps) {
  const [rawPrice, setRawPrice] = useState(card.rawPrice);
  const [psa10Price, setPsa10Price] = useState(card.psa10Price);
  const [psa9Price, setPsa9Price] = useState(card.psa9Price ?? 0);
  const [gradingFee, setGradingFee] = useState(fees.gradingFee);
  const [shippingCost, setShippingCost] = useState(fees.shippingToGrader + fees.shippingBack);
  const [submissionNumber, setSubmissionNumber] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    onSubmit({
      id: crypto.randomUUID(),
      tcgPlayerId: card.tcgPlayerId,
      name: card.name,
      set: card.set,
      image: card.image,
      rarity: card.rarity,
      number: card.number,
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

  const totalCost = rawPrice + gradingFee + shippingCost;
  const proceeds = psa10Price * (1 - fees.ebayFeePercent / 100);
  const profit = proceeds - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitColor = profit >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Add to Submission Tracker</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="flex items-center gap-3 bg-zinc-800/40 rounded-xl p-3">
          {card.image && <img src={card.image} alt={card.name} className="w-12 rounded flex-shrink-0" />}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{card.name}</p>
            <p className="text-xs text-zinc-500 truncate">{card.set} · {card.rarity} · #{card.number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-xs text-zinc-500 font-mono mb-1">PSA SUBMISSION #</label>
            <input value={submissionNumber} onChange={(e) => setSubmissionNumber(e.target.value)} placeholder="Optional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-500 font-mono mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
          </div>
        </div>

        {rawPrice > 0 && psa10Price > 0 && (
          <div className="bg-zinc-800/40 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <p className="text-zinc-600">Total cost</p>
              <p className="text-white font-bold">${totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-600">Proceeds (PSA 10)</p>
              <p className="text-white font-bold">${proceeds.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-600">Expected profit</p>
              <p className={"font-bold " + profitColor}>{profit >= 0 ? "+" : ""}${profit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-600">Expected ROI</p>
              <p className={"font-bold " + profitColor}>{roi >= 0 ? "+" : ""}{roi.toFixed(0)}%</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 bg-orange-400 hover:bg-orange-300 text-black font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">
            Add to Tracker
          </button>
        </div>
      </div>
    </div>
  );
}

function CardDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const fromUrl = searchParams.get("from") ?? "/";
  const { fees } = useFees();
  const { isWatched, removeItem } = useWatchlist();
  const { addItem: addSubmissionItem } = useSubmissions();
  const watched = isWatched(id);

  const [card, setCard] = useState<MappedCard | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showWatchlistPicker, setShowWatchlistPicker] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch("/api/card?id=" + id)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data;
        const cardData = Array.isArray(raw) ? raw[0] : raw;
        if (!cardData) { setError("Card not found."); return; }
        setCard(mapApiCard(cardData as Record<string, unknown>));
        const ebay = (cardData.ebay as Record<string, unknown>) ?? {};
        const history = (ebay.priceHistory as PriceHistory) ?? {};
        setPriceHistory(history);
      })
      .catch(() => setError("Failed to load card data."))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleWatchlist() {
    if (!card) return;
    if (watched) {
      await removeItem(card.tcgPlayerId);
    } else {
      setShowWatchlistPicker(true);
    }
  }

  function openPsaPop() {
    if (!card) return;
    window.open("https://www.psacard.com/pop/trading-card-games/0/pokemon?q=" + encodeURIComponent(card.name), "_blank");
  }

  function openTcgPlayer() {
    if (!card) return;
    window.open("https://www.tcgplayer.com/product/" + card.tcgPlayerId, "_blank");
  }

  function getBackLabel() {
    if (fromUrl.startsWith("/leaderboard")) return "← Back to Leaderboard";
    if (fromUrl.startsWith("/watchlist")) return "← Back to Watchlist";
    if (fromUrl.startsWith("/trending")) return "← Back to Trending";
    if (fromUrl.startsWith("/submissions")) return "← Back to Submissions";
    if (fromUrl.startsWith("/profit")) return "← Back to Profit";
    if (fromUrl.startsWith("/?q=")) return "← Back to Search Results";
    return "← Back";
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>

      {showWatchlistPicker && card && (
        <WatchlistPicker
          card={{
            tcgPlayerId: card.tcgPlayerId,
            name: card.name,
            set: card.set,
            image: card.image,
            rawPrice: card.rawPrice,
            psa10Price: card.psa10Price,
            psa9Price: card.psa9Price ?? 0,
            rarity: card.rarity,
            number: card.number,
            addedAt: new Date().toISOString(),
          }}
          onClose={() => setShowWatchlistPicker(false)}
        />
      )}

      {showSubmitModal && card && (
        <SubmitModal
          card={card}
          fees={fees}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={async (submission) => {
            await addSubmissionItem(submission);
            setShowSubmitModal(false);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
          }}
        />
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <button
            onClick={() => router.push(fromUrl)}
            className="text-zinc-400 hover:text-white text-sm font-semibold transition-colors"
          >
            {getBackLabel()}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {submitSuccess && (
              <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                Added to submissions!
              </span>
            )}

            {card && (
              <button
                onClick={openPsaPop}
                className="text-sm px-3 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors font-semibold"
              >
                PSA Pop
              </button>
            )}

            {card && (
              <button
                onClick={openTcgPlayer}
                className="text-sm px-3 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 transition-colors font-semibold"
              >
                TCGPlayer
              </button>
            )}

            {card && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="text-sm px-3 py-2 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:border-orange-500/60 transition-colors font-semibold"
              >
                + Submit to PSA
              </button>
            )}

            {card && (
              <button
                onClick={toggleWatchlist}
                className={"px-4 py-2 rounded-lg border text-sm font-semibold transition-colors " +
                  (watched
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-blue-500/40 hover:text-blue-300")}
              >
                {watched ? "★ Watching" : "☆ Watchlist"}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="text-4xl mb-4 animate-spin inline-block">⚡</div>
            <p className="text-zinc-400 font-semibold text-sm">Loading card data...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4 font-semibold">
            {error}
          </div>
        )}

        {card && (
          <div className="space-y-6">
            <CardResult card={card} fees={fees} />
            <PriceChart priceHistory={priceHistory} rawPrice={card.rawPrice} cardName={card.name} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function CardDetail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-zinc-400 font-semibold text-sm">Loading...</div>
      </div>
    }>
      <CardDetailInner />
    </Suspense>
  );
}