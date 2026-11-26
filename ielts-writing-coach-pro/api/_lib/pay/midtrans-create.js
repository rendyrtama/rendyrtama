// Creates a QRIS payment for a package and returns the QR code to show.
import { handler, requireUser, db, HttpError, newOrderId } from "../server.js";
import { midtransChargeQris } from "../payments.js";
import { PACKAGES } from "../../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg) throw new HttpError(400, "Unknown package.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "midtrans", amount: pkg.idr, currency: "IDR" });
  if (error) throw error;
  const qr = await midtransChargeQris(id, pkg.idr);
  // Midtrans gives the expiry as local Jakarta time ("YYYY-MM-DD HH:mm:ss"); store it as an exact time.
  const exp = qr.expiresAt ? new Date(qr.expiresAt.replace(" ", "T") + "+07:00") : null;
  const expiresAt = (exp && !isNaN(exp) ? exp : new Date(Date.now() + 15 * 60e3)).toISOString();
  // Keep the QR so the customer can reopen it from Purchase history (needs the qr_* columns, see supabase/schema.sql).
  const { error: e2 } = await db().from("orders").update({ qr_url: qr.qrUrl, qr_string: qr.qrString, expires_at: expiresAt }).eq("id", id);
  if (e2) console.warn("Could not save QR for reopening (run the orders migration in supabase/schema.sql)", e2.message);
  return { orderId: id, amount: pkg.idr, qrUrl: qr.qrUrl, qrString: qr.qrString, expiresAt };
});
