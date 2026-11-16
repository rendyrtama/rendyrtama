// Public settings the page needs at load time (no secrets here).
import { handler, env } from "./_lib/server.js";

export default handler(["GET"], async () => ({
  supabaseUrl: env("SUPABASE_URL"),
  supabaseAnonKey: env("SUPABASE_ANON_KEY"),
  paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
  midtransProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
}));
