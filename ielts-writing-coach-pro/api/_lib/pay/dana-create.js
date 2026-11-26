// Creates a DANA QRIS payment for a package and returns the QRIS code to show.
import { handler, requireUser, db, HttpError, newOrderId } from "../server.js";
import QRCode from "qrcode";
import { danaCreateQris } from "../dana.js";
import { PACKAGES } from "../../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg) throw new HttpError(400, "Unknown package.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "dana", amount: pkg.idr, currency: "IDR" });
  if (error) {
    console.error("Order insert failed (run the DANA migration in supabase/schema.sql)", error.message);
    throw new HttpError(500, "Couldn't create the payment. Try again in a moment.");
  }
  const site = (process.env.SITE_URL || "https://www.writingcoach.id").replace(/\/+$/, "");
  const qr = await danaCreateQris({
    orderId: id, amount: pkg.idr, title: `Writing Coach credits - ${pkg.label}`,
    returnUrl: `${site}/`, notifyUrl: `${site}/api/pay/dana-notify`,
  });
  // Draw the QR here (an image the page shows as-is, like Midtrans's) so the page needs no QR library.
  const qrUrl = await QRCode.toDataURL(qr.qrString, { errorCorrectionLevel: "M", margin: 1, width: 480 });
  // Keep the code so the customer can reopen it from Purchase history.
  const { error: e2 } = await db().from("orders").update({ qr_url: qrUrl, qr_string: qr.qrString, expires_at: qr.expiresAt, provider_ref: qr.referenceNo }).eq("id", id);
  if (e2) console.warn("Could not save the DANA QR for reopening", e2.message);
  return { orderId: id, amount: pkg.idr, qrUrl, qrString: qr.qrString, expiresAt: qr.expiresAt };
});
