// Payment Notification URL for Midtrans (set it in the Midtrans dashboard).
// A notification is only a signal: credits are added after the app asks Midtrans directly
// (with its own server key) for the order's real status and checks the amount. So a forged
// notification can't add credits; at most it makes the app look up an order that exists.
import { handler, db } from "../_lib/server.js";
import { midtransSignatureOk, midtransStatus, applyMidtransStatus } from "../_lib/payments.js";

export default handler(["POST"], async (req, body) => {
  const orderId = typeof body?.order_id === "string" ? body.order_id : "";
  if (!/^WC-[A-Z0-9-]{5,40}$/.test(orderId)) return { ok: true };       // not one of our order numbers
  const verified = midtransSignatureOk(body);
  const { data: order } = await db().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.provider !== "midtrans") return { ok: true };   // not ours: acknowledge so Midtrans stops retrying
  if (order.status === "paid") return { ok: true };                    // already credited
  const status = await applyMidtransStatus(order, await midtransStatus(order.id));
  console.log(verified ? "Midtrans notification verified" : "Midtrans notification confirmed with Midtrans API (signature not checked)",
    { order_id: orderId, notified: body.transaction_status, result: status });
  return { ok: true };
});
