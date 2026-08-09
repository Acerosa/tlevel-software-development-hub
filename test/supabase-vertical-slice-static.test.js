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

function loadActivity(relativePath) {
  const source = read(relativePath);
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.FoundationActivityData;
}

test("the Supabase foundation has eight ordered reviewable migrations", function () {
  const migrationNames = fs.readdirSync(migrationsRoot)
    .filter(function (name) { return name.endsWith(".sql"); })
    .sort();

  assert.deepEqual(migrationNames, [
    "20260809000100_create_learning_identity.sql",
    "20260809000200_create_learning_curriculum.sql",
    "20260809000300_create_learning_records.sql",
    "20260809000400_create_learning_rls.sql",
    "20260809000500_create_learning_api.sql",
    "20260809000600_extend_curriculum_manifest.sql",
    "20260809000700_extend_learning_api.sql",
    "20260809000800_import_foundations_manifest.sql"
  ]);
});

test("the local API exposes api but keeps learning unexposed", function () {
  const config = read("supabase/config.toml");
  const schemasLine = config.match(/^schemas\s*=\s*\[(.*?)\]$/m);

  assert.ok(schemasLine, "Supabase API schemas must be configured");
  assert.match(schemasLine[1], /"api"/);
  assert.doesNotMatch(schemasLine[1], /"learning"/);
});

test("the generated manifest exactly mirrors every Foundations activity", function () {
  const manifest = JSON.parse(read("supabase/data/foundations-manifest.json"));
  const catalogueSource = read("js/data/foundations/catalog.js");
  const catalogueSandbox = { window: {} };
  vm.runInNewContext(catalogueSource, catalogueSandbox);
  const catalogue = Array.from(catalogueSandbox.window.FoundationActivityCatalog);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.activities.length, 5);

  catalogue.forEach(function (catalogueActivity) {
    const sourcePath = "js/data/foundations/" +
      catalogueActivity.id.replace(/^foundations-/, "") + ".js";
    const sourceActivity = loadActivity(sourcePath);
    const manifestActivity = manifest.activities.find(function (activity) {
      return activity.stableKey === sourceActivity.id;
    });
    assert.ok(manifestActivity, sourceActivity.id + " must exist in the manifest");
    const sourceQuestions = Array.from(sourceActivity.sections).flatMap(function (section) {
      return Array.from(section.questions).map(function (question) {
        return String(question.id);
      });
    }).sort();
    const manifestQuestions = manifestActivity.version.questions.map(function (question) {
      return question.stableKey;
    }).sort();
    const sourceMaxScore = sourceActivity.sections.reduce(function (activityTotal, section) {
      return activityTotal + Array.from(section.questions).reduce(function (sectionTotal, question) {
        return sectionTotal + (Number.isFinite(question.points) ? question.points : 1);
      }, 0);
    }, 0);

    assert.equal(manifestActivity.version.version, sourceActivity.version);
    assert.equal(manifestActivity.version.questionCount, sourceQuestions.length);
    assert.equal(manifestActivity.version.maxScore, sourceMaxScore);
    assert.deepEqual(manifestQuestions, sourceQuestions);
  });
});

test("the manifest uses only Git-grounded sections, skills and languages", function () {
  const manifest = JSON.parse(read("supabase/data/foundations-manifest.json"));
  const manifestTopicIds = new Set(manifest.topics.map(function (topic) { return topic.id; }));
  const sourceSkillKeys = new Set();
  let sourceSectionCount = 0;

  manifest.activities.forEach(function (manifestActivity) {
    const sourceActivity = loadActivity(manifestActivity.gitPath);
    sourceSectionCount += sourceActivity.sections.length;
    sourceActivity.sections.forEach(function (section) {
      section.questions.forEach(function (question) {
        if (question.skill) sourceSkillKeys.add(question.skill);
      });
    });
    manifestActivity.version.questions.forEach(function (question) {
      assert.ok(manifestTopicIds.has(question.topicId));
    });
  });

  assert.equal(manifest.topics.length, sourceSectionCount);
  assert.deepEqual(
    manifest.skills.map(function (skill) { return skill.stableKey; }).sort(),
    Array.from(sourceSkillKeys).sort()
  );
  assert.deepEqual(
    manifest.languages.map(function (language) { return language.stableKey; }),
    ["python", "javascript", "csharp"]
  );
});

test("the committed manifest and SQL import are deterministic generator output", function () {
  const generator = require("../scripts/build-foundations-manifest.js");
  const generatedManifest = generator.buildManifest();
  const committedManifest = read("supabase/data/foundations-manifest.json");
  const committedMigration = read(
    "supabase/migrations/20260809000800_import_foundations_manifest.sql"
  );

  assert.equal(
    committedManifest,
    JSON.stringify(generatedManifest, null, 2) + "\n"
  );
  assert.equal(committedMigration, generator.sqlMigration(generatedManifest));
});

test("the submission RPC accepts no browser-owned identity or total fields", function () {
  const apiMigration = read("supabase/migrations/20260809000700_extend_learning_api.sql");
  const signature = apiMigration.match(
    /create function api\.submit_attempt\(([\s\S]*?)\)\nreturns table/
  );

  assert.ok(signature, "submit_attempt signature must exist");
  assert.match(signature[1], /p_activity_key text/);
  assert.match(signature[1], /p_activity_version text/);
  assert.match(signature[1], /p_client_attempt_id text/);
  assert.match(signature[1], /p_responses jsonb/);
  assert.match(signature[1], /p_source_page text/);
  assert.match(signature[1], /p_started_at timestamptz/);
  assert.match(signature[1], /p_completed_at timestamptz/);
  assert.match(signature[1], /p_programming_language text/);
  assert.doesNotMatch(
    signature[1],
    /student_id|enrolment_id|assignment_id|attempt_number|max_score|received_at|marking_source|evidence_level/
  );
});

test("attempt idempotency is learner-scoped and completed records are immutable", function () {
  const recordsMigration = read(
    "supabase/migrations/20260809000300_create_learning_records.sql"
  );
  const apiMigration = read("supabase/migrations/20260809000700_extend_learning_api.sql");

  assert.match(recordsMigration, /unique \(student_id, client_attempt_id\)/i);
  assert.doesNotMatch(recordsMigration, /unique \(client_attempt_id\)/i);
  assert.match(recordsMigration, /COMPLETED_ATTEMPT_IMMUTABLE/);
  assert.match(recordsMigration, /COMPLETED_RESPONSE_IMMUTABLE/);
  assert.match(apiMigration, /CLIENT_ATTEMPT_ID_CONFLICT/);
  assert.match(apiMigration, /pg_advisory_xact_lock/);
});

test("RLS denies direct writes and the controlled operation derives auth identity", function () {
  const rlsMigration = read("supabase/migrations/20260809000400_create_learning_rls.sql");
  const manifestMigration = read("supabase/migrations/20260809000600_extend_curriculum_manifest.sql");
  const apiMigration = read("supabase/migrations/20260809000700_extend_learning_api.sql");
  const rlsTables = Array.from(
    (rlsMigration + "\n" + manifestMigration)
      .matchAll(/alter table learning\.([a-z_]+) enable row level security/gi)
  ).map(function (match) { return match[1]; });

  assert.equal(rlsTables.length, 20);
  assert.equal(new Set(rlsTables).size, 20);
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

test("the legacy fallback remains intact beside the explicit Supabase Auth boundary", function () {
  const productionBoundary = [
    "js/core/learning-api.js",
    "js/core/student-api.js",
    "js/core/student-session.js",
    "js/core/supabase-client.js",
    "js/core/supabase-learning-api.js"
  ].map(read).join("\n");

  assert.match(productionBoundary, /submitResult/);
  assert.match(productionBoundary, /StudentSession/);
  assert.match(productionBoundary, /SupabaseLearningApi/);
  assert.match(productionBoundary, /auth\.uid\(\)|accessToken/);
  assert.doesNotMatch(productionBoundary, /service_role|sb_secret_/i);
  assert.doesNotMatch(
    read("js/core/supabase-learning-api.js"),
    /studentId|student_id|enrolment_id|assignment_id/
  );
});
