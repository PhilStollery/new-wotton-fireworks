import { json, readJson, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { requireGateStaff } from "./_lib/security.mjs";
import { registrationFromToken, registrationIsUsable } from "./_lib/order.mjs";
import { getActiveCheckins, createCheckins, deleteCheckins } from "./_lib/checkin.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    requireGateStaff(request);
    const { token, action, ticketSlugs = [], checkinUuids = [] } = await readJson(request);
    const registration = await registrationFromToken(token);
    if (!registrationIsUsable(registration)) throw new HttpError(409, "This booking is cancelled or refunded");
    const owned = new Set((registration.tickets || []).filter((t) => t.state !== "void").map((t) => t.slug));
    const active = await getActiveCheckins();
    const activeByTicket = new Map(active.map((c) => [Number(c.ticket_id), c]));
    const activeUuids = new Set(active.map((c) => c.uuid));

    if (action === "checkin") {
      const requested = ticketSlugs.filter((slug) => owned.has(slug));
      if (!requested.length) throw new HttpError(400, "No valid tickets selected");
      const currentTicketSlugs = new Set((registration.tickets || []).filter((t) => activeByTicket.has(Number(t.id))).map((t) => t.slug));
      await createCheckins(requested.filter((slug) => !currentTicketSlugs.has(slug)));
    } else if (action === "reverse") {
      const uuids = checkinUuids.filter((uuid) => activeUuids.has(uuid));
      if (!uuids.length) throw new HttpError(400, "No valid check-ins selected");
      await deleteCheckins(uuids);
    } else {
      throw new HttpError(400, "Invalid gate action");
    }
    return json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
};
