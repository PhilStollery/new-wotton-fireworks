import { json, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { requireGateStaff, sealOrderToken } from "./_lib/security.mjs";
import { searchRegistrations } from "./_lib/tito.mjs";

export default async (request) => {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    requireGateStaff(request);
    const q = (new URL(request.url).searchParams.get("q") || "").trim();
    if (q.length < 2) throw new HttpError(400, "Enter at least two characters");
    const results = await searchRegistrations(q, 10);
    return json({ ok: true, results: results.map((r) => ({
      reference: r.reference,
      name: r.name,
      email: r.email,
      state: r.state,
      ticketCount: r.tickets_count,
      token: sealOrderToken({ registrationSlug: r.slug, reference: r.reference })
    })) });
  } catch (error) {
    return toErrorResponse(error);
  }
};
