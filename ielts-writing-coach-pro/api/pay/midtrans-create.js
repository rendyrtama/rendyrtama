// Creates a QRIS payment for a package and returns the QR code to show.
import { handler, requireUser, db, HttpError, newOrderId } from "../_lib/server.js";
import { midtransChargeQris } from "../_lib/payments.js";
import { PACKAGES } from "../../public/core.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const pkg = PACKAGES[body.pkg];
  if (!pkg) throw new HttpError(400, "Unknown package.");
  const id = newOrderId();
  const { error } = await db().from("orders").insert({ id, user_id: user.id, package: pkg.id, credits: pkg.credits, provider: "midtrans", amount: pkg.idr, currency: "IDR" });
  if (error) throw error;
  const qr = await midtransChargeQris(id, pkg.idr);
  return { orderId: id, amount: pkg.idr, ...qr };
});
