import { getConfig } from "./config.mjs";
import { HttpError } from "./http.mjs";

const API = "https://checkin.tito.io/checkin_lists";

function slug() {
  const value = getConfig().tito.checkinListSlug;
  if (!value) throw new HttpError(503, "Tito check-in list is not configured");
  return value;
}

async function checkinRequest(path, options = {}) {
  const response = await fetch(`${API}/${encodeURIComponent(slug())}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) throw new HttpError(response.status >= 500 ? 502 : response.status, `Tito check-in API returned ${response.status}`);
  return body;
}

export async function getActiveCheckins() {
  const list = await checkinRequest("");
  const pages = Math.max(1, Number(list?.total_checkin_pages || 1));
  const rows = [];
  for (let page = 1; page <= pages; page += 1) {
    const batch = await checkinRequest(`/checkins?page=${page}`);
    if (Array.isArray(batch)) rows.push(...batch);
  }
  return rows.filter((item) => !item.deleted_at);
}

export async function createCheckins(ticketSlugs) {
  const slugs = [...new Set(ticketSlugs.filter(Boolean))];
  if (!slugs.length) return [];
  const checkins = Object.fromEntries(slugs.map((ticketSlug, index) => [String(index), { ticket_slug: ticketSlug }]));
  return await checkinRequest("/checkins", { method: "POST", body: { batch: { checkins } } });
}

export async function deleteCheckins(uuids) {
  const results = [];
  for (const uuid of [...new Set(uuids.filter(Boolean))]) {
    results.push(await checkinRequest(`/checkins/${encodeURIComponent(uuid)}`, { method: "DELETE" }));
  }
  return results;
}
