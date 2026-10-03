CREATE UNIQUE INDEX "CheckJob_one_active_per_monitor" ON "CheckJob"("monitorId") WHERE status IN ('PENDING', 'RUNNING');
