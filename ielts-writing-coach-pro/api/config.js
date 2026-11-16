// Public settings the page needs at load time (no secrets here).
import { handler, env } from "./_lib/server.js";

export default handler(["GET"], async () => ({
  supabaseUrl: env("SUPABASE_URL"),
  supabaseAnonKey: env("SUPABASE_ANON_KEY"),
  paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
  midtransProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  // Which provider handles QRIS: QRIS_PROVIDER=doku|midtrans, or DOKU automatically once its keys are set.
  qrisProvider: process.env.QRIS_PROVIDER || (process.env.DOKU_CLIENT_ID ? "doku" : "midtrans"),
  dokuProduction: process.env.DOKU_IS_PRODUCTION === "true",
}));
