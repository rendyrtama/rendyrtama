// PayPal (USD) server calls, plus crediting a paid order exactly once. QRIS (DOKU) lives in doku.js.
import { db, env, HttpError } from "./server.js";

/* ---------------- PayPal Orders v2 ---------------- */
const paypalBase = () => env("PAYPAL_ENV", "sandbox") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function paypalToken() {
  const r = await fetch(paypalBase() + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(env("PAYPAL_CLIENT_ID") + ":" + env("PAYPAL_CLIENT_SECRET")).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) { console.error("PayPal auth failed", data); throw new HttpError(502, "PayPal is unavailable right now. Try again later."); }
  return data.access_token;
}

export async function paypal(path, method = "GET", body) {
  const token = await paypalToken();
  const r = await fetch(paypalBase() + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { httpOk: r.ok, status: r.status, data };
}

/* ---------------- Crediting ---------------- */
/** Marks the order paid and adds its credits, atomically and only once (see supabase/schema.sql). */
export async function creditOrder(orderId, providerRef) {
  const { error } = await db().rpc("mark_order_paid", { p_order: orderId, p_ref: providerRef ?? null });
  if (error) { console.error("mark_order_paid failed", error); throw new HttpError(500, "Payment received but credits could not be added yet. Contact support with your order number."); }
}
