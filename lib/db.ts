export async function dbGetWatchlist() {
  const res = await fetch("/api/db/watchlist");
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function dbAddToWatchlist(item: Record<string, unknown>) {
  const res = await fetch("/api/db/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return res.ok;
}

export async function dbRemoveFromWatchlist(tcgPlayerId: string) {
  const res = await fetch("/api/db/watchlist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tcgPlayerId }),
  });
  return res.ok;
}

export async function dbGetSubmissions() {
  const res = await fetch("/api/db/submissions");
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function dbSaveSubmission(submission: Record<string, unknown>) {
  const res = await fetch("/api/db/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
  return res.ok;
}

export async function dbDeleteSubmission(id: string) {
  const res = await fetch("/api/db/submissions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}