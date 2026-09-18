import { getConfig } from "./config.mjs";
import { HttpError } from "./http.mjs";
import { quantitySummary } from "./order.mjs";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

export function buildConfirmation(registration, token) {
  const config = getConfig();
  const summary = quantitySummary(registration);
  const lines = summary.map((item) => `${item.quantity} × ${item.title}`);
  const list = summary.map((item) => `<li>${item.quantity} × ${esc(item.title)}</li>`).join("");
  const qrImage = `${config.siteUrl}/api/group-qr?token=${encodeURIComponent(token)}`;
  const afterBooking = `${config.siteUrl}/after-booking?token=${encodeURIComponent(token)}`;
  const visit = `${config.siteUrl}/#visit`;

  const text = [
    "You're booked for Wotton-under-Edge Firework Display 2026.",
    "Saturday 7 November 2026",
    "Wotton Community PARC",
    `Order: ${registration.reference}`,
    "",
    "Your booking:",
    ...lines,
    "",
    "Show the group QR code in this email at the gate. It covers this booking, so you do not need a separate email for every person in your group.",
    "If only part of the group arrives together, gate staff can check in the people who are present and leave the remaining tickets available for later.",
    "Children under 16 must attend with a responsible adult aged 18 or over.",
    "",
    `A couple of quick choices after booking: ${afterBooking}`,
    `Plan your visit: ${visit}`,
    "Questions: wotton@roundtable.org.uk"
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#1D1D1A"><h1 style="font-size:24px">You're booked for Wotton-under-Edge Firework Display 2026</h1><p><strong>Saturday 7 November 2026</strong><br>Wotton Community PARC<br>Order: ${esc(registration.reference)}</p><h2 style="font-size:18px">Your booking</h2><ul>${list}</ul><p><strong>Show this group QR code at the gate.</strong> It covers this booking, so you do not need a separate email for every person in your group.</p><p><img src="${qrImage}" alt="Group booking QR code" width="260" height="260"></p><p>If only part of the group arrives together, gate staff can check in the people who are present and leave the remaining tickets available for later.</p><p>Children under 16 must attend with a responsible adult aged 18 or over.</p><p><a href="${afterBooking}">A couple of quick choices after booking</a></p><p><a href="${visit}">Plan your visit</a></p><p>Questions: <a href="mailto:wotton@roundtable.org.uk">wotton@roundtable.org.uk</a></p></body></html>`;
  return { subject: "Your Wotton Firework Display 2026 booking", text, html };
}

export async function deliverEmail({ to, subject, text, html }) {
  const config = getConfig();
  if (!config.email.deliveryUrl || !config.email.from) throw new HttpError(503, "Transactional email delivery is not configured");
  const response = await fetch(config.email.deliveryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.email.deliveryToken ? { Authorization: `Bearer ${config.email.deliveryToken}` } : {})
    },
    body: JSON.stringify({ from: config.email.from, to, subject, text, html })
  });
  if (!response.ok) throw new HttpError(502, `Transactional email service returned ${response.status}`);
}
