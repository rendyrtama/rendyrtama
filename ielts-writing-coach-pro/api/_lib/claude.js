// Marking and model answers with the Claude API (your Anthropic API key, set as ANTHROPIC_API_KEY on Vercel).
import Anthropic from "@anthropic-ai/sdk";
import { gradingSystem, gradingUser, gradingSchema, normaliseResult, modelAnswerPrompt } from "../../public/core.js";
import { HttpError } from "./server.js";

let client;
const anthropic = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY
const MODEL = () => process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

function userContent(text, image) {
  if (!image) return text;
  return [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }, { type: "text", text }];
}

async function run(params) {
  try {
    // Streaming avoids HTTP timeouts on long answers; finalMessage() collects the whole reply.
    // Server-side fallback re-runs the request on a fallback model if the primary one declines.
    const msg = await anthropic().beta.messages.stream({
      model: MODEL(),
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...params,
    }).finalMessage();
    if (msg.stop_reason === "refusal") throw new HttpError(422, "The examiner couldn't mark this response. Check the text and try again.");
    if (msg.stop_reason === "max_tokens") throw new HttpError(502, "The marking was cut off. Try again.");
    return msg.content.filter(b => b.type === "text").map(b => b.text).join("");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(503, "The marking service is busy. Try again in a minute.");
    if (e instanceof Anthropic.APIConnectionError) throw new HttpError(503, "Couldn't reach the marking service. Try again.");
    if (e instanceof Anthropic.APIError) { console.error("Claude API error", e.status, e.message); throw new HttpError(502, "The marking service returned an error. Try again."); }
    throw e;
  }
}

/** Marks one task. t = {task, module, q, answer}; image = {mediaType, data} or null. */
export async function gradeWithClaude(t, image) {
  const text = await run({
    output_config: { effort: "medium", format: { type: "json_schema", schema: gradingSchema(t) } },
    // The system prompt (instructions + descriptors) is identical for every script of the same task variant, so it is cached.
    system: [{ type: "text", text: gradingSystem(t), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent(gradingUser(t, { hasImage: !!image }), image) }],
  });
  let data;
  try { data = JSON.parse(text); } catch { throw new HttpError(502, "The examiner's reply came back in the wrong format. Try again."); }
  try { return normaliseResult(t, data); } catch { throw new HttpError(502, "The examiner's reply was incomplete. Try again."); }
}

export async function modelAnswerWithClaude(t, image) {
  return run({
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: userContent(modelAnswerPrompt(t, { hasImage: !!image }), image) }],
  });
}
