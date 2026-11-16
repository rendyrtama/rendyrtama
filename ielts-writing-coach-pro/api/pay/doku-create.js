// Creates a DOKU Checkout (QRIS) payment for a package and returns the payment page link.
import { handler, requireUser, db, HttpError, newOrderId } from "../_lib/server.js";
import { dokuCreateCheckout } from "../_lib/doku.js";
import { PACKAGES } from "../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg) throw new HttpError(400, "Unknown package.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "doku", amount: pkg.idr, currency: "IDR" });
  if (error) {
    console.error("Order insert failed (run the DOKU migration in supabase/schema.sql)", error.message);
    throw new HttpError(500, "Couldn't create the payment. Try again in a moment.");
  }
  const site = (process.env.SITE_URL || `https://${req.headers["x-forwarded-host"] || req.headers.host}`).replace(/\/+$/, "");
  const page = await dokuCreateCheckout({
    orderId: id, amount: pkg.idr,
    itemName: `Writing Coach credits - ${pkg.label}`,
    callbackUrl: `${site}/?order=${encodeURIComponent(id)}`,
  });
  // Keep the link so the customer can reopen it from Purchase history.
  const { error: e2 } = await db().from("orders").update({ pay_url: page.url, expires_at: page.expiresAt }).eq("id", id);
  if (e2) console.warn("Could not save the DOKU link for reopening", e2.message);
  return { orderId: id, amount: pkg.idr, payUrl: page.url, expiresAt: page.expiresAt };
});
