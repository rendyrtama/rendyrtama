// Midtrans (QRIS) and PayPal (USD) server calls, plus crediting a paid order exactly once.
import crypto from "node:crypto";
import { db, env, HttpError } from "./server.js";

/* ---------------- Midtrans Core API ---------------- */
const midtransBase = () => env("MIDTRANS_IS_PRODUCTION", "false") === "true" ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
const midtransAuth = () => "Basic " + Buffer.from(env("MIDTRANS_SERVER_KEY") + ":").toString("base64");

async function midtrans(path, method = "GET", body) {
  const r = await fetch(midtransBase() + path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: midtransAuth() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  return { httpOk: r.ok, data };
}

/** Creates a QRIS charge. Returns {qrUrl, qrString, expiresAt}. */
export async function midtransChargeQris(orderId, amountIdr) {
  const { data } = await midtrans("/v2/charge", "POST", {
    payment_type: "qris",
    transaction_details: { order_id: orderId, gross_amount: amountIdr },
    qris: { acquirer: "gopay" },
    custom_expiry: { expiry_duration: 15, unit: "minute" },
  });
  if (!["201", "200"].includes(String(data.status_code))) {
    console.error("Midtrans charge failed", data);
    throw new HttpError(502, "Couldn't create the QRIS payment. Try again in a moment.");
  }
  const qr = (data.actions || []).find(a => a.name === "generate-qr-code");
  return { qrUrl: qr?.url || null, qrString: data.qr_string || null, expiresAt: data.expiry_time || null };
}

export const midtransStatus = orderId => midtrans(`/v2/${encodeURIComponent(orderId)}/status`).then(r => r.data);

/** Signature Midtrans puts on notifications: SHA512(order_id + status_code + gross_amount + server_key). */
export function midtransSignatureOk(n) {
  const expected = crypto.createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${env("MIDTRANS_SERVER_KEY")}`).digest("hex");
  const got = String(n.signature_key || "");
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Applies a Midtrans status object to our order. Returns the new order status. */
export async function applyMidtransStatus(order, s) {
  const st = s?.transaction_status;
  const paid = st === "settlement" || (st === "capture" && s.fraud_status === "accept");
  if (paid) {
    if (Math.round(Number(s.gross_amount)) !== Math.round(Number(order.amount)) || s.order_id !== order.id) {
      console.error("Midtrans amount/order mismatch", order.id, s.gross_amount, order.amount);
      return order.status;
    }
    await creditOrder(order.id, s.transaction_id);
    return "paid";
  }
  if (["expire", "cancel", "deny", "failure"].includes(st) && order.status === "pending") {
    await db().from("orders").update({ status: st === "expire" ? "expired" : "failed" }).eq("id", order.id).eq("status", "pending");
    return st === "expire" ? "expired" : "failed";
  }
  return order.status;
}

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
