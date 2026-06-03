import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authRequired, type AppEnv } from "../utils/http";
import { CONTENT_TYPES, titleFromParameters, validateContentParameters } from "../utils/content";
import { generateText, streamGeneratedText } from "../services/openai";

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

  c.header("Cache-Control", "no-cache, no-transform");
  return streamText(c, async (stream) => {
    for await (const chunk of streamGeneratedText(jenis, parameters)) {
      await stream.write(chunk);
    }
  });
});
