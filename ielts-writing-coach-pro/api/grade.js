// Marks one task of a started test with Claude. Up to 3 attempts per task (for retries after errors).
import { handler, requireUser, db, HttpError } from "./_lib/server.js";
import { gradeWithClaude } from "./_lib/claude.js";
import { taskFromSpec, imageFrom } from "./_lib/tests.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const testId = String(body.testId || ""), index = Number(body.index);
  const answer = String(body.answer ?? "").slice(0, 15000);
  if (!testId || !Number.isInteger(index)) throw new HttpError(400, "Missing test.");

  const { data: test, error } = await db().from("tests").select("id, user_id, module, results").eq("id", testId).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!test) throw new HttpError(404, "Test not found.");
  if (test.results?.[index]) return { result: test.results[index] };   // already marked: return the saved result

  const { data: spec, error: e2 } = await db().rpc("begin_grade", { p_test: testId, p_user: user.id, p_idx: index });
  if (e2) throw e2;
  if (!spec) throw new HttpError(429, "This task has used all 3 marking attempts. Contact support if the marking kept failing.");

  const t = { ...taskFromSpec(spec, test.module), answer };
  if (body.guessType && t.q.custom) t.q.guessType = String(body.guessType);
  const result = await gradeWithClaude(t, imageFrom(body, t));
  const { error: e3 } = await db().rpc("save_result", { p_test: testId, p_idx: index, p_result: result, p_answer: answer });
  if (e3) console.error("save_result failed", e3);
  return { result };
});
