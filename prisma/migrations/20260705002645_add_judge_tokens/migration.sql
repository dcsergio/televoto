-- CreateTable
CREATE TABLE "JudgeToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenPreview" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "JudgeToken_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "deviceId" TEXT,
    "judgeTokenId" TEXT,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_judgeTokenId_fkey" FOREIGN KEY ("judgeTokenId") REFERENCES "JudgeToken" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("candidateId", "createdAt", "deviceId", "id", "score") SELECT "candidateId", "createdAt", "deviceId", "id", "score" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE UNIQUE INDEX "Vote_judgeTokenId_key" ON "Vote"("judgeTokenId");
CREATE UNIQUE INDEX "Vote_candidateId_deviceId_key" ON "Vote"("candidateId", "deviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "JudgeToken_tokenHash_key" ON "JudgeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "JudgeToken_eventId_idx" ON "JudgeToken"("eventId");
