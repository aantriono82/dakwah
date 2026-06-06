import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CONTENT_TYPES, validateContentParameters } from "../utils/content";
import { authRequired, type AppEnv } from "../utils/http";
import { retrieveDalilContext } from "../services/myquran";

const dalilSearchSchema = z.object({
  jenis: z.enum(CONTENT_TYPES),
  parameters: z.record(z.unknown())
});

export const dalilRoutes = new Hono<AppEnv>();

dalilRoutes.use("*", authRequired);

dalilRoutes.post("/search", zValidator("json", dalilSearchSchema), async (c) => {
  const { jenis, parameters } = c.req.valid("json");
  const validationMessage = validateContentParameters(jenis, parameters);
  if (validationMessage) return c.json({ message: validationMessage }, 400);

  const data = await retrieveDalilContext(jenis, parameters);
  return c.json({ data });
});

dalilRoutes.get("/search", async (c) => {
  const jenis = c.req.query("jenis") || "ceramah";
  if (!CONTENT_TYPES.includes(jenis as (typeof CONTENT_TYPES)[number])) {
    return c.json({ message: "Jenis naskah tidak valid." }, 400);
  }

  const tema = c.req.query("tema") || c.req.query("topik") || "ketakwaan";
  const parameters =
    jenis === "khutbah-jumat"
      ? { temaUtama: tema, bahasa: "Indonesia" }
      : jenis === "nikah"
        ? { temaPesan: tema, bahasa: "Indonesia" }
        : jenis === "kultum"
          ? { topikSingkat: tema, bahasa: "Indonesia" }
          : { tema, topik: tema, bahasa: "Indonesia" };

  const data = await retrieveDalilContext(jenis, parameters);
  return c.json({ data });
});
