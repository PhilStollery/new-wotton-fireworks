import { HttpError } from "./http.mjs";
import { getRegistration } from "./tito.mjs";
import { openOrderToken } from "./security.mjs";

export function registrationIsUsable(registration) {
  return registration && !registration.refunded && !["cancelled", "customer_cancelled", "errored"].includes(registration.state);
}

export async function registrationFromToken(token) {
  const decoded = openOrderToken(token);
  const registration = await getRegistration(decoded.registrationSlug);
  if (!registration) throw new HttpError(404, "Booking not found");
  if (decoded.reference && registration.reference !== decoded.reference) throw new HttpError(400, "Booking token does not match this order");
  return registration;
}

export function quantitySummary(registration) {
  const q = registration?.quantities || {};
  return Object.entries(q).map(([slug, item]) => ({
    slug,
    title: item?.release || slug,
    quantity: Number(item?.quantity || 0)
  })).filter((item) => item.quantity > 0);
}
