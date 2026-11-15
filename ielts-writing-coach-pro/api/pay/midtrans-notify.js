// Payment Notification URL for Midtrans (set it in the Midtrans dashboard).
// Verifies the signature, then confirms the status with Midtrans before adding credits.
import { handler, db } from "../_lib/server.js";
import { midtransSignatureOk, midtransStatus, applyMidtransStatus } from "../_lib/payments.js";

export default handler(["POST"], async (req, body) => {
  if (!body?.order_id) return { ok: false };
  if (!midtransSignatureOk(body)) {
    // Visible in Vercel → Logs. Payments are still credited by the page's status check.
    console.warn("Midtrans notification signature did not match", { order_id: body.order_id, status: body.transaction_status });
    return { ok: false };
  }
  console.log("Midtrans notification verified", { order_id: body.order_id, status: body.transaction_status });
  const { data: order } = await db().from("orders").select("*").eq("id", body.order_id).maybeSingle();
  if (!order || order.provider !== "midtrans") return { ok: true };   // not ours: acknowledge so Midtrans stops retrying
  await applyMidtransStatus(order, await midtransStatus(order.id));
  return { ok: true };
});
