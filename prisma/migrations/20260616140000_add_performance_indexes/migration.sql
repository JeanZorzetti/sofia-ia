-- Sprint 2 (performance): missing indexes for hot query paths.
-- Verified against the live schema first — none of these already existed.
-- Single-column FK/scan indexes:
CREATE INDEX "leads_assigned_to_idx" ON "leads"("assigned_to");
CREATE INDEX "agents_knowledge_base_id_idx" ON "agents"("knowledge_base_id");
CREATE INDEX "team_tasks_assignee_id_idx" ON "team_tasks"("assignee_id");

-- Composite indexes for the analytics rollups (agent metrics + response-time timeline):
CREATE INDEX "conversations_agent_id_status_idx" ON "conversations"("agent_id", "status");
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");
