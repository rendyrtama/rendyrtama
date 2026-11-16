// Payment status for the page to poll. For a pending QRIS order it also asks DOKU directly,
// so a payment is picked up even if the notification is late.
import { handler, requireUser, db, HttpError } from "./_lib/server.js";
import { dokuStatus, applyDokuStatus } from "./_lib/doku.js";
import { profileOf } from "./me.js";

export default handler(["GET"], async (req) => {
  const user = await requireUser(req);
  const id = String(req.query?.id || "");
  const { data: order, error } = await db().from("orders").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!order) throw new HttpError(404, "Order not found.");
  let status = order.status;
  if (status === "pending" && order.provider === "doku") {
    try { status = await applyDokuStatus(order, await dokuStatus(order.id)); } catch (e) { console.error(e); }
  }
  return { status, ...(await profileOf(user.id)) };
});
