import { getConfig } from "./config.mjs";
import { HttpError } from "./http.mjs";

const API = "https://api.tito.io/v3";
const TITO_TIMEOUT_MS = 8_000;

export async function titoRequest(path, options = {}) {
  const config = getConfig();
  if (!config.tito.apiToken) throw new HttpError(503, "Tito API token is not configured");

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Token token=${config.tito.apiToken}`,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.timeoutMs || TITO_TIMEOUT_MS)
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new HttpError(504, "Tito API timed out");
    }
    throw new HttpError(502, "Tito API could not be reached");
  }

  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
  if (!response.ok) {
    const detail = body?.error || body?.message || `Tito API returned ${response.status}`;
    const mappedStatus = response.status === 429 ? 503 : (response.status >= 500 ? 502 : response.status);
    throw new HttpError(mappedStatus, String(detail).slice(0, 240));
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

export async function updateRegistrationMetadata(slug, nextMetadata, eventSlug, currentRegistration = null) {
  const registration = currentRegistration || await getRegistration(slug, eventSlug);
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

export async function getReleases(eventSlug) {
  // Expand Activities so preview/test mode can group the real ticket releases
  // without relying on the old Test Wave release names. Tito v3.1 hides nested
  // resources by default; v3.0 safely ignores/accepts the expand parameter.
  const body = await titoRequest(`${eventBase(eventSlug)}/releases?page[size]=1000&expand=activities`);
  return body?.releases || [];
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
