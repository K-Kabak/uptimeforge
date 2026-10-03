-- AlterTable
ALTER TABLE "CheckJob" ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "publishAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "publishToken" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "CheckJob_status_publishedAt_publishExpiresAt_idx" ON "CheckJob"("status", "publishedAt", "publishExpiresAt");
