'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const dataRoot = path.join(projectRoot, 'js', 'data', 'foundations');
const manifestPath = path.join(projectRoot, 'supabase', 'data', 'foundations-manifest.json');
const migrationPath = path.join(
  projectRoot,
  'supabase',
  'migrations',
  '20260809000800_import_foundations_manifest.sql'
);

const fixedIds = Object.freeze({
  course: '50000000-0000-4000-8000-000000000001',
  module: '80000000-0000-4000-8000-000000000001',
  requirementsActivity: '90000000-0000-4000-8000-000000000001',
  requirementsVersion: '91000000-0000-4000-8000-000000000001',
  requirementsTopics: Object.freeze({
    classification: '81000000-0000-4000-8000-000000000001',
    testability: '81000000-0000-4000-8000-000000000002'
  })
});

const activityTypes = Object.freeze({
  'foundations-programming-diagnostic': 'diagnostic',
  'foundations-requirements-classification': 'classification',
  'foundations-problem-decomposition': 'scenario',
  'foundations-data-design': 'knowledge-check',
  'foundations-testing-methods': 'classification'
});

const skillTitles = Object.freeze({
  knowledge: 'Knowledge',
  'code-reading': 'Code reading',
  'coding-debugging': 'Coding / debugging'
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deterministicUuid(namespace, stableKey) {
  const hex = sha256(`${namespace}:${stableKey}`).slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20)
  ].join('-');
}

function loadWindowScript(filePath, seedWindow) {
  const context = vm.createContext({
    window: seedWindow || {},
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    JSON
  });
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, {
    filename: path.relative(projectRoot, filePath)
  });
  return context.window;
}

function lastCommitFor(filePath) {
  try {
    return execFileSync(
      'git',
      ['log', '-1', '--format=%H', '--', path.relative(projectRoot, filePath)],
      { cwd: projectRoot, encoding: 'utf8' }
    ).trim() || null;
  } catch (error) {
    return null;
  }
}

function requirementsQuestionId(ordinal) {
  return `a0000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`;
}

function topicIdentity(activity, section) {
  if (activity.id === 'foundations-requirements-classification') {
    const stableKeys = {
      classification: 'requirements-classification',
      testability: 'requirement-testability'
    };
    const titles = {
      classification: 'Requirements classification',
      testability: 'Requirement testability'
    };
    return {
      id: fixedIds.requirementsTopics[section.id],
      stableKey: stableKeys[section.id],
      title: titles[section.id]
    };
  }

  const activityKey = activity.id.replace(/^foundations-/, '');
  const stableKey = `${activityKey}-${section.id}`;
  return {
    id: deterministicUuid('foundations-topic', stableKey),
    stableKey,
    title: `${activity.title}: ${section.title}`
  };
}

function activityIdentity(activityId) {
  if (activityId === 'foundations-requirements-classification') {
    return fixedIds.requirementsActivity;
  }
  return deterministicUuid('foundations-activity', activityId);
}

function versionIdentity(activityId, version) {
  if (activityId === 'foundations-requirements-classification' && version === '1.0.0') {
    return fixedIds.requirementsVersion;
  }
  return deterministicUuid('foundations-activity-version', `${activityId}@${version}`);
}

function questionIdentity(activityId, version, questionId, ordinal) {
  if (activityId === 'foundations-requirements-classification' && version === '1.0.0') {
    return requirementsQuestionId(ordinal);
  }
  return deterministicUuid(
    'foundations-question',
    `${activityId}@${version}:${questionId}`
  );
}

function buildManifest() {
  const catalogWindow = loadWindowScript(path.join(dataRoot, 'catalog.js'));
  const catalog = catalogWindow.FoundationActivityCatalog;
  const languageWindow = loadWindowScript(
    path.join(projectRoot, 'js', 'activities', 'programming-language.js')
  );
  const languages = languageWindow.FoundationProgrammingLanguage.languages.map((language, index) => ({
    id: deterministicUuid('foundations-language', language.id),
    stableKey: language.id,
    title: language.label,
    sortOrder: index + 1,
    active: true
  }));

  const skillKeys = new Set();
  const topics = [];
  const activities = catalog.map((catalogueActivity, activityIndex) => {
    const fileName = `${catalogueActivity.id.replace(/^foundations-/, '')}.js`;
    const filePath = path.join(dataRoot, fileName);
    const activity = loadWindowScript(filePath).FoundationActivityData;
    if (!activity || activity.id !== catalogueActivity.id || activity.version !== catalogueActivity.version) {
      throw new Error(`Catalogue mismatch for ${catalogueActivity.id}.`);
    }

    let ordinal = 0;
    const activityTopics = activity.sections.map((section, sectionIndex) => {
      const identity = topicIdentity(activity, section);
      const topic = {
        ...identity,
        moduleId: fixedIds.module,
        sortOrder: topics.length + sectionIndex + 1,
        active: true
      };
      return topic;
    });
    topics.push(...activityTopics);

    const questions = activity.sections.flatMap((section) => {
      const topic = activityTopics.find((candidate) => candidate.title.endsWith(section.title)) ||
        activityTopics[activity.sections.indexOf(section)];
      return section.questions.map((question, sectionQuestionIndex) => {
        ordinal += 1;
        if (question.skill) {
          skillKeys.add(question.skill);
        }
        return {
          id: questionIdentity(activity.id, activity.version, question.id, ordinal),
          stableKey: question.id,
          sectionKey: section.id,
          sectionTitle: section.title,
          questionType: question.type,
          analyticsTitle: `${section.title} item ${String(sectionQuestionIndex + 1).padStart(2, '0')}`,
          ordinal,
          maxScore: Number.isFinite(question.points) ? question.points : 1,
          topicId: topic.id,
          skillKey: question.skill || null
        };
      });
    });

    const maxScore = questions.reduce((total, question) => total + question.maxScore, 0);
    return {
      id: activityIdentity(activity.id),
      stableKey: activity.id,
      title: activity.title,
      activityType: activityTypes[activity.id],
      gitPath: path.relative(projectRoot, filePath),
      sortOrder: activityIndex + 1,
      active: true,
      version: {
        id: versionIdentity(activity.id, activity.version),
        version: activity.version,
        contentHash: sha256(fs.readFileSync(filePath)),
        gitCommitSha: lastCommitFor(filePath),
        maxScore,
        questionCount: questions.length,
        publishedAt: '2026-08-09T00:00:00Z',
        supportedProgrammingLanguages: activity.supportedProgrammingLanguages || [],
        questions
      }
    };
  });

  const skills = Array.from(skillKeys).sort().map((stableKey, index) => ({
    id: deterministicUuid('foundations-skill', stableKey),
    stableKey,
    title: skillTitles[stableKey] || stableKey,
    sortOrder: index + 1,
    active: true
  }));

  return {
    schemaVersion: 1,
    generatedFrom: 'js/data/foundations',
    course: {
      id: fixedIds.course,
      stableKey: 't-level-digital-software-development',
      code: null,
      title: 'T Level Digital Software Development',
      qualificationLevel: 'Level 3',
      active: true
    },
    module: {
      id: fixedIds.module,
      stableKey: 'software-development-foundations',
      title: 'Software Development Foundations',
      sortOrder: 1,
      active: true
    },
    languages,
    skills,
    topics,
    activities
  };
}

function sqlMigration(manifest) {
  const json = JSON.stringify(manifest);
  return `-- Generated by scripts/build-foundations-manifest.js.\n` +
`-- Source content remains authoritative in js/data/foundations/.\n\n` +
`do $migration$\n` +
`declare\n` +
`  manifest jsonb := $manifest$${json}$manifest$::jsonb;\n` +
`  activity_record jsonb;\n` +
`  version_record jsonb;\n` +
`  topic_record jsonb;\n` +
`  skill_record jsonb;\n` +
`  language_record jsonb;\n` +
`  question_record jsonb;\n` +
`  existing_version learning.activity_versions%rowtype;\n` +
`begin\n` +
`  insert into learning.courses (id, stable_key, code, title, qualification_level, active)\n` +
`  values (\n` +
`    (manifest #>> '{course,id}')::uuid,\n` +
`    manifest #>> '{course,stableKey}',\n` +
`    manifest #>> '{course,code}',\n` +
`    manifest #>> '{course,title}',\n` +
`    manifest #>> '{course,qualificationLevel}',\n` +
`    (manifest #>> '{course,active}')::boolean\n` +
`  )\n` +
`  on conflict (id) do update set\n` +
`    stable_key = excluded.stable_key,\n` +
`    code = excluded.code,\n` +
`    title = excluded.title,\n` +
`    qualification_level = excluded.qualification_level,\n` +
`    active = excluded.active,\n` +
`    updated_at = now();\n\n` +
`  insert into learning.modules (id, course_id, stable_key, title, sort_order, active)\n` +
`  values (\n` +
`    (manifest #>> '{module,id}')::uuid,\n` +
`    (manifest #>> '{course,id}')::uuid,\n` +
`    manifest #>> '{module,stableKey}',\n` +
`    manifest #>> '{module,title}',\n` +
`    (manifest #>> '{module,sortOrder}')::integer,\n` +
`    (manifest #>> '{module,active}')::boolean\n` +
`  )\n` +
`  on conflict (id) do update set\n` +
`    title = excluded.title,\n` +
`    sort_order = excluded.sort_order,\n` +
`    active = excluded.active,\n` +
`    updated_at = now();\n\n` +
`  for language_record in select value from jsonb_array_elements(manifest -> 'languages')\n` +
`  loop\n` +
`    insert into learning.coding_languages (id, stable_key, title, sort_order, active)\n` +
`    values (\n` +
`      (language_record ->> 'id')::uuid,\n` +
`      language_record ->> 'stableKey',\n` +
`      language_record ->> 'title',\n` +
`      (language_record ->> 'sortOrder')::integer,\n` +
`      (language_record ->> 'active')::boolean\n` +
`    )\n` +
`    on conflict (id) do update set\n` +
`      title = excluded.title,\n` +
`      sort_order = excluded.sort_order,\n` +
`      active = excluded.active;\n` +
`  end loop;\n\n` +
`  for skill_record in select value from jsonb_array_elements(manifest -> 'skills')\n` +
`  loop\n` +
`    insert into learning.skills (id, module_id, stable_key, title, sort_order, active)\n` +
`    values (\n` +
`      (skill_record ->> 'id')::uuid,\n` +
`      (manifest #>> '{module,id}')::uuid,\n` +
`      skill_record ->> 'stableKey',\n` +
`      skill_record ->> 'title',\n` +
`      (skill_record ->> 'sortOrder')::integer,\n` +
`      (skill_record ->> 'active')::boolean\n` +
`    )\n` +
`    on conflict (id) do update set\n` +
`      title = excluded.title,\n` +
`      sort_order = excluded.sort_order,\n` +
`      active = excluded.active,\n` +
`      updated_at = now();\n` +
`  end loop;\n\n` +
`  for topic_record in select value from jsonb_array_elements(manifest -> 'topics')\n` +
`  loop\n` +
`    insert into learning.topics (id, module_id, stable_key, title, sort_order, active)\n` +
`    values (\n` +
`      (topic_record ->> 'id')::uuid,\n` +
`      (manifest #>> '{module,id}')::uuid,\n` +
`      topic_record ->> 'stableKey',\n` +
`      topic_record ->> 'title',\n` +
`      (topic_record ->> 'sortOrder')::integer,\n` +
`      (topic_record ->> 'active')::boolean\n` +
`    )\n` +
`    on conflict (id) do update set\n` +
`      title = excluded.title,\n` +
`      sort_order = excluded.sort_order,\n` +
`      active = excluded.active,\n` +
`      updated_at = now();\n` +
`  end loop;\n\n` +
`  for activity_record in select value from jsonb_array_elements(manifest -> 'activities')\n` +
`  loop\n` +
`    version_record := activity_record -> 'version';\n` +
`    insert into learning.activities (id, module_id, stable_key, title, activity_type, git_path, active)\n` +
`    values (\n` +
`      (activity_record ->> 'id')::uuid,\n` +
`      (manifest #>> '{module,id}')::uuid,\n` +
`      activity_record ->> 'stableKey',\n` +
`      activity_record ->> 'title',\n` +
`      activity_record ->> 'activityType',\n` +
`      activity_record ->> 'gitPath',\n` +
`      (activity_record ->> 'active')::boolean\n` +
`    )\n` +
`    on conflict (id) do update set\n` +
`      title = excluded.title,\n` +
`      activity_type = excluded.activity_type,\n` +
`      git_path = excluded.git_path,\n` +
`      active = excluded.active,\n` +
`      updated_at = now();\n\n` +
`    select * into existing_version\n` +
`    from learning.activity_versions\n` +
`    where id = (version_record ->> 'id')::uuid;\n\n` +
`    if found and (\n` +
`      existing_version.activity_id <> (activity_record ->> 'id')::uuid\n` +
`      or existing_version.version <> version_record ->> 'version'\n` +
`      or existing_version.content_hash <> version_record ->> 'contentHash'\n` +
`      or existing_version.max_score <> (version_record ->> 'maxScore')::numeric\n` +
`      or existing_version.question_count <> (version_record ->> 'questionCount')::integer\n` +
`    ) then\n` +
`      raise exception using errcode = '23514', message = 'FOUNDATIONS_MANIFEST_VERSION_DRIFT';\n` +
`    end if;\n\n` +
`    insert into learning.activity_versions (\n` +
`      id, activity_id, version, content_hash, git_commit_sha, max_score, question_count\n` +
`    ) values (\n` +
`      (version_record ->> 'id')::uuid,\n` +
`      (activity_record ->> 'id')::uuid,\n` +
`      version_record ->> 'version',\n` +
`      version_record ->> 'contentHash',\n` +
`      version_record ->> 'gitCommitSha',\n` +
`      (version_record ->> 'maxScore')::numeric,\n` +
`      (version_record ->> 'questionCount')::integer\n` +
`    ) on conflict (id) do nothing;\n\n` +
`    select * into strict existing_version\n` +
`    from learning.activity_versions\n` +
`    where id = (version_record ->> 'id')::uuid;\n\n` +
`    if existing_version.published_at is null then\n` +
`      for question_record in select value from jsonb_array_elements(version_record -> 'questions')\n` +
`      loop\n` +
`        insert into learning.questions (\n` +
`          id, activity_version_id, stable_key, section_key, section_title,\n` +
`          question_type, analytics_title, ordinal, max_score\n` +
`        ) values (\n` +
`          (question_record ->> 'id')::uuid,\n` +
`          existing_version.id,\n` +
`          question_record ->> 'stableKey',\n` +
`          question_record ->> 'sectionKey',\n` +
`          question_record ->> 'sectionTitle',\n` +
`          question_record ->> 'questionType',\n` +
`          question_record ->> 'analyticsTitle',\n` +
`          (question_record ->> 'ordinal')::integer,\n` +
`          (question_record ->> 'maxScore')::numeric\n` +
`        ) on conflict (id) do nothing;\n\n` +
`        insert into learning.question_topics (question_id, topic_id, weight)\n` +
`        values (\n` +
`          (question_record ->> 'id')::uuid,\n` +
`          (question_record ->> 'topicId')::uuid,\n` +
`          1\n` +
`        ) on conflict (question_id, topic_id) do nothing;\n\n` +
`        if question_record ->> 'skillKey' is not null then\n` +
`          insert into learning.question_skills (question_id, skill_id, weight)\n` +
`          select\n` +
`            (question_record ->> 'id')::uuid,\n` +
`            skill.id,\n` +
`            1\n` +
`          from learning.skills as skill\n` +
`          where skill.module_id = (manifest #>> '{module,id}')::uuid\n` +
`            and skill.stable_key = question_record ->> 'skillKey'\n` +
`          on conflict (question_id, skill_id) do nothing;\n` +
`        end if;\n` +
`      end loop;\n\n` +
`      for language_record in\n` +
`        select value from jsonb_array_elements(version_record -> 'supportedProgrammingLanguages')\n` +
`      loop\n` +
`        insert into learning.activity_version_languages (activity_version_id, coding_language_id)\n` +
`        select existing_version.id, language.id\n` +
`        from learning.coding_languages as language\n` +
`        where language.stable_key = language_record #>> '{}'\n` +
`        on conflict (activity_version_id, coding_language_id) do nothing;\n` +
`      end loop;\n\n` +
`      if (select count(*) from learning.questions where activity_version_id = existing_version.id)\n` +
`          <> existing_version.question_count\n` +
`         or (select coalesce(sum(max_score), 0) from learning.questions where activity_version_id = existing_version.id)\n` +
`          <> existing_version.max_score then\n` +
`        raise exception using errcode = '23514', message = 'FOUNDATIONS_MANIFEST_QUESTION_TOTAL_MISMATCH';\n` +
`      end if;\n\n` +
`      update learning.activity_versions\n` +
`      set published_at = (version_record ->> 'publishedAt')::timestamptz\n` +
`      where id = existing_version.id;\n` +
`    end if;\n` +
`  end loop;\n` +
`end\n` +
`$migration$;\n`;
}

function writeGeneratedFiles() {
  const manifest = buildManifest();
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(migrationPath, sqlMigration(manifest));

  process.stdout.write(
    `Generated ${path.relative(projectRoot, manifestPath)} and ${path.relative(projectRoot, migrationPath)}\n`
  );
}

if (require.main === module) {
  writeGeneratedFiles();
}

module.exports = Object.freeze({
  buildManifest,
  sqlMigration,
  writeGeneratedFiles
});
