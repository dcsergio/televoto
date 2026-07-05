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
INSERT INTO "new_Vote" ("candidateId", "createdAt", "deviceId", "id", "judgeTokenId", "score") SELECT "candidateId", "createdAt", "deviceId", "id", "judgeTokenId", "score" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE UNIQUE INDEX "Vote_candidateId_deviceId_key" ON "Vote"("candidateId", "deviceId");
CREATE UNIQUE INDEX "Vote_candidateId_judgeTokenId_key" ON "Vote"("candidateId", "judgeTokenId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
