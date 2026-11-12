// Loads a test's task as the marking code expects it: {task, module, q}.
import { findQuestion } from "../../public/core.js";
import { HttpError } from "./server.js";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function taskFromSpec(spec, module) {
  if (spec.qid) {
    const q = findQuestion(spec.task, module, spec.qid);
    if (!q) throw new HttpError(400, "Unknown question.");
    return { task: spec.task, module, q };
  }
  const c = spec.custom || {};
  return { task: spec.task, module, q: { id: "custom", custom: true, prompt: c.prompt, desc: c.desc || "", hasImage: !!c.hasImage, guessType: c.guessType || undefined } };
}

/** Validates an optional uploaded image {mediaType, data(base64)}. Only allowed for an Academic Task 1 own question. */
export function imageFrom(body, t) {
  const img = body.image;
  if (!img || !t.q.hasImage) return null;
  if (!IMAGE_TYPES.includes(img.mediaType) || typeof img.data !== "string" || img.data.length > 4_000_000) throw new HttpError(400, "The image must be a PNG, JPG, WebP or GIF under 3 MB.");
  return { mediaType: img.mediaType, data: img.data };
}
