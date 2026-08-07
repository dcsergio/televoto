import { z } from "zod";
import { judgeTokenField } from "./fields.js";

export const castVoteSchema = z.object({
  candidateId: z.string().min(1, { message: "ID candidato mancante" }),
  judgeToken: judgeTokenField("Codice giudice non valido"),
  score: z.union([z.number().int().min(1).max(10), z.null()], { message: "Punteggio non valido" }),
});
