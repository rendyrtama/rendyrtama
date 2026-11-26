// Xendit webhook (payment.succeeded and friends). The x-callback-token header must match the dashboard's
// verification token, and the order is still confirmed with Xendit's API before any credits are added.
import { handler, db, HttpError } from "../server.js";
import { xenditStatus, applyXenditStatus, xenditTokenOk } from "../xendit.js";

export default handler(["POST", "GET", "HEAD"], async (req, body) => {
  if (req.method !== "POST") return { ok: true };
  if (!xenditTokenOk(req)) throw new HttpError(401, "Invalid callback token.");
  const d = body?.data || {};
  const orderId = typeof d.reference_id === "string" ? d.reference_id : "";
  if (!/^WC-[A-Z0-9-]{5,40}$/.test(orderId)) return { ok: true };
  const { data: order } = await db().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.provider !== "xendit" || order.status === "paid" || !order.provider_ref) return { ok: true };
  if (d.payment_request_id && d.payment_request_id !== order.provider_ref) { console.error("Xendit callback for another payment request", orderId, d.payment_request_id); return { ok: true }; }
  // An error here makes Xendit retry later; the page's own polling also keeps checking.
  const status = await applyXenditStatus(order, await xenditStatus(order.provider_ref));
  console.log("Xendit callback confirmed with Xendit API", { order_id: orderId, event: body?.event, result: status });
  return { ok: true };
});
