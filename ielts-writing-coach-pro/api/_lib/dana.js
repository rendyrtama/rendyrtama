// DANA Payment Gateway (QRIS) through DANA's official SDK (dana-node), which signs every request
// with the merchant's RSA private key. The order is created in the "API" scenario with QRIS as the
// pay option, so DANA returns the QRIS string and the page shows the code itself (like Midtrans).
import { Dana } from "dana-node";
import { db, env, HttpError } from "./server.js";
import { creditOrder } from "./payments.js";

export const DANA_EXPIRY_MINUTES = 15;
const danaEnv = () => (env("DANA_ENV", "sandbox").trim().toLowerCase() === "production" ? "production" : "sandbox");

// Vercel stores a pasted PEM key as-is, but "\n" escapes are common when keys are copied around.
const pem = s => String(s || "").trim().replace(/\\n/g, "\n");

let client, clientKey;
function dana() {
  const opts = { partnerId: env("DANA_PARTNER_ID"), privateKey: pem(env("DANA_PRIVATE_KEY")), origin: env("SITE_URL", "https://www.writingcoach.id"), env: danaEnv() };
  const key = JSON.stringify(opts);
  if (!client || clientKey !== key) { client = new Dana(opts); clientKey = key; }
  return client.paymentGatewayApi;
}

/** "YYYY-MM-DDTHH:mm:ss+07:00" in Jakarta time, as DANA expects. */
export function jakartaTime(d) {
  const j = new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 19);
  return `${j}+07:00`;
}
const money = n => ({ value: Number(n).toFixed(2), currency: "IDR" });

/** Logs what DANA said (the SDK puts the reason in the error's response) and returns a friendly error. */
async function danaError(where, e) {
  let detail = e?.message;
  try { if (e?.response !== undefined) detail = JSON.stringify(e.response); } catch {}
  console.error(`DANA ${where} failed`, e?.status || "", detail);
  return new HttpError(502, "Couldn't create the QRIS payment. Try again in a moment.");
}

/** Creates a QRIS order. Returns {qrString, referenceNo, expiresAt}. */
export async function danaCreateQris({ orderId, amount, title, returnUrl, notifyUrl }) {
  const expires = new Date(Date.now() + DANA_EXPIRY_MINUTES * 60e3);
  const request = {
    partnerReferenceNo: orderId,                       // ours, at most 25 characters for QRIS
    merchantId: env("DANA_MERCHANT_ID"),
    externalStoreId: env("DANA_SHOP_ID"),              // required for QRIS
    amount: money(amount),
    validUpTo: jakartaTime(expires),
    urlParams: [
      { url: returnUrl, type: "PAY_RETURN", isDeeplink: "N" },
      { url: notifyUrl, type: "NOTIFICATION", isDeeplink: "N" },
    ],
    payOptionDetails: [{ payMethod: "NETWORK_PAY", payOption: "NETWORK_PAY_PG_QRIS", transAmount: money(amount), feeAmount: money(0) }],
    additionalInfo: {
      mcc: env("DANA_MCC", "8299"),                    // 8299: schools and educational services
      envInfo: { sourcePlatform: "IPG", terminalType: "SYSTEM", orderTerminalType: "WEB" },
      order: { orderTitle: title.slice(0, 64), scenario: "API" },
    },
  };
  let r;
  try { r = await dana().createOrder(request); }
  catch (e) { throw await danaError("createOrder", e); }
  const qrString = r?.additionalInfo?.paymentCode;
  if (!String(r?.responseCode || "").startsWith("200") || !qrString) {
    console.error("DANA createOrder: no QRIS code", JSON.stringify(r));
    throw new HttpError(502, "Couldn't create the QRIS payment. Try again in a moment.");
  }
  return { qrString, referenceNo: r.referenceNo || null, expiresAt: expires.toISOString() };
}

/** DANA's view of an order (Payment Gateway service code 54). */
export async function danaStatus(orderId) {
  try { return await dana().queryPayment({ originalPartnerReferenceNo: orderId, serviceCode: "54", merchantId: env("DANA_MERCHANT_ID") }); }
  catch (e) { throw await danaError("queryPayment", e); }
}

/** Applies a DANA status to our order. Returns the new order status.
 *  00 = paid, 01/02 = not final yet, 05 = cancelled/expired, 07 = not found. */
export async function applyDanaStatus(order, s) {
  const st = String(s?.latestTransactionStatus || "");
  if (st === "00") {
    const paidAmount = Number(s?.amount?.value ?? s?.transAmount?.value);
    if (s?.originalPartnerReferenceNo !== order.id || Math.round(paidAmount) !== Math.round(Number(order.amount))) {
      console.error("DANA amount/order mismatch", order.id, s?.originalPartnerReferenceNo, paidAmount, order.amount);
      return order.status;
    }
    await creditOrder(order.id, s?.originalReferenceNo || null);
    return "paid";
  }
  if (st === "05" && order.status === "pending") {
    await db().from("orders").update({ status: "expired" }).eq("id", order.id).eq("status", "pending");
    return "expired";
  }
  return order.status;
}
