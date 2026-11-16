// DOKU Checkout (non-SNAP API): a hosted payment page limited to QRIS, plus status checks.
// Signature: HMAC-SHA256 over "Client-Id, Request-Id, Request-Timestamp, Request-Target[, Digest]" lines.
import crypto from "node:crypto";
import { db, env, HttpError } from "./server.js";
import { creditOrder } from "./payments.js";

const dokuBase = () => env("DOKU_IS_PRODUCTION", "false") === "true" ? "https://api.doku.com" : "https://api-sandbox.doku.com";

/** Signed request headers. Digest is included only when there is a body. */
export function dokuHeaders(target, bodyText, { clientId = env("DOKU_CLIENT_ID"), secret = env("DOKU_SECRET_KEY"), requestId = crypto.randomUUID(), timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z") } = {}) {
  const lines = [`Client-Id:${clientId}`, `Request-Id:${requestId}`, `Request-Timestamp:${timestamp}`, `Request-Target:${target}`];
  if (bodyText !== undefined) lines.push(`Digest:${crypto.createHash("sha256").update(bodyText).digest("base64")}`);
  const signature = "HMACSHA256=" + crypto.createHmac("sha256", secret).update(lines.join("\n")).digest("base64");
  return { "Client-Id": clientId, "Request-Id": requestId, "Request-Timestamp": timestamp, Signature: signature, ...(bodyText !== undefined ? { "Content-Type": "application/json" } : {}) };
}

async function doku(target, body) {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const r = await fetch(dokuBase() + target, { method: body === undefined ? "GET" : "POST", headers: dokuHeaders(target, text), body: text });
  const data = await r.json().catch(() => ({}));
  return { httpOk: r.ok, status: r.status, data };
}

/** DOKU dates come as "yyyyMMddHHmmss" in Jakarta time (UTC+7). */
function dokuDate(s) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+07:00`);
  return isNaN(d) ? null : d;
}

export const DOKU_DUE_MINUTES = 30;

/** Creates a DOKU Checkout payment page. Returns {url, expiresAt}. */
export async function dokuCreateCheckout({ orderId, amount, itemName, callbackUrl }) {
  const methods = (process.env.DOKU_PAYMENT_METHODS ?? "QRIS").split(",").map(s => s.trim()).filter(Boolean);
  const body = {
    order: { amount, invoice_number: orderId, currency: "IDR", callback_url: callbackUrl, line_items: [{ name: itemName, price: amount, quantity: 1 }] },
    payment: { payment_due_date: DOKU_DUE_MINUTES, ...(methods.length ? { payment_method_types: methods } : {}) },
  };
  const { httpOk, status, data } = await doku("/checkout/v1/payment", body);
  const p = data?.response?.payment;
  if (!httpOk || !p?.url) {
    console.error("DOKU checkout failed", status, JSON.stringify(data));
    throw new HttpError(502, "Couldn't create the QRIS payment. Try again in a moment.");
  }
  const exp = dokuDate(p.expired_date) || new Date(Date.now() + DOKU_DUE_MINUTES * 60e3);
  return { url: p.url, expiresAt: exp.toISOString() };
}

export const dokuStatus = orderId => doku(`/orders/v1/status/${encodeURIComponent(orderId)}`).then(r => r.data);

/** Applies a DOKU status object to our order. Returns the new order status.
 *  Only SUCCESS counts as paid. FAILED is ignored, because the customer can still retry on the same page. */
export async function applyDokuStatus(order, s) {
  const st = String(s?.transaction?.status || "").toUpperCase();
  if (st === "SUCCESS") {
    if (s?.order?.invoice_number !== order.id || Math.round(Number(s?.order?.amount)) !== Math.round(Number(order.amount))) {
      console.error("DOKU amount/order mismatch", order.id, s?.order?.invoice_number, s?.order?.amount, order.amount);
      return order.status;
    }
    await creditOrder(order.id, s?.transaction?.original_request_id || s?.transaction?.id || null);
    return "paid";
  }
  const orderSt = String(s?.order?.status || "").toUpperCase();
  if ((st === "EXPIRED" || orderSt === "ORDER_EXPIRED") && order.status === "pending") {
    await db().from("orders").update({ status: "expired" }).eq("id", order.id).eq("status", "pending");
    return "expired";
  }
  return order.status;
}
