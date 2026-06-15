-- SP3: schedule recurring Team runs (Scheduling/cron → Teams).
-- Additive, new table — no data migration, no backfill.

-- CreateTable
CREATE TABLE "scheduled_team_runs" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cron_expr" VARCHAR(100) NOT NULL,
    "label" VARCHAR(255),
    "mission" TEXT NOT NULL,
    "mode" VARCHAR(20) NOT NULL DEFAULT 'chat',
    "next_run_at" TIMESTAMPTZ NOT NULL,
    "last_run_at" TIMESTAMPTZ,
    "last_status" VARCHAR(20),
    "last_run_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_team_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_team_runs_team_id_idx" ON "scheduled_team_runs"("team_id");
CREATE INDEX "scheduled_team_runs_user_id_idx" ON "scheduled_team_runs"("user_id");
CREATE INDEX "scheduled_team_runs_is_active_idx" ON "scheduled_team_runs"("is_active");
CREATE INDEX "scheduled_team_runs_next_run_at_idx" ON "scheduled_team_runs"("next_run_at");

-- AddForeignKey
ALTER TABLE "scheduled_team_runs" ADD CONSTRAINT "scheduled_team_runs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_team_runs" ADD CONSTRAINT "scheduled_team_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
