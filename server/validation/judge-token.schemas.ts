import { z } from "zod";

export const judgeTokenLookupSchema = z.object({
  token: z.string().optional(),
  eventCode: z.string().optional(),
});
