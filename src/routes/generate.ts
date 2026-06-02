import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authRequired, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { generateText } from "../services/openai";

const generateSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown())
});

export const generateRoutes = new Hono<AppEnv>();

generateRoutes.use("*", authRequired);

generateRoutes.post("/", zValidator("json", generateSchema), async (c) => {
  const { jenis, parameters } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const content = await generateText(jenis, parameters);
  return c.json({
    title: titleFromParameters(jenis, parameters),
    content
  });
});

generateRoutes.post("/stream", zValidator("json", generateSchema), async (c) => {
  const { jenis, parameters } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  return c.text(await generateText(jenis, parameters), 200, {
    "Cache-Control": "no-cache, no-transform",
    "X-Content-Type-Options": "nosniff"
  });
});
