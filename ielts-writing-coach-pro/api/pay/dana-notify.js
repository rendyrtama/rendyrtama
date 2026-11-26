// DANA finish notification. The body is never trusted on its own: the order is always confirmed
// with DANA's Query Payment API before any credits are added. DANA expects this reply on success.
import { handler, db } from "../_lib/server.js";
import { danaStatus, applyDanaStatus } from "../_lib/dana.js";

const OK = { responseCode: "2005600", responseMessage: "Successful" };

export default handler(["POST", "GET", "HEAD"], async (req, body, res) => {
  if (req.method !== "POST") return OK;
  const orderId = typeof body?.originalPartnerReferenceNo === "string" ? body.originalPartnerReferenceNo : "";
  if (!/^WC-[A-Z0-9-]{5,40}$/.test(orderId)) return OK;
  const { data: order } = await db().from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.provider !== "dana" || order.status === "paid") return OK;
  try {
    const status = await applyDanaStatus(order, await danaStatus(order.id));
    console.log("DANA notification confirmed with DANA API", { order_id: orderId, notified: body?.latestTransactionStatus, result: status });
    return OK;
  } catch (e) {
    // Tell DANA to retry later; the page's own polling also keeps checking.
    console.error("DANA notification could not be confirmed yet", orderId, e?.message);
    res.status(500).json({ responseCode: "5005601", responseMessage: "Internal Server Error" });
  }
});
