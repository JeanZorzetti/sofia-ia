-- Teams V2 (S2.2): append-only per-call token attribution.
-- One row per successful chat() call, attributed to a member+run.
-- FK on member is SetNull so a mid-run roster edit/delete never breaks the run.
-- CreateTable
CREATE TABLE "team_member_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "member_id" UUID,
    "model" VARCHAR(100),
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_member_usage_run_id_idx" ON "team_member_usage"("run_id");

-- CreateIndex
CREATE INDEX "team_member_usage_member_id_idx" ON "team_member_usage"("member_id");

-- AddForeignKey
ALTER TABLE "team_member_usage" ADD CONSTRAINT "team_member_usage_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "team_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_usage" ADD CONSTRAINT "team_member_usage_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
