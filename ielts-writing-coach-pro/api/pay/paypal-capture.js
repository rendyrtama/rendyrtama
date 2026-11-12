// Captures an approved PayPal order and adds the credits.
import { handler, requireUser, db, HttpError } from "../_lib/server.js";
import { paypal, creditOrder } from "../_lib/payments.js";
import { profileOf } from "../me.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const { data: order, error } = await db().from("orders").select("*").eq("id", String(body.orderId || "")).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!order || order.provider !== "paypal" || !order.provider_ref) throw new HttpError(404, "Order not found.");
  if (order.status === "paid") return { status: "paid", ...(await profileOf(user.id)) };

  let { httpOk, data } = await paypal(`/v2/checkout/orders/${order.provider_ref}/capture`, "POST");
  if (!httpOk && data?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") ({ data } = await paypal(`/v2/checkout/orders/${order.provider_ref}`));
  const unit = data?.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  const ok = data?.status === "COMPLETED" && cap?.status === "COMPLETED" && cap.amount?.currency_code === "USD"
    && Number(cap.amount.value) === Number(order.amount) && (unit.custom_id || unit.reference_id) === order.id;
  if (!ok) { console.error("PayPal capture not completed", order.id, data); throw new HttpError(402, "PayPal didn't complete the payment. You have not been charged for credits."); }
  await creditOrder(order.id, cap.id);
  return { status: "paid", ...(await profileOf(user.id)) };
});
