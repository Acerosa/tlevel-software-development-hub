const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const supabaseRoot = path.join(projectRoot, "supabase");
const migrationsRoot = path.join(supabaseRoot, "migrations");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadRequirementsActivity() {
  const source = read("js/data/foundations/requirements-classification.js");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.FoundationActivityData;
}

test("the vertical slice has five ordered reviewable migrations", function () {
  const migrationNames = fs.readdirSync(migrationsRoot)
    .filter(function (name) { return name.endsWith(".sql"); })
    .sort();

  assert.deepEqual(migrationNames, [
    "20260809000100_create_learning_identity.sql",
    "20260809000200_create_learning_curriculum.sql",
    "20260809000300_create_learning_records.sql",
    "20260809000400_create_learning_rls.sql",
    "20260809000500_create_learning_api.sql"
  ]);
});

test("the local API exposes api but keeps learning unexposed", function () {
  const config = read("supabase/config.toml");
  const schemasLine = config.match(/^schemas\s*=\s*\[(.*?)\]$/m);

  assert.ok(schemasLine, "Supabase API schemas must be configured");
  assert.match(schemasLine[1], /"api"/);
  assert.doesNotMatch(schemasLine[1], /"learning"/);
});

test("seeded curriculum IDs and scores exactly match Requirements Classification", function () {
  const activity = loadRequirementsActivity();
  const seed = read("supabase/seed.sql");
  const actualQuestions = [];
  Array.from(activity.sections).forEach(function (section) {
    Array.from(section.questions).forEach(function (question) {
      actualQuestions.push(String(question.id));
    });
  });
  actualQuestions.sort();
  const seededQuestions = Array.from(seed.matchAll(/'(FOUND-REQ(?:-TEST)?-[0-9]{3})'/g))
    .map(function (match) { return match[1]; });
  const uniqueSeededQuestions = Array.from(new Set(seededQuestions)).sort();
  const maxScore = activity.sections.reduce(function (activityTotal, section) {
    return activityTotal + section.questions.reduce(function (sectionTotal, question) {
      return sectionTotal + (Number.isFinite(question.points) ? question.points : 1);
    }, 0);
  }, 0);

  assert.equal(activity.id, "foundations-requirements-classification");
  assert.equal(activity.version, "1.0.0");
  assert.equal(activity.sections.length, 2);
  assert.equal(actualQuestions.length, 20);
  assert.equal(maxScore, 20);
  assert.deepEqual(uniqueSeededQuestions, actualQuestions);
  assert.match(seed, /'foundations-requirements-classification'/);
  assert.match(seed, /'1\.0\.0'/);
});

test("the slice uses only section-grounded topics and no invented skills", function () {
  const seed = read("supabase/seed.sql");
  const allMigrations = fs.readdirSync(migrationsRoot)
    .filter(function (name) { return name.endsWith(".sql"); })
    .map(function (name) { return fs.readFileSync(path.join(migrationsRoot, name), "utf8"); })
    .join("\n");

  assert.match(seed, /'requirements-classification'/);
  assert.match(seed, /'requirement-testability'/);
  assert.doesNotMatch(allMigrations, /create table learning\.skills\b/i);
  assert.doesNotMatch(allMigrations, /create table learning\.question_skills\b/i);
});

test("the submission RPC accepts no browser-owned identity or total fields", function () {
  const apiMigration = read("supabase/migrations/20260809000500_create_learning_api.sql");
  const signature = apiMigration.match(
    /create function api\.submit_attempt\(([\s\S]*?)\)\nreturns table/
  );

  assert.ok(signature, "submit_attempt signature must exist");
  assert.match(signature[1], /p_activity_key text/);
  assert.match(signature[1], /p_activity_version text/);
  assert.match(signature[1], /p_client_attempt_id text/);
  assert.match(signature[1], /p_responses jsonb/);
  assert.doesNotMatch(
    signature[1],
    /student_id|enrolment_id|attempt_number|max_score|received_at|completed_at/
  );
});

test("attempt idempotency is learner-scoped and completed records are immutable", function () {
  const recordsMigration = read(
    "supabase/migrations/20260809000300_create_learning_records.sql"
  );
  const apiMigration = read("supabase/migrations/20260809000500_create_learning_api.sql");

  assert.match(recordsMigration, /unique \(student_id, client_attempt_id\)/i);
  assert.doesNotMatch(recordsMigration, /unique \(client_attempt_id\)/i);
  assert.match(recordsMigration, /COMPLETED_ATTEMPT_IMMUTABLE/);
  assert.match(recordsMigration, /COMPLETED_RESPONSE_IMMUTABLE/);
  assert.match(apiMigration, /CLIENT_ATTEMPT_ID_CONFLICT/);
  assert.match(apiMigration, /pg_advisory_xact_lock/);
});

test("RLS denies direct writes and the controlled operation derives auth identity", function () {
  const rlsMigration = read("supabase/migrations/20260809000400_create_learning_rls.sql");
  const apiMigration = read("supabase/migrations/20260809000500_create_learning_api.sql");
  const rlsTables = Array.from(
    rlsMigration.matchAll(/alter table learning\.([a-z_]+) enable row level security/gi)
  ).map(function (match) { return match[1]; });

  assert.equal(rlsTables.length, 16);
  assert.equal(new Set(rlsTables).size, 16);
  assert.match(rlsMigration, /alter table learning\.attempts enable row level security/i);
  assert.match(rlsMigration, /alter table learning\.responses enable row level security/i);
  assert.doesNotMatch(rlsMigration, /grant\s+(?:insert|update|delete|all).*learning\.attempts/is);
  assert.doesNotMatch(rlsMigration, /grant\s+(?:insert|update|delete|all).*learning\.responses/is);
  assert.match(apiMigration, /v_auth_user_id := auth\.uid\(\)/);
  assert.match(apiMigration, /STUDENT_IDENTITY_NOT_FOUND/);
});

test("fixtures are synthetic and contain no reusable password or secret", function () {
  const seed = read("supabase/seed.sql");

  assert.match(seed, /Synthetic Student A/);
  assert.match(seed, /Synthetic Student B/);
  assert.match(seed, /Synthetic Teacher A/);
  assert.match(seed, /Synthetic Teacher B/);
  assert.doesNotMatch(seed, /@(?:gmail|outlook|hotmail|nhc)\./i);
  assert.doesNotMatch(seed, /crypt\s*\(|password\s*=|service_role|sb_secret_|eyJ[A-Za-z0-9_-]{20,}/i);
  assert.match(seed, /encrypted_password,[\s\S]*?null,/i);
});

test("the production frontend remains on its existing Apps Script path", function () {
  const productionBoundary = [
    "js/core/learning-api.js",
    "js/core/student-api.js",
    "js/core/student-session.js"
  ].map(read).join("\n");

  assert.doesNotMatch(productionBoundary, /supabase/i);
  assert.match(productionBoundary, /submitResult/);
  assert.match(productionBoundary, /StudentSession/);
});
