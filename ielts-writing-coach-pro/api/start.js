// Starts a test and charges for it: a free test if any are left, otherwise 1 credit per task.
import { handler, requireUser, db, HttpError } from "./_lib/server.js";
import { tasksForMode, findQuestion, T1TYPES, GT_TYPES, T2TYPES } from "../public/core.js";
import { profileOf } from "./me.js";

const clip = (s, n) => String(s ?? "").slice(0, n);

export default handler(["POST"], async (req, body) => {
  const user = await requireUser(req);
  const module = body.module === "general" ? "general" : "academic";
  const mode = ["t1", "t2", "both"].includes(body.mode) ? body.mode : null;
  if (!mode) throw new HttpError(400, "Choose Task 1, Task 2 or the full test.");
  const want = tasksForMode(mode);
  const given = Array.isArray(body.tasks) ? body.tasks : [];
  if (given.length !== want.length) throw new HttpError(400, "The test doesn't match the chosen mode.");

  const tasks = want.map((task, i) => {
    const t = given[i] || {};
    if (Number(t.task) !== task) throw new HttpError(400, "The test doesn't match the chosen mode.");
    if (t.qid) {
      if (!findQuestion(task, module, String(t.qid))) throw new HttpError(400, "Unknown question.");
      return { task, qid: String(t.qid) };
    }
    const c = t.custom || {};
    const prompt = clip(c.prompt, 4000).trim();
    if (prompt.length < 15) throw new HttpError(400, "Paste the full question first.");
    const types = task === 2 ? T2TYPES : module === "general" ? GT_TYPES : T1TYPES;
    return { task, custom: { prompt, desc: clip(c.desc, 2000).trim(), hasImage: !!c.hasImage && task === 1 && module === "academic", guessType: c.guessType in types ? c.guessType : null } };
  });

  const cost = tasks.length;
  const { data: paidWith, error } = await db().rpc("start_test", { p_user: user.id, p_cost: cost });
  if (error) throw error;
  if (!paidWith) {
    const p = await profileOf(user.id);
    throw new HttpError(402, `This test needs ${cost} credit${cost > 1 ? "s" : ""}. You have ${p.credits}.`, { needCredits: cost, ...p });
  }

  const { data: test, error: insErr } = await db().from("tests").insert({
    user_id: user.id, module, mode, tasks, paid_with: paidWith, credits_used: paidWith === "credits" ? cost : 0,
  }).select("id").single();
  if (insErr) {
    // Give the charge back if the test couldn't be saved.
    const p = await profileOf(user.id);
    await db().from("profiles").update(paidWith === "free" ? { free_tests: p.freeTests + 1 } : { credits: p.credits + cost }).eq("id", user.id);
    throw insErr;
  }
  return { testId: test.id, paidWith, ...(await profileOf(user.id)) };
});
