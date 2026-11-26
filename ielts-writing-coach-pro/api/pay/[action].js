// One serverless function for every payment endpoint (/api/pay/<action>). Vercel's Hobby plan allows at
// most 12 functions per deployment, so the handlers live in api/_lib/pay/ (not counted) and are routed here.
// The public URLs are unchanged, e.g. /api/pay/xendit-notify.
import midtransCreate from "../_lib/pay/midtrans-create.js";
import midtransNotify from "../_lib/pay/midtrans-notify.js";
import danaCreate from "../_lib/pay/dana-create.js";
import danaNotify from "../_lib/pay/dana-notify.js";
import xenditCreate from "../_lib/pay/xendit-create.js";
import xenditNotify from "../_lib/pay/xendit-notify.js";
import xenditSimulate from "../_lib/pay/xendit-simulate.js";
import paypalCreate from "../_lib/pay/paypal-create.js";
import paypalCapture from "../_lib/pay/paypal-capture.js";

const ROUTES = {
  "midtrans-create": midtransCreate, "midtrans-notify": midtransNotify,
  "dana-create": danaCreate, "dana-notify": danaNotify,
  "xendit-create": xenditCreate, "xendit-notify": xenditNotify, "xendit-simulate": xenditSimulate,
  "paypal-create": paypalCreate, "paypal-capture": paypalCapture,
};

export default async function pay(req, res) {
  // Vercel fills req.query.action from the file name; fall back to the path for other hosts and tests.
  const action = String(req.query?.action || (req.url || "").split("?")[0].split("/").pop() || "");
  const route = Object.hasOwn(ROUTES, action) ? ROUTES[action] : null;
  if (!route) return res.status(404).json({ error: "Not found." });
  return route(req, res);
}
