export async function dbGetWatchlist(watchlistId?: string) {
  const url = watchlistId ? "/api/db/watchlist?watchlist_id=" + watchlistId : "/api/db/watchlist";
  const res = await fetch(url);
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

export async function dbRemoveFromWatchlist(tcgPlayerId: string, watchlistId?: string) {
  const res = await fetch("/api/db/watchlist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tcgPlayerId, watchlistId }),
  });
  return res.ok;
}

export async function dbGetWatchlists() {
  const res = await fetch("/api/db/watchlists");
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function dbCreateWatchlist(name: string) {
  const res = await fetch("/api/db/watchlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function dbDeleteWatchlist(id: string) {
  const res = await fetch("/api/db/watchlists", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.ok;
}

export async function dbRenameWatchlist(id: string, name: string) {
  const res = await fetch("/api/db/watchlists", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
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