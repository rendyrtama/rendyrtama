// Creates a Xendit QRIS payment for a package and returns the QR code to show.
import QRCode from "qrcode";
import { handler, requireUser, db, HttpError, newOrderId } from "../_lib/server.js";
import { xenditCreateQris } from "../_lib/xendit.js";
import { PACKAGES } from "../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg) throw new HttpError(400, "Unknown package.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "xendit", amount: pkg.idr, currency: "IDR" });
  if (error) {
    console.error("Order insert failed (run the Xendit migration in supabase/schema.sql)", error.message);
    throw new HttpError(500, "Couldn't create the payment. Try again in a moment.");
  }
  const pr = await xenditCreateQris({ orderId: id, amount: pkg.idr, description: `Writing Coach credits - ${pkg.label}` });
  // Draw the QR here so the page shows an image and needs no QR library.
  const qrUrl = await QRCode.toDataURL(pr.qrString, { errorCorrectionLevel: "M", margin: 1, width: 480 });
  // provider_ref keeps Xendit's payment request id (needed for status checks); the QR lets the customer reopen it.
  const { error: e2 } = await db().from("orders").update({ provider_ref: pr.id, qr_url: qrUrl, qr_string: pr.qrString, expires_at: pr.expiresAt }).eq("id", id);
  if (e2) { console.error("Could not save the Xendit payment request id", e2.message); throw new HttpError(500, "Couldn't create the payment. Try again in a moment."); }
  return { orderId: id, amount: pkg.idr, qrUrl, qrString: pr.qrString, expiresAt: pr.expiresAt };
});
