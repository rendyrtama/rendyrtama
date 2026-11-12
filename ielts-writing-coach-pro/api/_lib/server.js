// Shared server helpers. Files under api/_lib are not exposed as endpoints by Vercel.
import { createClient } from "@supabase/supabase-js";

export const env = (name, fallback) => {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new HttpError(500, `Server is missing the ${name} setting.`);
  }
  return v;
};

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

let admin;
/** Supabase client with the service-role key: bypasses row-level security, server only. */
export function db() {
  if (!admin) admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  return admin;
}

/** Returns the signed-in Supabase user from the "Authorization: Bearer <access token>" header. */
export async function requireUser(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in to continue.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Your sign-in has expired. Sign in again.");
  return data.user;
}

/** Wraps a handler: JSON in/out, method check, consistent errors. */
export function handler(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) throw new HttpError(405, "Method not allowed.");
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { throw new HttpError(400, "Invalid JSON."); } }
      const out = await fn(req, body || {}, res);
      if (!res.headersSent) res.status(200).json(out ?? { ok: true });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      if (!res.headersSent) res.status(status).json({ error: status === 500 && !(e instanceof HttpError) ? "Something went wrong on the server. Try again." : e.message, ...(e.extra || {}) });
    }
  };
}

export const newOrderId = () => "WC-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
