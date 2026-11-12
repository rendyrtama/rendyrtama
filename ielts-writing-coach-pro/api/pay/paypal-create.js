// Creates a PayPal order (USD, bundles only).
import { handler, requireUser, db, HttpError, newOrderId } from "../_lib/server.js";
import { paypal } from "../_lib/payments.js";
import { PACKAGES } from "../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg?.usd) throw new HttpError(400, "PayPal is available for the bundles only.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "paypal", amount: pkg.usd, currency: "USD" });
  if (error) throw error;
  const { httpOk, data } = await paypal("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",
    purchase_units: [{ reference_id: id, custom_id: id, description: `Writing Coach: ${pkg.label} (${pkg.credits} credits)`, amount: { currency_code: "USD", value: pkg.usd } }],
  });
  if (!httpOk || !data.id) { console.error("PayPal create failed", data); throw new HttpError(502, "Couldn't start the PayPal payment. Try again."); }
  await db().from("orders").update({ provider_ref: data.id }).eq("id", id);
  return { orderId: id, paypalOrderId: data.id };
});
