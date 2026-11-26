// Test mode only: "pays" the signed-in user's pending Xendit order, so the whole flow can be tried without money.
// Refused whenever the secret key is a live key.
import { handler, requireUser, db, HttpError } from "../_lib/server.js";
import { xenditIsTest, xenditSimulate } from "../_lib/xendit.js";

export default handler(["POST"], async (req, body) => {
  if (!xenditIsTest()) throw new HttpError(403, "Simulated payments are only available in test mode.");
  const user = await requireUser(req);
  const { data: order } = await db().from("orders").select("*").eq("id", String(body?.orderId || "")).eq("user_id", user.id).maybeSingle();
  if (!order || order.provider !== "xendit" || order.status !== "pending" || !order.provider_ref) throw new HttpError(404, "No pending Xendit payment with that order number.");
  await xenditSimulate(order.provider_ref, Number(order.amount));
  return { ok: true };
});
