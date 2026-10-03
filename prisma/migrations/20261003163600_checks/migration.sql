-- CreateEnum
CREATE TYPE "CheckResult" AS ENUM ('SUCCESS', 'HTTP_ERROR', 'TIMEOUT', 'DNS_ERROR', 'TLS_ERROR', 'CONNECTION_ERROR', 'BLOCKED_TARGET', 'INTERNAL_ERROR');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "Monitor" ADD COLUMN     "leaseExpiresAt" TIMESTAMPTZ(3),
ADD COLUMN     "leaseToken" TEXT;

-- CreateTable
CREATE TABLE "CheckJob" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CheckJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "result" "CheckResult" NOT NULL,
    "httpStatus" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckJob_monitorId_status_idx" ON "CheckJob"("monitorId", "status");

-- CreateIndex
CREATE INDEX "CheckJob_status_createdAt_idx" ON "CheckJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Check_jobId_key" ON "Check"("jobId");

-- CreateIndex
CREATE INDEX "Check_monitorId_startedAt_id_idx" ON "Check"("monitorId", "startedAt", "id");

-- CreateIndex
CREATE INDEX "Check_createdAt_idx" ON "Check"("createdAt");

-- AddForeignKey
ALTER TABLE "CheckJob" ADD CONSTRAINT "CheckJob_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CheckJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
