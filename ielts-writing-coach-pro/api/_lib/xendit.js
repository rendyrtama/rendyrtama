// Xendit Payment Requests API: one-time QRIS codes, status checks, and (test mode only) simulated payments.
// Auth is HTTP Basic with the secret key as the username. With xenPlatform, XENDIT_SUB_ACCOUNT_ID sends the
// payment to that sub-account (one per app), via the for-user-id header.
import crypto from "node:crypto";
import { db, env, HttpError } from "./server.js";
import { creditOrder } from "./payments.js";

export const XENDIT_EXPIRY_MINUTES = 15;
const BASE = "https://api.xendit.co";
export const xenditIsTest = () => String(process.env.XENDIT_SECRET_KEY || "").startsWith("xnd_development_");

async function xendit(path, method = "GET", body) {
  const headers = { Authorization: "Basic " + Buffer.from(env("XENDIT_SECRET_KEY") + ":").toString("base64"), Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (process.env.XENDIT_SUB_ACCOUNT_ID) headers["for-user-id"] = process.env.XENDIT_SUB_ACCOUNT_ID;
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

/** The QRIS string can be in the payment method's channel properties or in the actions list. */
export const qrStringOf = pr => pr?.payment_method?.qr_code?.channel_properties?.qr_string
  || (pr?.actions || []).find(a => a?.qr_code)?.qr_code || null;

/** Creates a one-time QRIS payment request. Returns {id, qrString, expiresAt}. */
export async function xenditCreateQris({ orderId, amount, description }) {
  const expires = new Date(Date.now() + XENDIT_EXPIRY_MINUTES * 60e3);
  const { ok, status, data } = await xendit("/payment_requests", "POST", {
    reference_id: orderId,
    amount, currency: "IDR", country: "ID",
    description,
    payment_method: {
      type: "QR_CODE", reusability: "ONE_TIME_USE",
      qr_code: { channel_code: "QRIS", channel_properties: { expires_at: expires.toISOString() } },
    },
    metadata: { app: "writing-coach" },
  });
  const qrString = qrStringOf(data);
  if (!ok || !data?.id || !qrString) {
    console.error("Xendit create payment request failed", status, JSON.stringify(data));
    throw new HttpError(502, "Couldn't create the QRIS payment. Try again in a moment.");
  }
  const exp = new Date(data?.payment_method?.qr_code?.channel_properties?.expires_at || expires);
  return { id: data.id, qrString, expiresAt: (isNaN(exp) ? expires : exp).toISOString() };
}

/** Xendit's view of a payment request. */
export async function xenditStatus(paymentRequestId) {
  const { ok, status, data } = await xendit(`/payment_requests/${encodeURIComponent(paymentRequestId)}`);
  if (!ok) { console.error("Xendit get payment request failed", status, JSON.stringify(data)); throw new HttpError(502, "Couldn't check the payment."); }
  return data;
}

/** Test mode only: pays a payment request, as if a customer scanned the code. */
export async function xenditSimulate(paymentRequestId, amount) {
  const { ok, status, data } = await xendit(`/payment_requests/${encodeURIComponent(paymentRequestId)}/payments/simulate`, "POST", { amount });
  if (!ok) { console.error("Xendit simulate failed", status, JSON.stringify(data)); throw new HttpError(502, "Xendit couldn't simulate the payment."); }
  return data;
}

/** Applies a payment request's status to our order. Returns the new order status. */
export async function applyXenditStatus(order, pr) {
  const st = String(pr?.status || "").toUpperCase();
  if (st === "SUCCEEDED") {
    if (pr?.reference_id !== order.id || Math.round(Number(pr?.amount)) !== Math.round(Number(order.amount)) || (pr?.currency && pr.currency !== "IDR")) {
      console.error("Xendit amount/order mismatch", order.id, pr?.reference_id, pr?.amount, order.amount);
      return order.status;
    }
    await creditOrder(order.id, pr.id);
    return "paid";
  }
  if (["EXPIRED", "CANCELED", "FAILED", "VOIDED"].includes(st) && order.status === "pending") {
    const to = st === "EXPIRED" ? "expired" : "failed";
    await db().from("orders").update({ status: to }).eq("id", order.id).eq("status", "pending");
    return to;
  }
  return order.status;
}

/** Constant-time check of the x-callback-token header against the dashboard's webhook verification token. */
export function xenditTokenOk(req) {
  const want = process.env.XENDIT_CALLBACK_TOKEN || "";
  const got = String(req.headers?.["x-callback-token"] || "");
  return !!want && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
