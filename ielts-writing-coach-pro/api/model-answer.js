// One band 9 model answer per marked task.
import { handler, requireUser, db, HttpError } from "./_lib/server.js";
import { modelAnswerWithClaude } from "./_lib/claude.js";
import { taskFromSpec, imageFrom } from "./_lib/tests.js";

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const testId = String(body.testId || ""), index = Number(body.index);
  const { data: test, error } = await db().from("tests").select("module").eq("id", testId).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!test) throw new HttpError(404, "Test not found.");
  const { data: spec, error: e2 } = await db().rpc("begin_model_answer", { p_test: testId, p_user: user.id, p_idx: index });
  if (e2) throw e2;
  if (!spec) throw new HttpError(409, "Each marked task includes one model answer, and this one has been used.");
  const t = taskFromSpec(spec, test.module);
  return { text: await modelAnswerWithClaude(t, imageFrom(body, t)) };
});
