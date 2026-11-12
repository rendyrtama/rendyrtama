// Payment Notification URL for Midtrans (set it in the Midtrans dashboard).
// Verifies the signature, then confirms the status with Midtrans before adding credits.
import { handler, db } from "../_lib/server.js";
import { midtransSignatureOk, midtransStatus, applyMidtransStatus } from "../_lib/payments.js";

export default handler(["POST"], async (req, body) => {
  if (!body?.order_id || !midtransSignatureOk(body)) return { ok: false };
  const { data: order } = await db().from("orders").select("*").eq("id", body.order_id).maybeSingle();
  if (!order || order.provider !== "midtrans") return { ok: true };   // not ours: acknowledge so Midtrans stops retrying
  await applyMidtransStatus(order, await midtransStatus(order.id));
  return { ok: true };
});
