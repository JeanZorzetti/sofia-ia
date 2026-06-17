// scripts/teams-fk-verify.ts
// Verifies the member-FK resilience predicate used by the TeamStore to tolerate a
// member that was deleted mid-run (PATCH /api/teams replaces the roster via
// deleteMany+createMany → ids change; a long async run cached the old ids at
// loadRun → its next teamMessage/teamTask insert hits P2003 on a member FK).
// `isMemberFkViolation` decides whether to retry the write with the member refs
// nulled (matching the schema's `onDelete: SetNull`) instead of crashing the run.
// Run: npx tsx scripts/teams-fk-verify.ts
import assert from 'node:assert/strict'
import { isMemberFkViolation } from '../src/lib/orchestration/team/team-store'

let passed = 0
function ok(name: string) { passed++; console.log(`  ✓ ${name}`) }

// Shape of the real error from the prod report:
//   Foreign key constraint violated: `team_messages_from_member_id_fkey (index)`  code P2003
const fk = (field: string) => ({ code: 'P2003', meta: { field_name: `${field} (index)` } })

function main() {
  console.log('isMemberFkViolation')

  // member FKs → retry (null the member ref)
  assert.equal(isMemberFkViolation(fk('team_messages_from_member_id_fkey')), true)
  ok('P2003 on team_messages_from_member_id_fkey → true (the reported crash)')
  assert.equal(isMemberFkViolation(fk('team_messages_to_member_id_fkey')), true)
  ok('P2003 on to_member_id → true')
  assert.equal(isMemberFkViolation(fk('team_tasks_assignee_id_fkey')), true)
  ok('P2003 on team_tasks_assignee_id → true (createTask exposure)')
  // alternative meta shapes Prisma may use
  assert.equal(isMemberFkViolation({ code: 'P2003', meta: { constraint: 'team_messages_from_member_id_fkey' } }), true)
  ok('P2003 via meta.constraint → true')
  assert.equal(isMemberFkViolation({ code: 'P2003', meta: { target: ['from_member_id'] } }), true)
  ok('P2003 via meta.target → true')

  // non-member FKs and other errors → DO NOT swallow (rethrow)
  assert.equal(isMemberFkViolation(fk('team_messages_run_id_fkey')), false)
  ok('P2003 on a non-member FK (run_id) → false (must not be masked)')
  assert.equal(isMemberFkViolation({ code: 'P2002', meta: { target: ['team_id', 'agent_id'] } }), false)
  ok('unique violation (P2002) → false')
  assert.equal(isMemberFkViolation(new Error('boom')), false); ok('plain Error → false')
  assert.equal(isMemberFkViolation(undefined), false); ok('undefined → false')
  assert.equal(isMemberFkViolation(null), false); ok('null → false')
  assert.equal(isMemberFkViolation({ code: 'P2003' }), false); ok('P2003 with no meta → false (unknown FK, do not mask)')

  console.log(`\n✅ teams-fk verify: ${passed} assertions passed`)
}

main()
