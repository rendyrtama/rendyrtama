// The signed-in user's free tests and credits.
import { handler, requireUser, db } from "./_lib/server.js";

export async function profileOf(userId) {
  await db().from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  const { data, error } = await db().from("profiles").select("free_tests, credits").eq("id", userId).single();
  if (error) throw error;
  return { freeTests: data.free_tests, credits: data.credits };
}

export default handler(["GET"], async (req) => {
  const user = await requireUser(req);
  return { email: user.email, ...(await profileOf(user.id)) };
});
