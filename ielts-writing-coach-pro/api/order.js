// Payment status for the page to poll. For a pending QRIS order it also asks Midtrans, DANA or Xendit directly,
// so a payment is picked up even if the notification is late.
import { handler, requireUser, db, HttpError } from "./_lib/server.js";
import { midtransStatus, applyMidtransStatus } from "./_lib/payments.js";
import { danaStatus, applyDanaStatus } from "./_lib/dana.js";
import { xenditStatus, applyXenditStatus } from "./_lib/xendit.js";
import { profileOf } from "./me.js";

export default handler(["GET"], async (req) => {
  const user = await requireUser(req);
  const id = String(req.query?.id || "");
  const { data: order, error } = await db().from("orders").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!order) throw new HttpError(404, "Order not found.");
  let status = order.status;
  if (status === "pending" && order.provider === "midtrans") {
    try { status = await applyMidtransStatus(order, await midtransStatus(order.id)); } catch (e) { console.error(e); }
  }
  if (status === "pending" && order.provider === "dana") {
    try { status = await applyDanaStatus(order, await danaStatus(order.id)); } catch (e) { console.error(e); }
  }
  if (status === "pending" && order.provider === "xendit" && order.provider_ref) {
    try { status = await applyXenditStatus(order, await xenditStatus(order.provider_ref)); } catch (e) { console.error(e); }
  }
  return { status, ...(await profileOf(user.id)) };
});
