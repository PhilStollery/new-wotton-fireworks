import QRCode from "qrcode";
import { getConfig } from "./_lib/config.mjs";
import { openOrderToken } from "./_lib/security.mjs";
import { text } from "./_lib/http.mjs";

export default async (request) => {
  try {
    const config = getConfig();
    const token = new URL(request.url).searchParams.get("token") || "";
    openOrderToken(token); // validates token/expiry before rendering
    const target = `${config.siteUrl}/gate?token=${encodeURIComponent(token)}`;
    const png = await QRCode.toBuffer(target, { type: "png", width: 640, margin: 2, errorCorrectionLevel: "M" });
    return new Response(png, {
      status: 200,
      headers: { "content-type": "image/png", "cache-control": "private, no-store, max-age=0" }
    });
  } catch {
    return text("QR code unavailable", 400);
  }
};
