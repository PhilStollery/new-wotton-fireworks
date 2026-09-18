import { getConfig } from "./config.mjs";
import { HttpError } from "./http.mjs";

const API = "https://api.tito.io/v3";

export async function titoRequest(path, options = {}) {
  const config = getConfig();
  if (!config.tito.apiToken) throw new HttpError(503, "Tito API token is not configured");
  const response = await fetch(`${API}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Token token=${config.tito.apiToken}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    const detail = body?.error || body?.message || `Tito API returned ${response.status}`;
    throw new HttpError(response.status >= 500 ? 502 : response.status, String(detail).slice(0, 240));
  }
  return body;
}

function eventBase(eventSlug) {
  const config = getConfig();
  return `/${encodeURIComponent(config.tito.accountSlug)}/${encodeURIComponent(eventSlug || config.tito.eventSlug)}`;
}

export async function getRegistration(slug, eventSlug) {
  const body = await titoRequest(`${eventBase(eventSlug)}/registrations/${encodeURIComponent(slug)}`);
  return body?.registration;
}

export async function updateRegistrationMetadata(slug, nextMetadata, eventSlug) {
  const registration = await getRegistration(slug, eventSlug);
  const metadata = { ...(registration?.metadata || {}), ...nextMetadata };
  const body = await titoRequest(`${eventBase(eventSlug)}/registrations/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: { registration: { metadata } }
  });
  return body?.registration;
}

export async function searchRegistrations(query, limit = 10, eventSlug) {
  const params = new URLSearchParams({ q: query, "page[size]": String(Math.min(limit, 20)) });
  const body = await titoRequest(`${eventBase(eventSlug)}/registrations?${params}`);
  return body?.registrations || [];
}

export async function getActivities(eventSlug) {
  const body = await titoRequest(`${eventBase(eventSlug)}/activities?page[size]=1000`);
  return body?.activities || [];
}

export async function getActivity(id, eventSlug) {
  const body = await titoRequest(`${eventBase(eventSlug)}/activities/${encodeURIComponent(id)}`);
  return body?.activity;
}

export async function getRelease(slug) {
  const body = await titoRequest(`${eventBase()}/releases/${encodeURIComponent(slug)}`);
  return body?.release;
}

export async function patchRelease(slug, changes) {
  const current = await getRelease(slug);
  if (!current) throw new HttpError(404, `Release not found: ${slug}`);
  const body = await titoRequest(`${eventBase()}/releases/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: { release: { title: current.title, ...changes } }
  });
  return body?.release;
}

export async function createRegistration({ eventSlug, name, email, releaseId, notify = true }) {
  const body = await titoRequest(`${eventBase(eventSlug)}/registrations`, {
    method: "POST",
    body: {
      registration: {
        name,
        email,
        notify,
        line_items: [{ release_id: releaseId, quantity: 1 }]
      }
    }
  });
  return body?.registration;
}
