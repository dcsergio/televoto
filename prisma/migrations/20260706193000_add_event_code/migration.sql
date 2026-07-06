ALTER TABLE "Event" ADD COLUMN "code" TEXT;

WITH numbered_events AS (
  SELECT "id", LPAD((ROW_NUMBER() OVER (ORDER BY "createdAt"))::text, 5, '0') AS generated_code
  FROM "Event"
)
UPDATE "Event" AS event
SET "code" = numbered_events.generated_code
FROM numbered_events
WHERE event."id" = numbered_events."id";

ALTER TABLE "Event" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Event_code_key" ON "Event"("code");
