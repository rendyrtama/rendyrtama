// DOKU HTTP notification. The body is never trusted on its own: the order is always
// confirmed with DOKU's Check Status API before any credits are added.
import { handler, db } from "../_lib/server.js";
import { dokuStatus, applyDokuStatus } from "../_lib/doku.js";

export default handler(["POST"], async (req, body) => {
  const orderId = typeof body?.order?.invoice_number === "string" ? body.order.invoice_number : "";
  if (!/^WC-[A-Z0-9-]{5,40}$/.test(orderId)) return { ok: true };
  const { data: order } = await db().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.provider !== "doku" || order.status === "paid") return { ok: true };
  const status = await applyDokuStatus(order, await dokuStatus(order.id));
  console.log("DOKU notification confirmed with DOKU API", { order_id: orderId, notified: body?.transaction?.status, result: status });
  return { ok: true };
});
