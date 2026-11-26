// Public settings the page needs at load time (no secrets here).
import { handler, env } from "./_lib/server.js";
import { xenditIsTest } from "./_lib/xendit.js";

const QRIS = ["midtrans", "dana", "xendit"];
const provider = () => QRIS.includes(process.env.QRIS_PROVIDER) ? process.env.QRIS_PROVIDER : "midtrans";

export default handler(["GET"], async () => ({
  supabaseUrl: env("SUPABASE_URL"),
  supabaseAnonKey: env("SUPABASE_ANON_KEY"),
  paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
  // Which provider makes QRIS codes: QRIS_PROVIDER=xendit, dana or midtrans (default midtrans).
  qrisProvider: provider(),
  qrisProduction: { midtrans: process.env.MIDTRANS_IS_PRODUCTION === "true", dana: process.env.DANA_ENV?.trim().toLowerCase() === "production", xendit: !!process.env.XENDIT_SECRET_KEY && !xenditIsTest() }[provider()],
}));
