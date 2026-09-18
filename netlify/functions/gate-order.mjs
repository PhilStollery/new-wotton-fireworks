import { json, HttpError, toErrorResponse } from "./_lib/http.mjs";
import { requireGateStaff } from "./_lib/security.mjs";
import { registrationFromToken } from "./_lib/order.mjs";
import { getActiveCheckins } from "./_lib/checkin.mjs";

export default async (request) => {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  try {
    requireGateStaff(request);
    const token = new URL(request.url).searchParams.get("token");
    if (!token) throw new HttpError(400, "Missing order token");
    const registration = await registrationFromToken(token);
    const checkins = await getActiveCheckins();
    const byTicket = new Map(checkins.map((item) => [Number(item.ticket_id), item]));
    const tickets = (registration.tickets || []).map((ticket) => {
      const checkin = byTicket.get(Number(ticket.id));
      return {
        id: ticket.id,
        slug: ticket.slug,
        reference: ticket.reference,
        releaseTitle: ticket.release_title,
        state: ticket.state,
        checkedIn: Boolean(checkin),
        checkinUuid: checkin?.uuid || null
      };
    });
    return json({
      ok: true,
      order: {
        reference: registration.reference,
        name: registration.name,
        email: registration.email,
        state: registration.state,
        refunded: Boolean(registration.refunded),
        tickets
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
