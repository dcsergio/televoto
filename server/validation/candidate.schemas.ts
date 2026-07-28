import { z } from "zod";

// Mirrors the original truthy check `!eventId || !number || !name` (with an added,
// behavior-preserving type check since these values now come from unknown JSON
// instead of an unchecked `as` cast). Message kept verbatim ("Missing required
// fields", the one non-Italian error string in this route set) since it's what
// the original handler returned.
export const createCandidateSchema = z
  .object({
    eventId: z.unknown(),
    number: z.unknown(),
    name: z.unknown(),
    subtitle: z.unknown().optional(),
    color: z.unknown().optional(),
  })
  .transform((body, ctx) => {
    const eventId = typeof body.eventId === "string" ? body.eventId : null;
    const number = typeof body.number === "number" ? body.number : null;
    const name = typeof body.name === "string" ? body.name : null;

    if (!eventId || !number || !name) {
      ctx.addIssue({ code: "custom", message: "Missing required fields" });
      return z.NEVER;
    }

    const subtitle = typeof body.subtitle === "string" ? body.subtitle : undefined;
    const color = typeof body.color === "string" ? body.color : undefined;

    return { eventId, number, name, subtitle, color };
  });

export const updateCandidateSchema = z.object({
  name: z.string().optional(),
  subtitle: z.string().optional(),
  color: z.string().optional(),
  number: z.number().optional(),
});
