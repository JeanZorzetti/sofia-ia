-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "model" VARCHAR(100),
    "effort" VARCHAR(20),
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_runs" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "mission" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "output" TEXT,
    "turns_used" INTEGER,
    "tokens_used" INTEGER,
    "estimated_cost" DOUBLE PRECISION,
    "duration_ms" INTEGER,
    "error" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_tasks" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'todo',
    "assignee_id" UUID,
    "result" TEXT,
    "review_note" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_messages" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "from_member_id" UUID,
    "to_member_id" UUID,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'message',
    "task_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_created_by_idx" ON "teams"("created_by");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_agent_id_idx" ON "team_members"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_agent_id_key" ON "team_members"("team_id", "agent_id");

-- CreateIndex
CREATE INDEX "team_runs_team_id_idx" ON "team_runs"("team_id");

-- CreateIndex
CREATE INDEX "team_runs_status_idx" ON "team_runs"("status");

-- CreateIndex
CREATE INDEX "team_runs_started_at_idx" ON "team_runs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "team_tasks_run_id_idx" ON "team_tasks"("run_id");

-- CreateIndex
CREATE INDEX "team_tasks_status_idx" ON "team_tasks"("status");

-- CreateIndex
CREATE INDEX "team_messages_run_id_idx" ON "team_messages"("run_id");

-- CreateIndex
CREATE INDEX "team_messages_created_at_idx" ON "team_messages"("created_at");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_runs" ADD CONSTRAINT "team_runs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "team_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_tasks" ADD CONSTRAINT "team_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "team_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "team_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

