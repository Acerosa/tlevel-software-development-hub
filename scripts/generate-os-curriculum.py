#!/usr/bin/env python3
"""Generate T Level Y2 OS Areas 1–3 curriculum JSON and week HTML from the SoL.

Source of truth for weekly teaching is the 2026/27 Scheme of Learning
(Areas 1.1 to 3.2). Foundations activities are preserved from the existing
package. Run from the hub root:

    python3 scripts/generate-os-curriculum.py
"""
from __future__ import annotations

import json
from pathlib import Path

from week1_curriculum import WEEK_1

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "tlevel-software-development"
SCHEMA = "0.1.0"
PACKAGE_VERSION = "0.4.2"
CLIENT = "Oakfield Adult Skills Hub"
OAKFIELD_SCENARIO = {
    "title": "Oakfield Adult Skills Hub: Client Scenario",
    "blocks": [
        {
            "type": "paragraph",
            "text": "Oakfield Adult Skills Hub is a local-authority adult education provider. It runs free and low-cost courses in English, maths, digital skills and vocational subjects across several community venues.",
        },
        {
            "type": "paragraph",
            "text": "At present, learners usually telephone or visit reception to ask about courses and request a place. Staff record bookings in a paper diary and a shared spreadsheet. Tutors use paper registers during lessons. Managers have limited visibility of course capacity and often do not know whether a course is full until information has been updated at the end of the week.",
        },
        {
            "type": "paragraph",
            "text": "Oakfield would like a digital service that improves how learners, tutors and managers access and manage course information.",
        },
        {
            "type": "list",
            "intro": "The service should allow learners to:",
            "items": [
                "find available courses",
                "view useful course information",
                "request a place on a course",
            ],
        },
        {
            "type": "list",
            "intro": "It should allow tutors to:",
            "items": [
                "view relevant class information",
                "record learner attendance",
            ],
        },
        {
            "type": "list",
            "intro": "It should allow managers to:",
            "items": [
                "monitor attendance",
                "view course capacity",
                "produce information required for funding reports",
            ],
        },
        {
            "type": "paragraph",
            "text": "The service must be suitable for users with different levels of digital confidence. It should support users who rely on screen readers and users for whom English is an additional language.",
        },
        {
            "type": "list",
            "intro": "Oakfield has also identified several constraints:",
            "items": [
                "the project has a limited budget",
                "personal data must be handled in accordance with UK GDPR",
                "some teaching venues have unreliable Wi-Fi",
                "staff already use Microsoft 365 and would prefer to avoid unnecessary new systems or training",
            ],
        },
        {
            "type": "paragraph",
            "text": "Oakfield expects the proposed solution to improve access to course information, reduce duplicated administrative work and give staff more reliable and timely information.",
        },
    ],
    "note": "You will use the Oakfield scenario throughout this course. Refer back to it when analysing requirements, identifying risks, designing solutions, testing and evaluating.",
}


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def rec(schema: str, ident: str, metadata: dict, relationships=None, **extra):
    item = {
        "schema": f"lp.content.{schema}",
        "schemaVersion": SCHEMA,
        "id": ident,
        "version": "0.1.0",
        "metadata": metadata,
        "relationships": relationships or {},
    }
    item.update(extra)
    return item


def block(ident: str, typ: str, content: dict):
    return rec("block", ident, {}, {}, type=typ, content=content)


def heading(ident: str, text: str, level: int = 2):
    return block(ident, "heading", {"text": text, "level": level})


def para(ident: str, text: str):
    return block(ident, "paragraph", {"text": text})


def callout(ident: str, title: str, text: str, tone: str = "info"):
    return block(ident, "callout", {"title": title, "text": text, "tone": tone})


def teacher(ident: str, text: str):
    return block(ident, "teacher-note", {"text": text})


def short(
    activity_id: str,
    qid: str,
    prompt: str,
    placeholder: str,
    guidance: str | None = None,
    min_chars: int | None = None,
):
    content = {
        "formative": True,
        "questionId": f"{activity_id}:{qid}",
        "sourceQuestionId": qid,
        "prompt": prompt,
        "placeholder": placeholder,
    }
    if guidance:
        content["guidance"] = guidance
    if min_chars:
        content["minChars"] = min_chars
    return block(f"{activity_id}-{qid}", "short-response", content)


def single(activity_id: str, qid: str, prompt: str, options: list, correct: str, ok: str, bad: str):
    return block(
        f"{activity_id}-{qid}",
        "single-choice",
        {
            "formative": True,
            "questionId": f"{activity_id}:{qid}",
            "sourceQuestionId": qid,
            "sourceType": "single",
            "prompt": prompt,
            "options": [{"id": oid, "label": label} for oid, label in options],
            "correctOptionId": correct,
            "feedback": {"correct": ok, "incorrect": bad},
        },
    )


def classify(
    activity_id: str,
    qid: str,
    prompt: str,
    categories: list,
    items: list,
    ok: str | None = None,
    bad: str | None = None,
):
    content = {
        "formative": True,
        "questionId": f"{activity_id}:{qid}",
        "sourceQuestionId": qid,
        "prompt": prompt,
        "categories": [{"id": cid, "label": label} for cid, label in categories],
        "items": [
            {"id": iid, "label": label, "correctCategoryId": cat} for iid, label, cat in items
        ],
    }
    if ok or bad:
        content["feedback"] = {"correct": ok or "", "incorrect": bad or ""}
    return block(f"{activity_id}-{qid}", "classification", content)


def match(
    activity_id: str,
    qid: str,
    prompt: str,
    items: list,
    targets: list,
    correct: dict,
    ok: str,
    bad: str,
):
    return block(
        f"{activity_id}-{qid}",
        "drag-drop",
        {
            "formative": True,
            "questionId": f"{activity_id}:{qid}",
            "sourceQuestionId": qid,
            "prompt": prompt,
            "items": [{"id": iid, "label": label} for iid, label in items],
            "targets": [{"id": tid, "label": label} for tid, label in targets],
            "correct": correct,
            "feedback": {"correct": ok, "incorrect": bad},
        },
    )


def session_release_status(week_n: int, lesson_index: int | None = None, homework: bool = False) -> str:
    """Week 1 releases Lesson 1 only. Later weeks keep all sessions available once the week is posted."""
    if week_n != 1:
        return "available"
    if homework:
        return "planned"
    return "available" if lesson_index == 1 else "planned"


def activity(
    ident: str,
    title: str,
    summary: str,
    activity_type: str,
    topics: list[str],
    los: list[str],
    minutes: int,
    blocks: list,
    difficulty: str = "standard",
):
    return rec(
        "activity",
        ident,
        {
            "title": title,
            "status": "available",
            "summary": summary,
            "href": None,
            "difficulty": difficulty,
            "familyId": ident,
            "estimatedDurationMinutes": minutes,
            "activityType": activity_type,
            "topics": topics,
            "detail": summary,
        },
        {
            "learningOutcomes": los,
            "assignment": "os-formative",
            "questions": [],
            "assets": [],
            "prerequisites": [],
        },
        blocks=blocks,
    )


def expand_blocks(activity_id: str, specs: list):
    out = []
    for spec in specs:
        kind = spec[0]
        if kind == "h2":
            out.append(heading(f"{activity_id}-title", spec[1], 2))
        elif kind == "h3":
            out.append(heading(f"{activity_id}-{spec[1]}-h", spec[2], 3))
        elif kind == "p":
            out.append(para(f"{activity_id}-{spec[1]}", spec[2]))
        elif kind == "c":
            out.append(callout(f"{activity_id}-{spec[1]}", spec[2], spec[3]))
        elif kind == "t":
            out.append(teacher(f"{activity_id}-teacher", spec[1]))
        elif kind == "short":
            qid, prompt, placeholder, *rest = spec[1:]
            guidance = next((item for item in rest if isinstance(item, str)), None)
            min_chars = next((item for item in rest if isinstance(item, int)), None)
            out.append(short(activity_id, qid, prompt, placeholder, guidance, min_chars))
        elif kind == "single":
            out.append(single(activity_id, *spec[1:]))
        elif kind == "classify":
            out.append(classify(activity_id, *spec[1:]))
        elif kind == "match":
            out.append(match(activity_id, *spec[1:]))
        else:
            raise ValueError(spec)
    return out


WEEK_1["clientScenario"] = OAKFIELD_SCENARIO

# Compact SoL week definitions. Each lesson has retrieval, main and formative.
WEEKS = [
    WEEK_1,
    {
        "n": 2,
        "title": "Emerging Technologies, Solutions and Knowledge Gaps",
        "wc": "2026-09-07",
        "phase": "analyse-problem",
        "practice": "LO1 / 1.1 — research emerging technologies; evaluate existing and potential solutions; identify regulations and personal knowledge gaps",
        "lo_ids": ["lo1"],
        "outcomes": [
            ("w2-research-emerging", "Research newly emerging technologies"),
            ("w2-evaluate-solutions", "Evaluate existing and potential solutions against user needs"),
            ("w2-identify-gaps", "Identify guidelines, regulations and personal knowledge gaps"),
        ],
        "lessons": [
            {
                "title": "Lesson 1: Existing versus emerging options",
                "summary": "Retrieve Week 1 findings, then compare an existing approach with an emerging alternative.",
                "retrieval": {
                    "title": "Retrieval: Oakfield context and current systems",
                    "summary": "Retrieve client context and current systems before considering newer technologies.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Current systems", "Client context"],
                    "blocks": [
                        ("h2", "Retrieve Week 1"),
                        ("short", "now", "What do Oakfield staff use today to take bookings and registers?", "Bookings: ... Registers: ..."),
                        ("single", "q1", "A technology is 'emerging' in this project when:",
                         [("a", "It is digital"), ("b", "It is still developing or not yet a normal fit for this context"), ("c", "A vendor advertised it this week"), ("d", "It uses the cloud")],
                         "b", "Emerging is about development and adoption in context, not a marketing label.", "Something can be current in one sector and emerging in adult-learning admin."),
                    ],
                },
                "main": {
                    "title": "Compare existing and emerging solutions",
                    "summary": "Use fitness for purpose, cost, risk, regulation and user impact — not personal preference.",
                    "type": "Guided learning",
                    "minutes": 35,
                    "topics": ["Evaluation", "Emerging technology"],
                    "blocks": [
                        ("h2", "Comparing options"),
                        ("p", "intro", "Teams evaluate options before they write a proposal. An emerging tool is not automatically better."),
                        ("c", "criteria", "Comparison criteria", "Purpose and users; cost (including training); risk; regulation (GDPR, accessibility); user impact, including digital exclusion; vendor lock-in and maintainability."),
                        ("short", "compare", "Compare paper-plus-spreadsheet with one emerging alternative (for example AI course matching or biometric attendance). Use at least three criteria.", "Existing: ... Emerging: ... Criteria: ..."),
                        ("short", "justify", "Why is your alternative emerging rather than established in this adult-learning context?", "It is emerging because..."),
                        ("t", "SoL Week 2: tutor models comparison. Prompts cover purpose, users, cost, risk, regulation. Extension: lock-in, accessibility, long-term maintainability."),
                    ],
                },
                "formative": {
                    "title": "Progress check: evidence or preference",
                    "summary": "Spot evaluations that use evidence rather than taste.",
                    "type": "Classification",
                    "minutes": 10,
                    "topics": ["Evaluation"],
                    "blocks": [
                        ("h2", "Evidence or preference"),
                        ("classify", "sort", "Classify each justification.",
                         [("evidence", "Uses evidence / criteria"), ("preference", "Personal preference or hype")],
                         [("item-1", "Biometric registers may need extra lawful-basis advice under UK GDPR", "evidence"),
                          ("item-2", "AI matching sounds modern so we should use it", "preference"),
                          ("item-3", "An app-only service would exclude learners who only use the library PC", "evidence"),
                          ("item-4", "I like the vendor's logo", "preference")]),
                    ],
                },
            },
            {
                "title": "Lesson 2: Evaluate candidate solutions",
                "summary": "Evaluate two or three candidates for Oakfield, including at least one emerging technology.",
                "retrieval": {
                    "title": "Retrieval: comparison criteria",
                    "summary": "Retrieve the criteria used to compare solutions.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Evaluation criteria"],
                    "blocks": [
                        ("h2", "Retrieve the criteria"),
                        ("short", "criteria", "List four criteria for comparing solutions in this project.", "1. ..."),
                        ("single", "q1", "Which option is weakest as an evaluation?",
                         [("a", "Cost including staff training"), ("b", "Whether learners with low digital confidence can complete a booking"), ("c", "Whether the tutor personally enjoys using AI chat"), ("d", "Whether personal data stays in the UK / under UK GDPR")],
                         "c", "Personal taste is not an evaluation criterion for a public service.", "Use purpose, users, cost, risk and regulation."),
                    ],
                },
                "main": {
                    "title": "Candidate solutions for Oakfield",
                    "summary": "Record strengths, limitations and unknowns for two or three options.",
                    "type": "Guided learning",
                    "minutes": 35,
                    "topics": ["Solutions", "Unknowns"],
                    "blocks": [
                        ("h2", "Evaluate candidates"),
                        ("p", "intro", "Include the current way of working as a candidate. Include at least one emerging option. Record unknowns honestly — they become knowledge gaps."),
                        ("c", "options", "Possible candidates", "A: improved spreadsheet plus email. B: Microsoft Forms / Power Apps on existing 365. C: specialist adult-learning MIS. D: emerging AI recommender for courses. E: QR or biometric attendance."),
                        ("short", "table", "For two candidates, record one strength, one limitation and one unknown each.", "Candidate 1: ... Candidate 2: ..."),
                        ("short", "users", "Which candidate is weaker for a learner who does not own a smartphone, and why?", "Candidate: ... Why: ..."),
                        ("t", "SoL Week 2 guided learning: evaluate 2–3 candidates including one emerging technology. Source cards reduce reading load."),
                    ],
                },
                "formative": {
                    "title": "Progress check: unknowns are not failures",
                    "summary": "Sort known facts from guesses, then name what still needs research.",
                    "type": "Progress check",
                    "minutes": 10,
                    "topics": ["Knowledge gaps"],
                    "blocks": [
                        ("h2", "Name the unknown"),
                        ("classify", "sort", "Classify each statement from an evaluation.",
                         [("known", "Supported by the brief or research"), ("unknown", "Still an unknown"), ("assumption", "Assumption or guess")],
                         [("item-1", "Staff already use Microsoft 365", "known"),
                          ("item-2", "Biometric attendance would be popular with every learner", "assumption"),
                          ("item-3", "The lawful basis for biometric attendance has not been checked", "unknown"),
                          ("item-4", "Learners currently phone or visit reception", "known")]),
                        ("short", "unknown", "Write one unknown from your evaluation and one action that would close it.", "Unknown: ... Action: ..."),
                        ("single", "q1", "A good next action for an unknown about GDPR and biometrics is:",
                         [("a", "Assume it is fine because other colleges do it"), ("b", "Check ICO / centre DPO guidance and record the source"), ("c", "Skip the topic until after coding"), ("d", "Ask a social media poll")],
                         "b", "Legal and data questions need reliable sources, not assumption.", "Record the gap and a concrete research action."),
                    ],
                },
            },
            {
                "title": "Lesson 3: Regulation and knowledge gaps",
                "summary": "Identify guidelines or regulations that may apply, and list personal knowledge, skill or information gaps.",
                "retrieval": {
                    "title": "Retrieval: why regulation appears in evaluation",
                    "summary": "Retrieve why regulation is a comparison criterion, not an afterthought.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Regulation"],
                    "blocks": [
                        ("h2", "Retrieve regulation as a criterion"),
                        ("single", "q1", "Why does UK GDPR matter when choosing an attendance technology?",
                         [("a", "It only applies to banks"), ("b", "Attendance data can be personal data and some biometrics are special category data"), ("c", "It bans all cloud software"), ("d", "It replaces accessibility law")],
                         "b", "Registers identify people. Some biometric data needs extra conditions.", "Data protection shapes which options are even legal."),
                        ("short", "gap", "Name one thing you do not yet know well enough to recommend a technology to Oakfield.", "I do not yet know..."),
                    ],
                },
                "main": {
                    "title": "Guidelines, regulations and personal gaps",
                    "summary": "List applicable rules and a short personal research plan.",
                    "type": "Independent application",
                    "minutes": 30,
                    "topics": ["GDPR", "Accessibility", "Training needs"],
                    "blocks": [
                        ("h2", "Rules and gaps"),
                        ("p", "intro", "You are not expected to be a lawyer. You are expected to name relevant guidelines and be honest about what you still need to learn."),
                        ("c", "rules-note", "Likely starting points", "UK GDPR and ICO guidance; Equality Act / accessibility of public digital services; centre acceptable-use and AI policies; funder data-quality rules."),
                        ("short", "rules", "Name two guidelines or regulations that may apply to Oakfield's service, and what they might affect.", "1. ... affects ... 2. ..."),
                        ("short", "plan", "Write one knowledge gap and one action to address it (source, person, or practice task).", "Gap: ... Action: ..."),
                        ("t", "SoL Week 2 independent application: regulations/guidelines and personal knowledge gaps. Challenge: vendor lock-in and maintainability."),
                    ],
                },
                "formative": {
                    "title": "Progress check: emerging, not established",
                    "summary": "Sort emerging from established in this adult-learning context, then justify one choice.",
                    "type": "Progress check",
                    "minutes": 8,
                    "topics": ["Emerging technology"],
                    "blocks": [
                        ("h2", "Emerging in this context"),
                        ("classify", "sort", "Classify each technology for Oakfield's adult-learning admin, not for tech news in general.",
                         [("emerging", "Emerging in this context"), ("established", "Established in this context")],
                         [("item-1", "Paper diary and shared spreadsheet for bookings", "established"),
                          ("item-2", "Biometric attendance for adult learners", "emerging"),
                          ("item-3", "Microsoft 365 email already used by staff", "established"),
                          ("item-4", "AI course matching for learners with low digital confidence", "emerging")]),
                        ("short", "why", "Pick one technology. Explain why it is emerging, not established, for Oakfield.", "Technology: ... It is emerging here because..."),
                    ],
                },
            },
        ],
        "homework": {
            "title": "Homework: one emerging technology with a source",
            "summary": "Research one emerging technology relevant to Oakfield. Note one benefit, one risk and one source.",
            "id_suffix": "emerging",
            "minutes": 25,
            "topics": ["Emerging technology", "Sources"],
            "blocks": [
                ("h2", "Independent study"),
                ("short", "tech", "Name the technology, one benefit and one risk for Oakfield's users.", "Technology: ... Benefit: ... Risk: ..."),
                ("short", "source", "Give the source you used (title, organisation, year or date). Why is it usable for a proposal?", "Source: ... I would use it because..."),
            ],
        },
    },
    {
        "n": 3,
        "title": "Business Requirements, Scope and Decomposition",
        "wc": "2026-09-14",
        "phase": "analyse-problem",
        "practice": "LO1 / 1.1 — identify business requirements and scope; assess measurable value; apply decomposition, pattern recognition and abstraction",
        "lo_ids": ["lo1"],
        "outcomes": [
            ("w3-business-scope", "Identify business requirements and define project scope"),
            ("w3-measurable-value", "Assess measurable value to the user and client"),
            ("w3-decomposition", "Apply decomposition, pattern recognition and abstraction"),
        ],
        "lessons": [
            {
                "title": "Lesson 1: From research to scoped requirements",
                "summary": "Turn a vague client statement into a scoped requirement, with in-scope, out-of-scope and unknown.",
                "retrieval": {
                    "title": "Retrieval: needs, systems and options",
                    "summary": "Retrieve client needs, current systems and solution options.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Scope", "Requirements"],
                    "blocks": [
                        ("h2", "Retrieve research findings"),
                        ("short", "need", "Write one Oakfield business need in a single sentence (not a feature).", "The Hub needs to..."),
                        ("single", "q1", "Which is a business need rather than a technical feature?",
                         [("a", "Use React with a REST API"), ("b", "Managers can see which courses are full without waiting until Friday"), ("c", "Store passwords with bcrypt"), ("d", "Deploy on Kubernetes")],
                         "b", "A business need is the outcome the organisation needs. Features and stack choices come later.", "Do not jump to implementation."),
                    ],
                },
                "main": {
                    "title": "Scoping a vague request",
                    "summary": "Model in scope, out of scope and still unknown for Oakfield.",
                    "type": "Guided learning",
                    "minutes": 35,
                    "topics": ["Scope", "Business requirements"],
                    "blocks": [
                        ("h2", "Scope stops over-promising"),
                        ("p", "intro", "Teams control scope so they do not over-promise in a client proposal. Unclear scope can waste public money or exclude users whose needs were never captured."),
                        ("c", "example", "Worked example", "Vague: 'make booking online'. Scoped: 'Adult learners can request a place on a published course from a college PC or phone. Out of scope for increment 1: taking card payments. Unknown: whether waiting lists are required.'"),
                        ("short", "inscope", "Write one in-scope business requirement for increment 1.", "In scope: ..."),
                        ("short", "outscope", "Write one explicit out-of-scope item and why you parked it.", "Out of scope: ... Because: ..."),
                        ("t", "SoL Week 3: tutor models vague statement to scoped requirement. Sentence starters for scope. Extension: dependencies between parts."),
                    ],
                },
                "formative": {
                    "title": "Progress check: need versus feature",
                    "summary": "Classify statements as business need, feature, or unknown.",
                    "type": "Classification",
                    "minutes": 10,
                    "topics": ["Business needs", "Features"],
                    "blocks": [
                        ("h2", "Need, feature or unknown"),
                        ("classify", "sort", "Classify each statement.",
                         [("need", "Business need"), ("feature", "Technical feature"), ("unknown", "Still unknown")],
                         [("item-1", "Tutors can record who attended a session", "need"),
                          ("item-2", "Use a graph database", "feature"),
                          ("item-3", "Whether evening courses need a different booking window", "unknown"),
                          ("item-4", "Funder reports without retyping registers", "need"),
                          ("item-5", "Must be written in Rust", "feature")]),
                    ],
                },
            },
            {
                "title": "Lesson 2: Decomposition, patterns and abstraction",
                "summary": "Break the Oakfield problem into parts, group similar needs and drop unnecessary detail.",
                "retrieval": {
                    "title": "Retrieval: in and out of scope",
                    "summary": "Retrieve one in-scope and one out-of-scope item.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Scope"],
                    "blocks": [
                        ("h2", "Retrieve scope"),
                        ("short", "pair", "State one in-scope and one out-of-scope item from Lesson 1.", "In: ... Out: ..."),
                        ("single", "q1", "Decomposition means:",
                         [("a", "Deleting user needs to make coding easier"), ("b", "Breaking a problem into smaller parts you can analyse and plan"), ("c", "Choosing a programming language"), ("d", "Writing the user interface first")],
                         "b", "Decomposition is splitting the problem so the team can understand and plan it.", "You still keep the user's need; you just structure the work."),
                    ],
                },
                "main": {
                    "title": "Decompose the Oakfield problem",
                    "summary": "Group similar needs and hide detail that does not change increment 1.",
                    "type": "Guided learning",
                    "minutes": 35,
                    "topics": ["Decomposition", "Abstraction", "Pattern recognition"],
                    "blocks": [
                        ("h2", "Smaller parts, same problem"),
                        ("p", "intro", "Pattern recognition: booking a maths taster and a digital-skills course share 'find, request, confirm'. Abstraction: hide venue Wi-Fi details until you design the offline register."),
                        ("short", "groups", "Group Oakfield needs into three parts (for example find-and-book, register, reports). List two needs in each.", "Part 1: ... Part 2: ... Part 3: ..."),
                        ("short", "abstract", "Give one detail you can hide for now, and one dependency between parts.", "Hide: ... Dependency: ..."),
                        ("t", "SoL Week 3: decompose, group, remove unnecessary detail. Extension: dependencies between decomposed parts."),
                    ],
                },
                "formative": {
                    "title": "Progress check: justify a grouping",
                    "summary": "Sort decomposition, pattern recognition and abstraction, then justify one grouping.",
                    "type": "Progress check",
                    "minutes": 8,
                    "topics": ["Decomposition"],
                    "blocks": [
                        ("h2", "Justify the grouping"),
                        ("classify", "sort", "Classify each move.",
                         [("decomp", "Decomposition"), ("pattern", "Pattern recognition"), ("abstract", "Abstraction")],
                         [("item-1", "Split Oakfield into find-and-book, register, and reports", "decomp"),
                          ("item-2", "Maths taster and digital-skills booking share find, request, confirm", "pattern"),
                          ("item-3", "Hide venue Wi-Fi detail until you design the offline register", "abstract"),
                          ("item-4", "Treat 'request a place' as the same need across courses", "pattern")]),
                        ("short", "why", "Why did you put two needs in the same group?", "They belong together because..."),
                    ],
                },
            },
            {
                "title": "Lesson 3: First-cut scope statement",
                "summary": "Produce a first-cut scope statement and a simple decomposition for the continuing scenario.",
                "retrieval": {
                    "title": "Retrieval: measurable value",
                    "summary": "Retrieve who gains value if the project works.",
                    "type": "Retrieval",
                    "minutes": 8,
                    "topics": ["Value"],
                    "blocks": [
                        ("h2", "Value to user and client"),
                        ("short", "value", "Give one measurable value for learners and one for managers.", "Learners: ... Managers: ..."),
                        ("single", "q1", "Which success measure is most checkable?",
                         [("a", "Make the Hub more modern"), ("b", "Staff stop keeping a parallel paper diary for published courses within one term"), ("c", "Everyone loves the app"), ("d", "Use exciting technology")],
                         "b", "Measurable value can be observed. 'Modern' cannot.", "Tie value to a user or client outcome."),
                    ],
                },
                "main": {
                    "title": "Write the first-cut scope",
                    "summary": "Independent application: scope statement plus simple decomposition.",
                    "type": "Independent application",
                    "minutes": 30,
                    "topics": ["Scope statement"],
                    "blocks": [
                        ("h2", "First-cut scope statement"),
                        ("p", "intro", "A client should be able to read this without jargon. Include in scope, out of scope, and unknowns."),
                        ("short", "scope", "Write a first-cut scope statement for Oakfield increment 1 (8–12 lines).", "In scope: ... Out of scope: ... Unknowns: ..."),
                        ("short", "decomp", "List the decomposed parts you will take into Week 4 requirements.", "1. ... 2. ... 3. ..."),
                        ("t", "SoL Week 3 independent application: first-cut scope and simple decomposition."),
                    ],
                },
                "formative": {
                    "title": "Progress check: out of scope is explicit",
                    "summary": "Classify scope items, then confirm that out-of-scope work is written down.",
                    "type": "Progress check",
                    "minutes": 8,
                    "topics": ["Scope"],
                    "blocks": [
                        ("h2", "Make out-of-scope visible"),
                        ("classify", "sort", "Classify each item for Oakfield increment 1.",
                         [("inscope", "In scope"), ("outscope", "Out of scope"), ("unknown", "Still unknown")],
                         [("item-1", "Adult learners can request a place on a published course", "inscope"),
                          ("item-2", "Taking card payments", "outscope"),
                          ("item-3", "Whether waiting lists are required", "unknown"),
                          ("item-4", "A native iOS game for the Hub", "outscope")]),
                        ("single", "q1", "Why must out-of-scope items be written down in the first-cut statement?",
                         [("a", "So the team can ignore the client"), ("b", "So extra work cannot silently creep in and blow time, budget or inclusion"), ("c", "So you can start coding the out-of-scope items first"), ("d", "Because the awarding organisation requires a logo")],
                         "b", "Explicit out-of-scope stops silent extra work that blows time, budget or who the service includes.", "If it is only implied, it will creep back into the increment."),
                        ("short", "out", "Copy one out-of-scope item from your statement. What would go wrong if it silently crept back in?", "Item: ... If it crept in: ..."),
                    ],
                },
            },
        ],
        "homework": {
            "title": "Homework: rewrite two vague statements",
            "summary": "Rewrite two vague client statements as clearer business requirements and mark whether each is in scope.",
            "id_suffix": "rewrite",
            "minutes": 20,
            "topics": ["Business requirements", "Scope"],
            "blocks": [
                ("h2", "Independent study"),
                ("p", "intro", "Use these vague lines, or two from Oakfield: 'make it user-friendly' and 'put everything online'."),
                ("short", "one", "Rewrite statement 1 as a business requirement. In scope for increment 1? Yes/No and why.", "Requirement: ... In scope: ..."),
                ("short", "two", "Rewrite statement 2 as a business requirement. In scope? Yes/No and why.", "Requirement: ... In scope: ..."),
            ],
        },
    },
]


def week_meta(spec):
    n = spec["n"]
    outcomes = [oid for oid, _ in spec["outcomes"]]
    sessions = [f"week-{n}-lesson-{i}" for i in range(1, 4)] + [f"week-{n}-homework"]
    metadata = {
        "teachingWeek": n,
        "title": spec["title"],
        "status": "available" if n == 1 else "planned",
        "phase": spec["phase"],
        "professionalPractice": spec["practice"],
        "route": f"weeks/week-{n}/",
        "weekCommencing": spec["wc"],
        "releaseDate": None,
        "dueDate": None,
    }
    if spec.get("clientScenario"):
        metadata["clientScenario"] = spec["clientScenario"]
    return rec(
        "week",
        f"week-{n}",
        metadata,
        {
            "curriculum": "tlevel-software-development-curriculum",
            "learningOutcomes": spec["lo_ids"] + outcomes,
            "assignment": "os-formative",
            "sessions": sessions,
        },
    )


# Remaining weeks — compact but SoL-faithful.


def w(
    n,
    title,
    wc,
    phase,
    practice,
    lo_ids,
    outcomes,
    lessons,
    homework,
):
    return {
        "n": n,
        "title": title,
        "wc": wc,
        "phase": phase,
        "practice": practice,
        "lo_ids": lo_ids,
        "outcomes": outcomes,
        "lessons": lessons,
        "homework": homework,
    }


def L(title, summary, retrieval, main, formative):
    return {
        "title": title,
        "summary": summary,
        "retrieval": retrieval,
        "main": main,
        "formative": formative,
    }


def A(title, summary, typ, minutes, topics, blocks, difficulty="standard"):
    return {
        "title": title,
        "summary": summary,
        "type": typ,
        "minutes": minutes,
        "topics": topics,
        "blocks": blocks,
        "difficulty": difficulty,
    }


def H(title, summary, suffix, minutes, topics, blocks):
    return {
        "title": title,
        "summary": summary,
        "id_suffix": suffix,
        "minutes": minutes,
        "topics": topics,
        "blocks": blocks,
    }


WEEKS_REST = [
    w(
        4,
        "Functional Requirements, Non-functional Requirements and Acceptance",
        "2026-09-21",
        "analyse-problem",
        "LO1 / 1.1 — define functional and non-functional requirements, KPIs, constraints and user acceptance criteria",
        ["lo1"],
        [
            ("w4-functional", "Define functional requirements"),
            ("w4-nonfunctional", "Define non-functional requirements"),
            ("w4-acceptance", "Define KPIs, constraints and user acceptance criteria"),
        ],
        [
            L(
                "Lesson 1: Need, feature, constraint or unknown",
                "Retrieve the Week 3 scope and classify sample statements.",
                A("Retrieval: scope into classes", "Classify sample statements against the Oakfield scope.", "Retrieval", 8, ["Requirements"], [
                    ("h2", "Retrieve the scope"),
                    ("short", "scope", "In one sentence, what is in scope for increment 1?", "Increment 1 covers..."),
                    ("single", "q1", "A constraint is:",
                     [("a", "A nice-to-have colour"), ("b", "A limit the solution must work within, such as budget, law or existing tools"), ("c", "A user story"), ("d", "A programming language preference with no reason")],
                     "b", "Constraints bound the solution. They are not the same as functional requirements.", "Constraints include law, budget, venues and existing systems."),
                ]),
                A("Write functional versus quality wording", "See how one need becomes a functional requirement and a non-functional quality attribute.", "Guided learning", 35, ["Functional", "Non-functional"], [
                    ("h2", "The same need, two kinds of requirement"),
                    ("p", "intro", "Functional: what the system must do. Non-functional: how well it must do it. Both are later tested. Accessibility and performance affect who can use a public service."),
                    ("c", "model", "Worked example", "Need: tutors record attendance. Functional: a tutor can mark each enrolled learner present or absent for a named session. Non-functional: the register remains usable on a tablet in under three seconds on Hub Wi-Fi, and is operable with a keyboard."),
                    ("short", "fr", "Write one functional requirement for learner course requests.", "The system shall..."),
                    ("short", "nfr", "Write one related non-functional requirement that is measurable where possible.", "The request form..."),
                    ("t", "SoL Week 4: tutor models FR, NFR, then KPI or acceptance. Colour-coded cards. Extension: acceptance for one NFR."),
                ]),
                A("Progress check: classify statements", "Classify at least four realistic statements.", "Classification", 10, ["Requirements"], [
                    ("h2", "Classify the statements"),
                    ("classify", "sort", "Classify each Oakfield statement.",
                     [("fr", "Functional requirement"), ("nfr", "Non-functional"), ("constraint", "Constraint"), ("unknown", "Unknown")],
                     [("item-1", "A tutor can submit a completed register for a session", "fr"),
                      ("item-2", "The booking page works with a screen reader", "nfr"),
                      ("item-3", "The Hub must follow UK GDPR", "constraint"),
                      ("item-4", "Whether waiting lists are needed is not yet decided", "unknown"),
                      ("item-5", "Funder CSV export completes without staff retyping names", "fr")]),
                ]),
            ),
            L(
                "Lesson 2: Testable wording",
                "Classify realistic statements and rewrite weak examples so they are testable.",
                A("Retrieval: FR versus NFR", "Retrieve the difference using yesterday's examples.", "Retrieval", 8, ["Requirements"], [
                    ("h2", "Retrieve the distinction"),
                    ("short", "diff", "In one sentence each, what is a functional requirement and what is a non-functional requirement?", "FR: ... NFR: ..."),
                    ("single", "q1", "Which requirement is most testable?",
                     [("a", "The system should be user-friendly"), ("b", "A learner can complete a course request on a college PC without staff help"), ("c", "Make it quite fast"), ("d", "Use a beautiful design")],
                     "b", "Testable wording describes an observable outcome.", "Avoid vague adjectives."),
                ]),
                A("Rewrite weak requirements", "Turn vague lines into testable FR, NFR or acceptance checks.", "Guided learning", 35, ["Acceptance", "Wording"], [
                    ("h2", "Make it testable"),
                    ("p", "intro", "If you cannot tell whether it passed, it is not yet a requirement. KPIs measure performance over time; acceptance criteria are checks for a specific item."),
                    ("short", "rewrite", "Rewrite 'the site must be fast' as a measurable NFR or KPI for Oakfield.", "Rewrite: ..."),
                    ("short", "accept", "Write an acceptance check for 'tutor submits a register'.", "Given... When... Then..."),
                    ("t", "SoL Week 4 guided: classify and rewrite. Weaker examples rewritten together first."),
                ]),
                A("Progress check: measurable NFR", "Check that non-functional requirements are measurable where possible.", "Progress check", 8, ["Non-functional"], [
                    ("h2", "Measurable where possible"),
                    ("short", "nfr", "Write one measurable accessibility or performance NFR for the booking form.", "NFR: ... How we would check: ..."),
                ]),
            ),
            L(
                "Lesson 3: Labelled requirements list",
                "Produce a short requirements list labelled functional, non-functional, constraint, KPI or acceptance.",
                A("Retrieval: constraint is not a requirement", "Retrieve an example of a constraint.", "Retrieval", 8, ["Constraints"], [
                    ("h2", "Constraints"),
                    ("short", "c", "Give one Oakfield constraint that is not a functional requirement.", "Constraint: ..."),
                    ("single", "q1", "A KPI is most useful when it:",
                     [("a", "Replaces all testing"), ("b", "Tracks a quality the client cares about, such as missed registers per week"), ("c", "Names a programming language"), ("d", "Is kept secret from users")],
                     "b", "KPIs are measures of success over time.", "Acceptance criteria check a specific requirement; KPIs watch ongoing performance."),
                ]),
                A("Produce a labelled list", "Independent application: short labelled requirements list for Oakfield.", "Independent application", 30, ["Requirements list"], [
                    ("h2", "Labelled requirements list"),
                    ("p", "intro", "Include at least two FR, two NFR, one constraint, one KPI and two acceptance criteria."),
                    ("short", "list", "Write your labelled list.", "FR1: ... NFR1: ... Constraint: ... KPI: ... AC1: ..."),
                    ("short", "notreq", "Identify one constraint that is not a requirement, and say why.", "Constraint: ... It is not a requirement because..."),
                    ("t", "SoL Week 4 independent: labelled list. Extension: acceptance for one NFR."),
                ]),
                A("Progress check: four classifications", "Self-check that you can classify four statement types.", "Progress check", 8, ["Requirements"], [
                    ("h2", "Quick check"),
                    ("short", "four", "Give one Oakfield example each of FR, NFR, constraint and acceptance criterion.", "FR: ... NFR: ... Constraint: ... AC: ..."),
                ]),
            ),
        ],
        H("Homework: acceptance for everyday actions", "Write acceptance criteria for two everyday digital actions, such as logging in or making a payment.", "accept", 20, ["Acceptance criteria"], [
            ("h2", "Independent study"),
            ("short", "login", "Write acceptance criteria for logging in to a learner account (Oakfield or a service you use).", "Given... When... Then..."),
            ("short", "pay", "Write acceptance criteria for making a payment or, if Oakfield is free, for confirming a funded place.", "Given... When... Then..."),
        ]),
    ),
    w(
        5,
        "Scheduling, Resources, Cost and Language Choice",
        "2026-09-28",
        "analyse-problem",
        "LO1 / 1.1 — schedule tasks and milestones; allocate resources and estimate costs; select a language using taught criteria",
        ["lo1"],
        [
            ("w5-schedule", "Schedule tasks, subtasks and milestones"),
            ("w5-resources-cost", "Allocate resources and estimate project costs"),
            ("w5-language", "Select a language using the taught criteria"),
        ],
        [
            L(
                "Lesson 1: Milestone plan",
                "Retrieve scoped requirements and draft a milestone schedule that includes testing and client review.",
                A("Retrieval: work before a first usable version", "Identify work that must happen before a first usable version.", "Retrieval", 8, ["Planning"], [
                    ("h2", "Before a first usable version"),
                    ("short", "before", "List four pieces of work that must happen before Oakfield staff could try a first usable version.", "1. ..."),
                    ("single", "q1", "A milestone plan that only lists 'build screens' is weak because:",
                     [("a", "Building is unimportant"), ("b", "Testing and client review must appear, not just construction"), ("c", "Milestones are only for Waterfall"), ("d", "Clients never look at plans")],
                     "b", "Planning belongs in a proposal. Review and testing are work, not extras.", "Include testing and client review in the order of work."),
                ]),
                A("Draft milestones for Oakfield", "Sequence milestones for the decomposed parts, including testing and review.", "Guided learning", 35, ["Milestones", "Schedule"], [
                    ("h2", "Order the work"),
                    ("p", "intro", "Supported learners can sequence prepared milestone cards. Extension: show a dependency and a contingency if a milestone slips. Under-costed digital projects can reduce quality, accessibility or staff wellbeing."),
                    ("short", "order", "List five milestones in order for increment 1. Justify why two of them are in that order.", "1. ... Justification: ..."),
                    ("short", "test", "Where do testing and client review sit in your plan? What happens if a milestone slips?", "Testing: ... Slip: ..."),
                    ("t", "SoL Week 5: tutor models a simple milestone plan. Timeline templates. Testing and client review must appear."),
                ]),
                A("Progress check: justify order", "Justify the order of two milestones.", "Progress check", 8, ["Milestones"], [
                    ("h2", "Justify two milestones"),
                    ("short", "why", "Why must one of your milestones come before another?", "A comes before B because..."),
                ]),
            ),
            L(
                "Lesson 2: Resources and a costed outline",
                "Allocate people, time and other resources; produce a simple costed outline for an early increment.",
                A("Retrieval: who does the work", "Retrieve roles you already know before costing.", "Retrieval", 8, ["Resources"], [
                    ("h2", "People and time"),
                    ("short", "who", "Name three people-types a small Oakfield increment might need (job role, not celebrity).", "1. ..."),
                    ("single", "q1", "A cost estimate should include:",
                     [("a", "Only the software licence if it is free"), ("b", "People time, licences, devices, training and an assumption list"), ("c", "Only the programmer's salary in ten years"), ("d", "Nothing, because public projects are free")],
                     "b", "Costing is part of a proposal. State assumptions.", "Hidden staff time is still a cost."),
                ]),
                A("Cost an early increment", "Allocate resources to decomposed parts and cost the increment.", "Guided learning", 35, ["Cost", "Resources"], [
                    ("h2", "A simple costed outline"),
                    ("p", "intro", "You are not producing a full commercial bid. You are showing you can think in days, roles and assumptions. Use round numbers and label them as estimates."),
                    ("c", "example", "Worked cost idea", "Example assumption: one developer and one analyst for four weeks, plus tutor time to trial the register, plus accessibility testing. State if 365 licences are already paid."),
                    ("short", "cost", "Draft a simple costed outline for increment 1. List assumptions.", "People: ... Other: ... Assumptions: ..."),
                    ("short", "assume", "Name one cost assumption that, if wrong, would change the plan.", "If ... then ..."),
                    ("t", "SoL Week 5: worked cost example. Do not invent fake precision."),
                ]),
                A("Progress check: one cost assumption", "Name one cost assumption.", "Progress check", 8, ["Cost"], [
                    ("h2", "Assumptions"),
                    ("short", "a", "Write one cost assumption for Oakfield.", "Assumption: ..."),
                ]),
            ),
            L(
                "Lesson 3: Language and stack choice",
                "Recommend a language or stack against suitability, policy, scalability, security, staffing, cost and reliability.",
                A("Retrieval: taught criteria", "Retrieve the language-choice criteria.", "Retrieval", 8, ["Language choice"], [
                    ("h2", "Taught criteria"),
                    ("short", "crit", "List the language-choice criteria taught this week.", "Suitability, ..."),
                    ("single", "q1", "Choosing a language only because you already know it is weak because:",
                     [("a", "Skills never matter"), ("b", "Staffing is one criterion, but policy, security, cost and reliability also matter for Oakfield"), ("c", "Clients always want a new language"), ("d", "Microsoft 365 forbids all code")],
                     "b", "Staffing is relevant, not the only factor. Record the trade-off.", "Use the full taught list."),
                ]),
                A("Recommend a stack", "Recommend a language or stack for Oakfield against the taught criteria.", "Independent application", 30, ["Language", "Stack"], [
                    ("h2", "Language-choice record"),
                    ("p", "intro", "A defensible recommendation for Oakfield might be web tech on the existing Microsoft 365 / cloud tools the staff already have, or a small web app the centre can host. Justify it; do not just name a favourite language."),
                    ("short", "rec", "Recommend a language or stack. Score it against the taught criteria.", "Recommendation: ... Suitability: ... Policy: ... Security: ... Staffing: ... Cost: ... Reliability: ..."),
                    ("short", "reject", "Name one option you would not choose and why.", "I would not choose ... because ..."),
                    ("t", "SoL Week 5 independent: language-choice record covering suitability, policy, scalability, security, staffing, cost, reliability."),
                ]),
                A("Progress check: one criterion", "Name one language-choice criterion besides personal skill.", "Progress check", 8, ["Language choice"], [
                    ("h2", "Not just skill"),
                    ("short", "c", "Name one criterion besides 'I already know it' and apply it to Oakfield.", "Criterion: ... Applied: ..."),
                ]),
            ),
        ],
        H("Homework: public project overruns", "Compare two public project overruns in the news and identify whether the issue looks like scope, schedule, resource or cost.", "overruns", 25, ["Planning", "Public projects"], [
            ("h2", "Independent study"),
            ("short", "two", "Name two public digital overruns (or well-known delayed public systems) and the main issue type for each.", "1. ... Issue: scope/schedule/resource/cost. 2. ..."),
            ("short", "oak", "What warning does this give for Oakfield's increment 1?", "Warning: ..."),
        ]),
    ),
    w(6, "Project Risk and User Analysis", "2026-10-05", "analyse-problem",
      "LO1 / 1.1 and LO2 / 2.1 — identify project risks and mitigation; analyse users with stories, activity diagrams, mind maps and road maps",
      ["lo1", "lo2"],
      [("w6-risk", "Identify project risks and plan mitigation"), ("w6-stories", "Analyse users using stories and activity diagrams"), ("w6-roadmap", "Analyse users using mind maps and product road maps")],
      [
        L("Lesson 1: Risk records", "Identify people, technology, schedule, data, supplier and user risks; distinguish mitigation from contingency.",
          A("Retrieval: constraints and schedule", "Retrieve requirements, constraints and schedule so risk is judged against the actual project.", "Retrieval", 8, ["Risk"], [
              ("h2", "Retrieve the live plan"),
              ("short", "facts", "Name one constraint, one in-scope need and one milestone that could slip.", "Constraint: ... Need: ... Milestone: ..."),
              ("single", "q1", "Mitigation is different from contingency because:",
               [("a", "They are the same word"), ("b", "Mitigation reduces the chance or impact before the risk hits; contingency is what you do if it still happens"), ("c", "Contingency is only for weather"), ("d", "Public projects are not allowed to have risks")],
               "b", "Record both. Oakfield still needs a plan if Wi-Fi fails on register night.", "Do not only list risk names."),
          ]),
          A("Build a risk record", "Cover people, technology, schedule, data, suppliers and users.", "Guided learning", 35, ["Risk", "Mitigation"], [
              ("h2", "Risks for Oakfield"),
              ("p", "intro", "User analysis stops a team building only what the sponsor asked for. Risk analysis stops them ignoring what could harm learners or staff. Consider users with different access needs, languages, devices and digital confidence."),
              ("short", "risks", "Record three risks (different categories). For each: likelihood/impact in plain English, mitigation, and contingency.", "1. ... 2. ... 3. ..."),
              ("short", "owner", "Who would own the data-protection risk, and how would it be monitored?", "Owner: ... Monitor: ..."),
              ("t", "SoL Week 6: tutor models a risk record. Simple risk matrix. Distinguish mitigation from contingency."),
          ]),
          A("Progress check: mitigation versus contingency", "Distinguish mitigation from contingency on one Oakfield risk.", "Progress check", 8, ["Risk"], [
              ("h2", "Mitigation or contingency"),
              ("short", "pair", "For weak classroom Wi-Fi, write one mitigation and one contingency.", "Mitigation: ... Contingency: ..."),
          ])),
        L("Lesson 2: User stories and activity diagrams", "Produce stories and an activity diagram for at least two user groups.",
          A("Retrieval: who the users are", "Retrieve at least two user groups.", "Retrieval", 8, ["Users"], [
              ("h2", "User groups"),
              ("short", "groups", "Name two Oakfield user groups and one group who is easy to forget.", "1. ... 2. ... Forgotten: ..."),
              ("single", "q1", "A useful user story includes:",
               [("a", "Only a database field list"), ("b", "Role, need and benefit"), ("c", "The programmer's favourite framework"), ("d", "A joke")],
               "b", "As a [role] I need [need] so that [benefit].", "Stories are about users, not screenshots of code."),
          ]),
          A("Stories and one activity diagram", "Write stories for two groups and sketch the flow for a priority task.", "Guided learning", 35, ["User stories", "Activity diagrams"], [
              ("h2", "From persona to flow"),
              ("p", "intro", "Supported learners complete story frames. Extension: split an epic into smaller stories and show a dependency. The client is not the only user."),
              ("short", "stories", "Write two user stories in role / need / benefit form, for two different groups.", "1. As a ... 2. As a ..."),
              ("short", "flow", "Describe an activity diagram for 'request a place' in numbered steps, including one alternative path (for example, course full).", "1. ... Alt: ..."),
              ("t", "SoL Week 6: persona cards and story templates. Check stories for role, need, benefit."),
          ]),
          A("Progress check: story quality", "Check a story for role, need and benefit.", "Progress check", 8, ["User stories"], [
              ("h2", "Repair a weak story"),
              ("short", "fix", "Rewrite: 'The system should have a button.' as a proper user story.", "As a ... I need ... so that ..."),
          ])),
        L("Lesson 3: Mind map and now/next/later road map", "Draft a mind map of the problem space and a product road map that respects scope and highest-value stories.",
          A("Retrieval: highest-value stories", "Retrieve which stories deliver value first.", "Retrieval", 8, ["Road map"], [
              ("h2", "Value first"),
              ("short", "now", "Which Oakfield story should be Now rather than Later, and why?", "Story: ... Why: ..."),
              ("single", "q1", "A now/next/later road map is useful because:",
               [("a", "It replaces all requirements"), ("b", "It shows priority without pretending every idea is in increment 1"), ("c", "It is only for games"), ("d", "Later means never tell the client")],
               "b", "Road maps respect scope and milestones. Later is still honest.", "Justify now versus later."),
          ]),
          A("Mind map and road map", "Independent application: problem-space mind map and a three-horizon road map.", "Independent application", 30, ["Mind maps", "Road maps"], [
              ("h2", "Map the space, then sequence value"),
              ("short", "map", "List mind-map branches for the Oakfield problem (users, venues, data, constraints, risks, reports).", "Branches: ..."),
              ("short", "roadmap", "Place at least six items into Now / Next / Later. Justify one Later item.", "Now: ... Next: ... Later: ... Justification: ..."),
              ("t", "SoL Week 6 independent: mind map and product road map. Extension: epic split and dependency."),
          ]),
          A("Progress check: now versus later", "Justify one now versus later road-map item.", "Progress check", 8, ["Road map"], [
              ("h2", "Priority"),
              ("short", "why", "Why is biometric attendance Later (or out) while a simple register is Now?", "Because..."),
          ])),
      ],
      H("Homework: stories for a familiar service", "Write two user stories for a familiar college or public service and note who is not represented.", "stories", 20, ["User stories", "Inclusion"], [
          ("h2", "Independent study"),
          ("short", "two", "Write two user stories for a college or public service you know.", "1. ... 2. ..."),
          ("short", "missing", "Who is not represented in those stories, and what harm could that cause?", "Missing: ... Harm: ..."),
      ])),
    w(7, "Process Diagrams, ERDs, Interface, Algorithms and Data Design", "2026-10-12", "analyse-problem",
      "LO1 / 1.1 — model processes and data; create interface designs and plan algorithms; create data-requirement designs",
      ["lo1"],
      [("w7-process-erd", "Model processes and data using diagrams and ERDs"), ("w7-interface-algo", "Create interface designs and plan algorithms"), ("w7-data", "Create data-requirement designs")],
      [
        L("Lesson 1: Process diagram and first-cut ERD", "Retrieve the priority user journey and model process plus data.",
          A("Retrieval: information the journey needs", "List the information the system must store or display for the priority journey.", "Retrieval", 8, ["Data", "Process"], [
              ("h2", "What the journey needs"),
              ("short", "info", "For 'request a place', list data the system must show or store.", "Show: ... Store: ..."),
              ("single", "q1", "An ERD is mainly for:",
               [("a", "Choosing button colours"), ("b", "Showing entities, keys and relationships the system must remember"), ("c", "Replacing user stories"), ("d", "The marketing website only")],
               "b", "You should be able to explain one relationship in plain English.", "Process diagrams show flow; ERDs show stored data."),
          ]),
          A("Process and data that agree", "Produce a process diagram and a first-cut data model.", "Guided learning", 35, ["Process diagrams", "ERD"], [
              ("h2", "Flow and data must match"),
              ("p", "intro", "This week teaches design as part of analysing a problem under 1.1, not the full later Occupational Specialism design competency. Consider users who magnify text, use keyboards only, or need clear language instead of icons alone."),
              ("short", "process", "Describe the process for requesting a place (including a rejection path).", "Steps: ..."),
              ("short", "erd", "List entities and relationships (for example Learner, Course, Request, Session, RegisterEntry). Explain one relationship in plain English.", "Entities: ... Relationship: ..."),
              ("t", "SoL Week 7: tutor models process, ERD, interface and algorithm that agree. Entity cards."),
          ]),
          A("Progress check: one relationship", "Explain one relationship in plain English.", "Progress check", 8, ["ERD"], [
              ("h2", "Plain English"),
              ("short", "rel", "Explain: one Course has many Sessions.", "This means..."),
          ])),
        L("Lesson 2: Interface sketch and algorithm", "Create a low-fidelity interface for a priority task and plan the algorithm behind it.",
          A("Retrieval: the priority task", "Retrieve the task the interface must support.", "Retrieval", 8, ["Interface"], [
              ("h2", "Priority task"),
              ("short", "task", "Which user task are you designing first, and which acceptance criterion does it serve?", "Task: ... AC: ..."),
              ("single", "q1", "A low-fidelity interface should:",
               [("a", "Include final branding before any user check"), ("b", "Show layout, labels, actions and an error or empty state clearly enough to test the idea"), ("c", "Be a finished native app"), ("d", "Hide all text so it looks modern")],
               "b", "Paper or simple wireframes are enough. Accessibility is part of the sketch.", "Match the algorithm to the actions on the screen."),
          ]),
          A("Sketch and algorithm", "Interface for a priority task plus the algorithm that must match it.", "Guided learning", 35, ["Interface", "Algorithms"], [
              ("h2", "Screen actions and steps"),
              ("p", "intro", "Supported learners complete a partially designed screen. Extension: error state or alternative path."),
              ("short", "ui", "Describe the register (or booking) screen: purpose, key labels, primary action, and one accessibility consideration.", "Purpose: ... Labels: ... Action: ... Access: ..."),
              ("short", "algo", "Write the algorithm as numbered steps that match those actions, including validation.", "1. ..."),
              ("t", "SoL Week 7: paper wireframe kits and algorithm templates. Questioning checks algorithm matches interface."),
          ]),
          A("Progress check: algorithm matches screen", "Check that the algorithm matches the interface actions.", "Progress check", 8, ["Algorithms"], [
              ("h2", "Do they agree?"),
              ("short", "match", "Name one screen action and the algorithm step that implements it. Name one mismatch you caught.", "Action: ... Step: ... Mismatch: ..."),
          ])),
        L("Lesson 3: Data-requirement design versus acceptance", "Plan data fields and check the design against acceptance criteria.",
          A("Retrieval: acceptance you already wrote", "Retrieve one acceptance criterion from Week 4.", "Retrieval", 8, ["Acceptance"], [
              ("h2", "Bring acceptance forward"),
              ("short", "ac", "Copy one acceptance criterion that your data design must satisfy.", "AC: ..."),
          ]),
          A("Data fields and a design check", "Independent application: data-requirement design checked against acceptance.", "Independent application", 30, ["Data design"], [
              ("h2", "Data requirements"),
              ("short", "fields", "For RegisterEntry (or Request), list fields, types, keys and one validation rule.", "Fields: ... Validation: ..."),
              ("short", "check", "Does this design let you pass the acceptance criterion? If not, what is missing?", "Pass? ... Missing: ..."),
              ("t", "SoL Week 7 independent: data-requirement designs checked against acceptance. One accessibility consideration."),
          ]),
          A("Progress check: accessibility in design", "Identify one accessibility consideration in the interface or data labels.", "Progress check", 8, ["Accessibility"], [
              ("h2", "Access is a design issue"),
              ("short", "a11y", "Name one accessibility consideration in your screen or field labels.", "Consideration: ..."),
          ])),
      ],
      H("Homework: critique a public screen", "Critique one public website or app screen against a user need and suggest one interface improvement.", "critique", 20, ["Interface", "User needs"], [
          ("h2", "Independent study"),
          ("short", "screen", "Name the screen and the user need you judged it against.", "Screen: ... Need: ..."),
          ("short", "improve", "What works, what fails, and one improvement?", "Works: ... Fails: ... Improvement: ..."),
      ])),
    w(8, "Generative AI and Prototyping", "2026-11-02", "analyse-problem",
      "LO1 / 1.1 — use generative AI appropriately; review AI output against requirements; create and evaluate a prototype",
      ["lo1"],
      [("w8-ai-use", "Use generative AI to produce code sections appropriately"), ("w8-ai-review", "Review AI-generated output against requirements"), ("w8-prototype", "Create and evaluate a prototype")],
      [
        L("Lesson 1: What a prototype must prove", "Retrieve a Week 7 design decision and identify what a prototype would need to prove to the client.",
          A("Retrieval: a design to prove", "Retrieve a design decision from Week 7.", "Retrieval", 8, ["Prototype"], [
              ("h2", "Prove it to the client"),
              ("short", "prove", "Which design decision would you prototype, and what would 'success' look like for Oakfield staff?", "Decision: ... Success: ..."),
              ("single", "q1", "A prototype is not the live service because:",
               [("a", "Prototypes are illegal"), ("b", "It is a learning and communication tool to test a question, not the full secure live system"), ("c", "Clients never look at prototypes"), ("d", "AI always makes it production-ready")],
               "b", "Tie the prototype to a requirement and a question the client can answer.", "Do not confuse a demo with go-live."),
          ]),
          A("Plan the prototype question", "Plan a prototype for one increment.", "Guided learning", 35, ["Prototyping"], [
              ("h2", "A prototype answers a question"),
              ("p", "intro", "Teams may use generative AI to speed up work, but they remain accountable for requirements, security and quality. Biased or incorrect AI output can harm users if it is accepted without review."),
              ("short", "q", "Write the prototype question, the requirement it links to, and who will try it.", "Question: ... Requirement: ... Who: ..."),
              ("short", "not", "What will this prototype deliberately not prove?", "It will not prove..."),
              ("t", "SoL Week 8: retrieve design; prototype must be tied to a requirement."),
          ]),
          A("Progress check: tied to a requirement", "Check that the prototype is tied to a requirement.", "Progress check", 8, ["Prototype"], [
              ("h2", "Requirement link"),
              ("short", "link", "Quote the requirement your prototype is for.", "Requirement: ..."),
          ])),
        L("Lesson 2: Reviewing AI-generated output", "Review a supplied AI fragment for correctness, security, bias, licensing and fit to requirements.",
          A("Retrieval: why human review remains", "Retrieve why AI output still needs human review.", "Retrieval", 8, ["Generative AI"], [
              ("h2", "Accountable humans"),
              ("single", "q1", "Why must a developer still review AI-generated code?",
               [("a", "Because AI is never allowed in T Level"), ("b", "Because the team remains accountable for correctness, security, bias, licensing and requirements"), ("c", "Because AI cannot produce any code"), ("d", "Because clients prefer longer projects")],
               "b", "Using AI is not the same as trusting AI.", "Keep, change or reject with reasons."),
              ("short", "harm", "Give one way unreviewed AI output could harm an Oakfield learner.", "Harm: ..."),
          ]),
          A("Keep, change or reject", "Review a supplied fragment against acceptance criteria.", "Guided learning", 35, ["AI review", "Security"], [
              ("h2", "Review a supplied fragment"),
              ("c", "frag", "Supplied AI fragment (treat as untrusted)", "Python-like sketch: a function `mark_present(name)` that appends the raw name to a public web page and emails the whole class list to whoever calls the function. No authentication. Comments say 'TODO: GDPR later'."),
              ("short", "review", "Complete a keep / change / reject table for correctness, security, bias, licensing/attribution, and fit to Oakfield requirements.", "Keep: ... Change: ... Reject: ..."),
              ("short", "sec", "Name one security or bias issue in the fragment.", "Issue: ..."),
              ("t", "SoL Week 8: supervised AI demonstration and keep/change/reject table. Extension: security or bias in the fragment."),
          ]),
          A("Progress check: human review", "Explain why AI output still needs human review.", "Progress check", 8, ["Generative AI"], [
              ("h2", "Still our responsibility"),
              ("short", "why", "In two sentences, why is the Oakfield team still responsible for AI-assisted code?", "Because..."),
          ])),
        L("Lesson 3: Evaluate the prototype plan", "Record what you would keep, change or reject and state one prototype question the client could answer.",
          A("Retrieval: client-answerable question", "Retrieve a question a client could answer from a prototype.", "Retrieval", 8, ["Prototype"], [
              ("h2", "A question the client can answer"),
              ("short", "ask", "Write one question Oakfield managers or tutors could answer after using your prototype.", "Question: ..."),
          ]),
          A("Record the evaluation", "Independent application: evaluation record.", "Independent application", 25, ["Prototype evaluation"], [
              ("h2", "Evaluate before promising"),
              ("short", "eval", "What would you keep, change or reject after a tutor trial of a paper or click-through prototype?", "Keep: ... Change: ... Reject: ..."),
              ("short", "next", "What is the next increment if the prototype fails the question?", "If it fails..."),
              ("t", "SoL Week 8 independent: record keep/change/reject and one client-answerable question."),
          ]),
          A("Progress check: one client question", "Name one prototype question the client could answer.", "Progress check", 8, ["Prototype"], [
              ("h2", "Client question"),
              ("short", "q", "Write the question in words a manager would recognise.", "Question: ..."),
          ])),
      ],
      H("Homework: AI policy or AI error", "Find an organisation's public statement on acceptable AI use, or a news example of AI error, and note one implication for software teams.", "ai-policy", 20, ["Generative AI", "Professional practice"], [
          ("h2", "Independent study"),
          ("short", "find", "Name the organisation or news example and what it says or showed.", "Source: ..."),
          ("short", "imply", "One implication for a team building Oakfield's service?", "Implication: ..."),
      ])),
    w(9, "Testing Plans and Deployment", "2026-11-09", "analyse-problem",
      "LO1 / 1.1 — plan module, integration, automated and user testing; explain deploy, install, configure and update steps",
      ["lo1"],
      [("w9-module-integration", "Plan module and integration testing"), ("w9-automated-user", "Plan automated and user testing and gather feedback"), ("w9-deploy", "Explain deploy, install, configure and update steps")],
      [
        L("Lesson 1: Test levels", "Map module, integration, automated and user testing onto the lifecycle.",
          A("Retrieval: prototype is not live", "Retrieve why a prototype is not the same as a live service.", "Retrieval", 8, ["Testing"], [
              ("h2", "Before users rely on it"),
              ("short", "true", "List three things that must be true before Oakfield staff rely on the solution for a real register.", "1. ..."),
              ("single", "q1", "Module testing mainly checks:",
               [("a", "The whole organisation including funders"), ("b", "A small unit of behaviour in isolation"), ("c", "Only the colour scheme"), ("d", "Whether the CEO likes the name")],
               "b", "Integration testing checks that parts work together. Plan tests; do not leave them until the end.", "This week covers testing as SDLC understanding under 1.1, not the full later testing occupational area."),
          ]),
          A("Plan tests for one increment", "Include module and integration examples for Oakfield.", "Guided learning", 35, ["Module testing", "Integration testing"], [
              ("h2", "Tests belong in the plan"),
              ("p", "intro", "Supported learners sequence prepared lifecycle cards. Extension: rollback or communication if a release fails. Users who cannot update devices quickly, and staff who need training, are part of go-live risk."),
              ("short", "mod", "Write one module test and one integration test for the register increment.", "Module: ... Integration: ..."),
              ("short", "when", "When in the increment would these tests run?", "When: ..."),
              ("t", "SoL Week 9: tutor maps test levels onto the lifecycle. Testing-level diagram."),
          ]),
          A("Progress check: name two levels", "Name one module test and one integration test.", "Progress check", 8, ["Testing"], [
              ("h2", "Two levels"),
              ("short", "two", "Module test: ... Integration test: ...", "Module: ... Integration: ..."),
          ])),
        L("Lesson 2: Automated tests, user tests and feedback", "Plan automated and user testing and how feedback would be gathered.",
          A("Retrieval: who the testers are", "Retrieve who should try the increment besides developers.", "Retrieval", 8, ["User testing"], [
              ("h2", "Users in testing"),
              ("short", "who", "Who should trial the Oakfield register besides the developer, and why?", "Who: ... Why: ..."),
          ]),
          A("Plan feedback", "Plan automated checks plus a small user test.", "Guided learning", 30, ["Automated testing", "User testing"], [
              ("h2", "Machines and people"),
              ("short", "auto", "Name one check you would automate (for example, cannot submit an empty register).", "Automate: ..."),
              ("short", "user", "Plan a 20-minute user test with a tutor: tasks, data you would collect, and one accessibility check.", "Tasks: ... Data: ... Access: ..."),
              ("t", "SoL Week 9 guided: plan tests including how feedback is gathered."),
          ]),
          A("Progress check: testing is planned", "Confirm testing is not left until the end.", "Progress check", 8, ["Testing"], [
              ("h2", "Not an afterthought"),
              ("short", "plan", "Where does testing sit in your Week 5 milestone plan now?", "It sits..."),
          ])),
        L("Lesson 3: Deploy, install, configure, update", "Outline go-live steps including who does what.",
          A("Retrieval: post-release risk", "Identify one post-release risk.", "Retrieval", 8, ["Deployment"], [
              ("h2", "After go-live"),
              ("short", "risk", "Name one post-release risk for Oakfield.", "Risk: ..."),
              ("single", "q1", "Configuration in this week's sequence means:",
               [("a", "Choosing a nice font after launch only"), ("b", "Setting up the live environment so the product works in the real venues, accounts and permissions"), ("c", "Deleting all test accounts forever with no record"), ("d", "Ignoring Microsoft 365 because it is boring")],
               "b", "Deploy, install, configure, update — with named roles.", "Include who does what at go-live."),
          ]),
          A("Go-live outline", "Independent application: deployment, configuration and update steps.", "Independent application", 30, ["Deployment"], [
              ("h2", "Who does what at go-live"),
              ("short", "steps", "Outline deploy, install, configure and update for the register increment. Name roles.", "Deploy: ... Install: ... Configure: ... Update: ..."),
              ("short", "fail", "What is the rollback or communication step if a release fails on a teaching evening?", "If it fails..."),
              ("t", "SoL Week 9 independent: go-live outline. Extension: rollback/communication."),
          ]),
          A("Progress check: post-release risk", "Identify one post-release risk.", "Progress check", 8, ["Deployment"], [
              ("h2", "After the evening class"),
              ("short", "r", "One post-release risk and who notices it first.", "Risk: ... Who notices: ..."),
          ])),
      ],
      H("Homework: how a familiar app updates", "Describe how a familiar app updates and what users are asked to do, then note one support or training implication.", "updates", 20, ["Updates", "Training"], [
          ("h2", "Independent study"),
          ("short", "how", "How does a familiar app update, and what are users asked to do?", "App: ... Users must: ..."),
          ("short", "train", "One support or training implication for Oakfield staff if your service updates?", "Implication: ..."),
      ])),
    w(10, "Version Control, Maintenance and the Value of the SDLC", "2026-11-16", "analyse-problem",
      "LO1 / 1.1 — document changes and use version control; outline maintenance and support; explain organisational value of the SDLC",
      ["lo1"],
      [("w10-version-control", "Document changes and use suitable version control"), ("w10-maintenance", "Outline maintenance, support, bug fixing, training and updates"), ("w10-sdlc-value", "Explain organisational value and the role of the SDLC")],
      [
        L("Lesson 1: Version control as a professional story", "A change, a commit message, why history matters, and a live bug.",
          A("Retrieval: what still needs documenting", "Retrieve the deployment outline and list what still needs documenting after a change.", "Retrieval", 8, ["Documentation"], [
              ("h2", "After a change"),
              ("short", "doc", "List three things that should be recorded when the register behaviour changes.", "1. ..."),
              ("single", "q1", "Version history protects a team because:",
               [("a", "It makes the code slower"), ("b", "You can see what changed, who changed it, and you can recover or compare when a live bug appears"), ("c", "Git is only for hobbyists"), ("d", "Public sector teams are not allowed to use it")],
               "b", "Maintenance and version control are part of understanding the SDLC under 1.1.", "Support is planned, not improvised."),
          ]),
          A("Commit messages and a live bug", "Walk a simple version-control story.", "Guided learning", 30, ["Version control"], [
              ("h2", "History is a safety net"),
              ("short", "commit", "Write a useful commit message for 'prevent empty register submit'.", "Message: ..."),
              ("short", "bug", "A live bug marks the wrong learner absent. What does version history help you do first?", "First: ..."),
              ("t", "SoL Week 10: tutor demonstrates change, commit, history, live bug. Commit-message examples."),
          ]),
          A("Progress check: why history", "Explain one reason version history protects a team.", "Progress check", 8, ["Version control"], [
              ("h2", "Why keep history"),
              ("short", "why", "One reason version history protects the Oakfield team.", "Because..."),
          ])),
        L("Lesson 2: Maintenance, support, training, updates", "Map maintenance activities onto the client scenario.",
          A("Retrieval: who needs to know", "Retrieve who must be informed when a live service changes.", "Retrieval", 8, ["Maintenance"], [
              ("h2", "Who is affected"),
              ("short", "who", "If the register screens change on Monday, who needs training or a notice?", "Who: ..."),
          ]),
          A("Maintenance map", "System support, user support, bug fixing, training and updates.", "Guided learning", 30, ["Maintenance"], [
              ("h2", "Keeping Oakfield running"),
              ("short", "map", "For Oakfield, outline system support, user support, bug fixing, training and updates.", "System: ... Users: ... Bugs: ... Training: ... Updates: ..."),
              ("short", "comm", "Plan one communication step if a release fails.", "Communication: ..."),
              ("t", "SoL Week 10: maintenance checklist. Staff who need training; users who cannot update devices quickly."),
          ]),
          A("Progress check: support is planned", "Check that support is planned, not improvised.", "Progress check", 8, ["Support"], [
              ("h2", "Planned support"),
              ("short", "plan", "Where do tutors go if the register fails at 18:00, according to your outline?", "They..."),
          ])),
        L("Lesson 3: Why the SDLC adds organisational value", "Explain SDLC value using the continuing project.",
          A("Retrieval: stages so far", "Retrieve SDLC stages already taught.", "Retrieval", 8, ["SDLC"], [
              ("h2", "Stages so far"),
              ("short", "stages", "List the SDLC stages you have already practised with Oakfield.", "Research, ..."),
          ]),
          A("Value explanation", "Independent application: short explanation a manager could read.", "Independent application", 25, ["SDLC"], [
              ("h2", "Value to the organisation"),
              ("p", "intro", "Skipping stages on a public or essential service can harm the people with least power to choose an alternative."),
              ("short", "value", "Explain why following the SDLC adds value for Oakfield. Use the continuing project as the example.", "The SDLC helps Oakfield because..."),
              ("short", "skip", "What would likely go wrong if they skipped user analysis or testing?", "If skipped..."),
              ("t", "SoL Week 10 independent: organisational value and the role of the SDLC."),
          ]),
          A("Progress check: one organisational benefit", "State one organisational benefit of following the SDLC.", "Progress check", 8, ["SDLC"], [
              ("h2", "Benefit"),
              ("short", "b", "One organisational benefit, in a sentence a manager would accept.", "Benefit: ..."),
          ])),
      ],
      H("Homework: the last update you noticed", "Describe the last update you noticed on a familiar service and who had to be informed or trained.", "last-update", 15, ["Updates", "Training"], [
          ("h2", "Independent study"),
          ("short", "update", "What updated, what changed for users, and who needed to know?", "Service: ... Change: ... Who: ..."),
      ])),
    w(11, "Digital Team Roles, Product Owner to Designer", "2026-11-23", "digital-team",
      "LO1 / 1.2 — identify product owner, Scrum master and technical lead; explain project manager, systems analyst and UX/UI designer roles",
      ["lo1"],
      [("w11-po-sm-lead", "Identify product owner, Scrum master and technical lead roles"), ("w11-pm", "Explain the project manager role"), ("w11-analyst-ux", "Explain systems analyst and UX/UI designer responsibilities")],
      [
        L("Lesson 1: Who owns each SDLC stage", "Retrieve SDLC stages and meet the first official role set.",
          A("Retrieval: guessed owners", "Name who you think owns each stage before seeing the official set.", "Retrieval", 8, ["Roles", "SDLC"], [
              ("h2", "Before the role cards"),
              ("short", "guess", "Who did you think owned requirements, design and go-live before this lesson?", "Requirements: ... Design: ... Go-live: ..."),
              ("single", "q1", "Software is delivered by:",
               [("a", "A single genius with no handovers"), ("b", "A team with distinct responsibilities and handovers"), ("c", "The client typing the code"), ("d", "Testers only, after everyone else has finished")],
               "b", "Understanding roles is required to plan work, communication and quality.", "Diverse teams can reduce blind spots about users, accessibility and ethical risk."),
          ]),
          A("Introduce the first role set", "Product owner, Scrum master, technical lead, project manager, systems analyst, UX/UI designer.", "Guided learning", 35, ["Digital team"], [
              ("h2", "First role set"),
              ("p", "intro", "The tutor models who is responsible in a requirements workshop, a design review and a planning meeting. The client is not assumed to be the only user. The product owner is not the same as the project manager."),
              ("short", "match", "In your own words, what does each of these do: product owner, Scrum master, technical lead?", "PO: ... SM: ... Tech lead: ..."),
              ("short", "handover", "Explain one handover between systems analyst and UX/UI designer on Oakfield.", "Handover: ..."),
              ("t", "SoL Week 11: role cards and large-team diagram. Supported: match pairs. Extension: conflict between two roles."),
          ]),
          A("Progress check: PO versus PM", "Distinguish product owner from project manager.", "Progress check", 8, ["Product owner", "Project manager"], [
              ("h2", "Two different jobs"),
              ("short", "diff", "How is the product owner different from the project manager on Oakfield?", "PO: ... PM: ..."),
          ])),
        L("Lesson 2: Project manager responsibilities", "Budget, scope, schedule, risk and quality.",
          A("Retrieval: PM is not PO", "Retrieve the PO/PM distinction.", "Retrieval", 8, ["Project manager"], [
              ("h2", "Retrieve the distinction"),
              ("short", "pm", "Name the five PM concerns taught this week.", "Budget, ..."),
          ]),
          A("PM on the Oakfield increment", "Apply PM concerns to one increment.", "Guided learning", 30, ["Project manager"], [
              ("h2", "Budget, scope, schedule, risk, quality"),
              ("short", "apply", "For Oakfield increment 1, write one note under each PM concern.", "Budget: ... Scope: ... Schedule: ... Risk: ... Quality: ..."),
              ("short", "conflict", "Give one conflict that could appear between PM (schedule) and PO (scope), and how it should be resolved.", "Conflict: ... Resolution: ..."),
              ("t", "SoL Week 11: PM covers budget, scope, schedule, risk and quality."),
          ]),
          A("Progress check: client is not the only user", "Check that the client is not assumed to be the only user.", "Progress check", 8, ["Users"], [
              ("h2", "Users beyond the sponsor"),
              ("short", "users", "Name two Oakfield users who are not the paying client.", "1. ... 2. ..."),
          ])),
        L("Lesson 3: Analyst, designer, and assigning the increment", "Assign the first role set to one Oakfield increment.",
          A("Retrieval: analyst versus designer", "Retrieve the handover between analyst and designer.", "Retrieval", 8, ["Systems analyst", "UX/UI"], [
              ("h2", "Handover"),
              ("short", "h", "What does the analyst pass to the designer on Oakfield?", "They pass..."),
          ]),
          A("Assign roles to the increment", "Independent application: role assignment with a PO/PM justification.", "Independent application", 25, ["Roles"], [
              ("h2", "Assign the first set"),
              ("short", "assign", "Assign PO, Scrum master, technical lead, PM, systems analyst and UX/UI designer to the Oakfield increment. One sentence each on what they own this sprint.", "PO: ..."),
              ("short", "why", "Why is the product owner not the same as the project manager here?", "Because..."),
              ("t", "SoL Week 11 independent: assign roles; justify PO vs PM."),
          ]),
          A("Progress check: analyst–designer handover", "Explain one handover between analyst and designer.", "Progress check", 8, ["Handovers"], [
              ("h2", "If the handover is skipped"),
              ("short", "skip", "What fails if the designer never sees the analyst's user stories?", "Then..."),
          ])),
      ],
      H("Homework: job advertisement", "Research one job advertisement for a digital role from this week's set and list the responsibilities that match the specification.", "job-ad", 20, ["Roles", "Industry"], [
          ("h2", "Independent study"),
          ("short", "ad", "Role title, organisation, and three responsibilities that match this week's specification.", "Title: ... Matches: ..."),
      ])),
    w(12, "Remaining Team Roles and Agile Artefacts", "2026-11-30", "digital-team",
      "LO1 / 1.2 — identify developer, operations and security roles; explain tester and QA; use Agile sprints, epics, stories and spikes",
      ["lo1"],
      [("w12-dev-ops-sec", "Identify developer, operations and security roles"), ("w12-tester-qa", "Explain tester and quality-assurance responsibilities"), ("w12-agile-artefacts", "Use Agile sprints, epics, stories and spikes")],
      [
        L("Lesson 1: Developer, operations and security", "Who writes code, who keeps a service running, who owns security.",
          A("Retrieval: Week 11 roles", "Retrieve Week 11 roles and name who tests, who writes code and who keeps a service running.", "Retrieval", 8, ["Roles"], [
              ("h2", "Retrieve Week 11"),
              ("short", "three", "Who tests, who writes code, and who keeps a live service running — before today's official names?", "Test: ... Code: ... Run: ..."),
          ]),
          A("Developer, operations, security", "Match remaining roles to SDLC activities.", "Guided learning", 30, ["Developer", "Operations", "Security"], [
              ("h2", "Build, run, protect"),
              ("p", "intro", "Excluding testers or security engineers from early work can harm users later. Quality is not just the tester's job."),
              ("short", "roles", "In the Oakfield increment, what does the developer, operations engineer and security engineer each own?", "Dev: ... Ops: ... Sec: ..."),
              ("short", "conflict", "Show a conflict between security and delivery pressure, and how it should be resolved.", "Conflict: ... Resolution: ..."),
              ("t", "SoL Week 12: remaining roles. Extension: security vs delivery pressure."),
          ]),
          A("Progress check: quality is shared", "Questioning checks that quality is not just the tester's job.", "Progress check", 8, ["Quality"], [
              ("h2", "Not only the tester"),
              ("short", "q", "Give one quality action that is the developer's or security engineer's, not only the tester's.", "Action: ... Owner: ..."),
          ])),
        L("Lesson 2: Tester and quality assurance", "Software tester and QA responsibilities.",
          A("Retrieval: when testing starts", "Retrieve when testing is planned.", "Retrieval", 8, ["Testing roles"], [
              ("h2", "Early quality"),
              ("short", "when", "When should the tester first see Oakfield's acceptance criteria?", "They should see them..."),
          ]),
          A("Tester and QA", "Explain the two quality roles on the increment.", "Guided learning", 25, ["Tester", "QA"], [
              ("h2", "Tester and QA"),
              ("short", "diff", "How is a software tester different from quality assurance on Oakfield?", "Tester: ... QA: ..."),
              ("short", "feedback", "How would customer or tutor feedback change the next sprint?", "Feedback would..."),
              ("t", "SoL Week 12: tester and QA responsibilities."),
          ]),
          A("Progress check: QA is not an end-gate only", "Place QA in the increment, not only at the end.", "Progress check", 8, ["QA"], [
              ("h2", "Throughout"),
              ("short", "place", "Name one QA activity that belongs before coding finishes.", "Activity: ..."),
          ])),
        L("Lesson 3: Sprint, epic, story, spike", "Write one epic, one user story and one spike for an uncertainty.",
          A("Retrieval: story versus epic", "Retrieve the difference between an epic and a story.", "Retrieval", 8, ["Agile artefacts"], [
              ("h2", "Size of work"),
              ("single", "q1", "A spike is:",
               [("a", "A punishment for slow developers"), ("b", "Time-boxed investigation to reduce an unknown before committing scope"), ("c", "The same as a user story"), ("d", "A type of database")],
               "b", "Agile artefacts manage changing requirements; they do not replace analysis.", "Know epic vs story vs spike."),
          ]),
          A("Write the artefacts", "Independent application: epic, story and spike for Oakfield.", "Independent application", 30, ["Epics", "Stories", "Spikes"], [
              ("h2", "One increment's artefacts"),
              ("short", "artefacts", "Write one epic, one user story and one spike (question + time box) for an Oakfield uncertainty.", "Epic: ... Story: ... Spike: ..."),
              ("short", "assign", "Assign the full role set to this increment in one short table of names/roles.", "Roles: ..."),
              ("t", "SoL Week 12 independent: epic, story, spike; full role set; customer feedback to next sprint."),
          ]),
          A("Progress check: spike purpose", "Explain the purpose of a spike.", "Progress check", 8, ["Spikes"], [
              ("h2", "Why spike"),
              ("short", "why", "Why would Oakfield spike 'offline register' before promising it?", "Because..."),
          ])),
      ],
      H("Homework: sprint review or stand-up", "Find one public description of a sprint review or stand-up and note what artefact was being discussed.", "sprint", 15, ["Agile artefacts"], [
          ("h2", "Independent study"),
          ("short", "find", "What event was described, and which artefact (epic, story, spike, board) was in play?", "Event: ... Artefact: ..."),
      ])),
    w(13, "Agile Delivery, Scaled Agile and Waterfall", "2026-12-07", "methodologies",
      "LO1 / 1.3 — explain Agile incremental delivery; outline Scaled Agile; explain Waterfall structure, documentation, costs and client interaction",
      ["lo1"],
      [("w13-agile", "Explain Agile incremental delivery, changing requirements and client feedback"), ("w13-scaled", "Outline Scaled Agile and product increments"), ("w13-waterfall", "Explain Waterfall structure, documentation, costs and client interaction")],
      [
        L("Lesson 1: Agile incremental delivery", "Map changing requirements and client feedback onto an incremental plan.",
          A("Retrieval: how Oakfield already changed", "Retrieve how the project has already changed after research and user analysis.", "Retrieval", 8, ["Agile"], [
              ("h2", "Would a fixed long plan have survived?"),
              ("short", "change", "Name two ways the Oakfield project has already changed since Week 1.", "1. ... 2. ..."),
              ("single", "q1", "A characteristic of Agile that is not 'no documentation' is:",
               [("a", "Never write anything down"), ("b", "Deliver in increments and use client feedback to change the next slice"), ("c", "Skip testing"), ("d", "Ignore regulation")],
               "b", "Methodology choice is justified by context. Excluding users from increments can produce services that do not work in real life.", "Agile is not an excuse for no evidence."),
          ]),
          A("Increments and feedback", "Map Oakfield onto an incremental plan.", "Guided learning", 30, ["Agile", "Feedback"], [
              ("h2", "Change is expected"),
              ("short", "incr", "Describe three increments for Oakfield and what feedback you would seek after increment 1.", "Inc1: ... Inc2: ... Inc3: ... Feedback: ..."),
              ("short", "change-req", "Give one requirement that might change after a tutor trial, and how Agile would absorb it.", "Change: ... Absorb: ..."),
              ("t", "SoL Week 13: tutor compares Agile using the same client scenario. Increment board."),
          ]),
          A("Progress check: not 'no documentation'", "Name a characteristic of Agile that is not 'no documentation'.", "Progress check", 8, ["Agile"], [
              ("h2", "Evidence still exists"),
              ("short", "char", "Name one Agile characteristic besides 'working software', that still produces evidence for Task 1.", "Characteristic: ..."),
          ])),
        L("Lesson 2: Scaled Agile and product increments", "When more than one team must align.",
          A("Retrieval: small-team Agile", "Retrieve small-team Agile before scaling.", "Retrieval", 8, ["Scaled Agile"], [
              ("h2", "One team first"),
              ("short", "small", "Why is Oakfield increment 1 probably a small-team problem, not a Scaled Agile programme?", "Because..."),
          ]),
          A("What Scaled Agile adds", "Outline product increments when several teams share a product.", "Guided learning", 30, ["Scaled Agile"], [
              ("h2", "Alignment across teams"),
              ("p", "intro", "Scaled Agile is not 'Agile but louder'. It is used when multiple teams must deliver a shared product increment to a cadence."),
              ("short", "diff", "Give one difference between Agile and Scaled Agile.", "Difference: ..."),
              ("short", "when", "When might a local-authority digital programme (not just Oakfield's first increment) justify Scaled Agile?", "When..."),
              ("t", "SoL Week 13: Scaled Agile and product increments. Extension: Scaled vs small-team for this client."),
          ]),
          A("Progress check: one difference", "Explain one difference between Agile and Scaled Agile.", "Progress check", 8, ["Scaled Agile"], [
              ("h2", "Difference"),
              ("short", "d", "One difference, in a sentence.", "Scaled Agile..."),
          ])),
        L("Lesson 3: Waterfall and a justified choice", "When Waterfall documentation and staged client interaction might still be justified.",
          A("Retrieval: uncertainty and regulation", "Retrieve Oakfield's uncertainty and regulatory load.", "Retrieval", 8, ["Waterfall"], [
              ("h2", "Context for choice"),
              ("short", "ctx", "Is Oakfield high-uncertainty, high-regulation, or both? Evidence?", "It is ... because ..."),
          ]),
          A("Recommend Agile or Waterfall", "Independent application: justified methodology choice.", "Independent application", 30, ["Waterfall", "Methodology selection"], [
              ("h2", "Justify from context"),
              ("p", "intro", "Waterfall: staged structure, heavier upfront documentation, different cost profile, client interaction often at stage gates. Choose from risk, regulation, client availability and uncertainty — not preference."),
              ("short", "choice", "Recommend Agile or Waterfall for Oakfield increment 1. Justify with risk, regulation, client availability and uncertainty.", "Recommendation: ... Because: ..."),
              ("short", "wf", "When might Waterfall still be justified for a different digital project in the same authority?", "Waterfall if..."),
              ("t", "SoL Week 13 independent: recommend Agile or Waterfall. Decision tree for support."),
          ]),
          A("Progress check: justified by context", "Methodology choice is justified by context.", "Progress check", 8, ["Methodology"], [
              ("h2", "Not a label"),
              ("short", "why", "Write the one-sentence justification you would put in a proposal.", "We recommend ... because ..."),
          ])),
      ],
      H("Homework: a delayed digital project", "Find a public case of a delayed digital project and suggest whether a fixed plan or changing requirements contributed.", "delay", 20, ["Methodology", "Public projects"], [
          ("h2", "Independent study"),
          ("short", "case", "Name the case and whether a fixed plan, changing requirements, or both, look relevant.", "Case: ... Factor: ..."),
      ])),
    w(14, "RAD, Lean and Methodology Selection", "2026-12-14", "methodologies",
      "LO1 / 1.3 — explain RAD and Lean; compare methodologies and select one for a project",
      ["lo1"],
      [("w14-rad", "Explain RAD prototyping, reuse and suitability"), ("w14-lean", "Explain Lean waste reduction, late decisions and short iterations"), ("w14-select", "Compare methodologies and select one for a project")],
      [
        L("Lesson 1: RAD", "Prototyping, reuse and when RAD is suitable.",
          A("Retrieval: Week 13 comparison", "Retrieve the Agile and Waterfall comparison.", "Retrieval", 8, ["RAD"], [
              ("h2", "Retrieve Week 13"),
              ("short", "aw", "In one line each, why Agile and why Waterfall might be chosen.", "Agile: ... Waterfall: ..."),
              ("single", "q1", "RAD is most suitable when:",
               [("a", "Users can try prototypes early and parts can be reused"), ("b", "You want to skip all security"), ("c", "The client can never be contacted"), ("d", "Documentation is banned")],
               "a", "RAD is prototyping and reuse, not 'hack it on Friday'.", "Know when it fits Oakfield."),
          ]),
          A("RAD on Oakfield", "Apply RAD prototyping and reuse to the scenario.", "Guided learning", 30, ["RAD"], [
              ("h2", "Prototype and reuse"),
              ("short", "rad", "What would you prototype first, and what existing 365 component might you reuse?", "Prototype: ... Reuse: ..."),
              ("short", "risk", "What risk appears if RAD is applied poorly?", "Risk: ..."),
              ("t", "SoL Week 14: tutor models RAD. Worked prototype examples."),
          ]),
          A("Progress check: when RAD fits", "Explain when RAD prototyping would be suitable.", "Progress check", 8, ["RAD"], [
              ("h2", "Suitability"),
              ("short", "when", "Would RAD be suitable for Oakfield's booking form? Why?", "Yes/No: ... Because: ..."),
          ])),
        L("Lesson 2: Lean", "Waste reduction, late decisions and short iterations.",
          A("Retrieval: what counts as waste", "Retrieve an Oakfield waste example.", "Retrieval", 8, ["Lean"], [
              ("h2", "Waste"),
              ("short", "waste", "Name one waste in Oakfield's current process (for example retyping registers).", "Waste: ..."),
              ("single", "q1", "Lean is not:",
               [("a", "Reducing wasted rework"), ("b", "Do less testing"), ("c", "Delaying decisions until you have evidence"), ("d", "Short iterations")],
               "b", "Lean is not an excuse to skip testing. Wasted rework can delay access to public services.", "Keep quality; cut waste."),
          ]),
          A("Lean moves on Oakfield", "Apply waste reduction, late decisions, short iterations.", "Guided learning", 30, ["Lean"], [
              ("h2", "Cut waste, keep learning"),
              ("short", "apply", "Give one waste to cut, one decision to take late, and one short iteration for Oakfield.", "Waste: ... Late: ... Iteration: ..."),
              ("t", "SoL Week 14: Lean waste reduction, late decisions, short iterations."),
          ]),
          A("Progress check: not less testing", "Lean is not treated as 'do less testing'.", "Progress check", 8, ["Lean"], [
              ("h2", "Quality stays"),
              ("short", "q", "Which testing would you keep even in a Lean Oakfield increment, and why?", "Keep: ... Why: ..."),
          ])),
        L("Lesson 3: Compare and select", "Compare Agile, Scaled Agile, Waterfall, RAD and Lean; write a client-readable justification.",
          A("Retrieval: five names", "Retrieve the five methodology names.", "Retrieval", 8, ["Methodology"], [
              ("h2", "The set"),
              ("short", "five", "List Agile, Scaled Agile, Waterfall, RAD and Lean in any order with a three-word reminder each.", "1. ..."),
          ]),
          A("Select for the continuing project", "Independent application: comparison then a short justification a client could read.", "Independent application", 30, ["Methodology selection"], [
              ("h2", "A justified proposal decision"),
              ("p", "intro", "Methodology selection is a justified proposal decision, not a label."),
              ("short", "grid", "Complete a comparison grid for Oakfield (one strength and one risk per methodology).", "Agile: ... SAFe-style: ... Waterfall: ... RAD: ... Lean: ..."),
              ("short", "select", "Select one methodology for the continuing project. Write a short justification a client could read.", "We recommend ... because ..."),
              ("t", "SoL Week 14 independent: select one methodology. Extension: risk if applied poorly."),
          ]),
          A("Progress check: more than preference", "Justify a methodology with more than a preference.", "Progress check", 8, ["Methodology"], [
              ("h2", "Evidence"),
              ("short", "j", "Quote the context factor (risk, regulation, availability, uncertainty) that decided it.", "Factor: ..."),
          ])),
      ],
      H("Homework: waste in a familiar process", "Identify one waste in a familiar process, such as repeated data entry, and suggest a shorter iteration that would reduce it.", "waste", 15, ["Lean"], [
          ("h2", "Independent study"),
          ("short", "w", "Process, waste, and a shorter iteration that would reduce it.", "Process: ... Waste: ... Iteration: ..."),
      ])),
    w(15, "User-Centred Design and Secure by Design", "2027-01-04", "ucd-security",
      "LO1 / 1.4 — explain UCD considerations and characteristics; apply UCD stages; apply secure by design to functional requirements",
      ["lo1"],
      [("w15-ucd-char", "Explain user-centred design considerations and characteristics"), ("w15-ucd-stages", "Apply UCD stages of context, requirements, design and assessment"), ("w15-secure", "Apply secure by design to functional requirements")],
      [
        L("Lesson 1: UCD characteristics", "Retrieve methodology and mark which requirements protect users or data.",
          A("Retrieval: protection in the list", "Mark which current requirements protect users or data.", "Retrieval", 8, ["UCD", "Security"], [
              ("h2", "Who is protected"),
              ("short", "mark", "From your requirements list, which items protect users or data?", "Items: ..."),
              ("single", "q1", "User-centred design means:",
               [("a", "The designer's favourite colours"), ("b", "Designing with real user context, needs, and assessment — not only the sponsor's request"), ("c", "Skipping security"), ("d", "Only using paper")],
               "b", "Insecure or inaccessible services can harm people who have least power to choose an alternative.", "Assessment is part of UCD."),
          ]),
          A("UCD considerations", "Characteristics of UCD on Oakfield.", "Guided learning", 30, ["UCD"], [
              ("h2", "Users in the centre"),
              ("short", "char", "List UCD characteristics and map each to Oakfield (low digital confidence, screen readers, EAL).", "Characteristics: ... Oakfield: ..."),
              ("short", "harm", "What user harm appears if a UCD stage is skipped?", "Harm: ..."),
              ("t", "SoL Week 15: UCD cycle diagram. Stage card-sort for support. Extension: missing stage to user harm."),
          ]),
          A("Progress check: stages in order", "Name the UCD stages in order.", "Progress check", 8, ["UCD"], [
              ("h2", "Order"),
              ("short", "order", "Write the UCD stages in order.", "Context, ..."),
          ])),
        L("Lesson 2: UCD stages on Oakfield", "Apply context, requirements, design and assessment.",
          A("Retrieval: the four stages", "Retrieve the UCD stage names.", "Retrieval", 8, ["UCD stages"], [
              ("h2", "Stages"),
              ("short", "four", "Context, requirements, design, assessment — one Oakfield example each in a phrase.", "Context: ..."),
          ]),
          A("Apply the cycle", "Walk Oakfield through the four stages.", "Guided learning", 30, ["UCD stages"], [
              ("h2", "Assessment is not optional"),
              ("short", "apply", "For the booking form, write one activity in each UCD stage.", "Context: ... Requirements: ... Design: ... Assessment: ..."),
              ("t", "SoL Week 15: apply UCD stages. Assessment is part of UCD, not an extra."),
          ]),
          A("Progress check: assessment belongs", "Questioning checks that assessment is part of UCD.", "Progress check", 8, ["UCD"], [
              ("h2", "Close the cycle"),
              ("short", "assess", "How would you assess the booking form with real learners?", "We would..."),
          ])),
        L("Lesson 3: Secure by design in functional requirements", "Write or improve one FR and one acceptance check so security is designed in.",
          A("Retrieval: security is not only later coding", "Retrieve secure by design as a requirements issue.", "Retrieval", 8, ["Secure by design"], [
              ("h2", "Requirements, not a patch"),
              ("single", "q1", "Secure by design means:",
               [("a", "Adding a padlock icon"), ("b", "Building security into requirements and design, not bolting it on after an incident"), ("c", "Never collecting any data"), ("d", "Only using biometrics")],
               "b", "Teams plan security and user assessment before go-live, not after an incident.", "Improve a functional requirement."),
          ]),
          A("Improve a functional requirement", "Independent application: security designed in.", "Independent application", 25, ["Secure by design", "Requirements"], [
              ("h2", "Rewrite with security in"),
              ("short", "fr", "Improve one functional requirement so authentication, authorisation or personal-data handling is explicit.", "Improved FR: ..."),
              ("short", "ac", "Write a related acceptance check.", "AC: ..."),
              ("t", "SoL Week 15 independent: improve FR and acceptance so security is designed in. Security checklists and accessibility prompts."),
          ]),
          A("Progress check: requirements issue", "Explain secure by design as a requirements issue, not just later coding.", "Progress check", 8, ["Secure by design"], [
              ("h2", "Why not later"),
              ("short", "why", "Why is 'TODO: GDPR later' unacceptable on Oakfield's register?", "Because..."),
          ])),
      ],
      H("Homework: public login or form", "Review one public login or form against UCD and note one security or accessibility gap.", "login-review", 20, ["UCD", "Accessibility", "Security"], [
          ("h2", "Independent study"),
          ("short", "review", "Service, UCD stage that looks weakest, and one security or accessibility gap.", "Service: ... Weak stage: ... Gap: ..."),
      ])),
    w(16, "Non-functional Requirements, KPIs, Acceptance and Spike Testing", "2027-01-11", "requirements-quality",
      "LO1 / 1.5 — define NFR for security, accessibility and scalability; define KPIs and acceptance; plan spike testing",
      ["lo1"],
      [("w16-nfr", "Define non-functional requirements for security, accessibility and scalability"), ("w16-kpi-ac", "Define KPIs and acceptance criteria"), ("w16-spike", "Plan spike testing to establish requirements and scope")],
      [
        L("Lesson 1: Security, accessibility, scalability NFR", "Retrieve missing quality requirements and write NFR with matching acceptance.",
          A("Retrieval: missing qualities", "Mark which non-functional qualities are still missing.", "Retrieval", 8, ["NFR"], [
              ("h2", "Gaps in the list"),
              ("short", "missing", "Which of security, accessibility and scalability are still weak in your Week 4 list?", "Still weak: ..."),
          ]),
          A("Write the three NFR", "Security, accessibility and scalability with matching acceptance.", "Guided learning", 30, ["Security", "Accessibility", "Scalability"], [
              ("h2", "Qualities you can check"),
              ("p", "intro", "Poor measures can hide exclusion. A service can look successful while some users cannot complete it. This sits in the mock-assessment period: templates are allowed."),
              ("short", "nfr", "Write one NFR each for security, accessibility and scalability, with an acceptance check.", "Security: ... Accessibility: ... Scalability: ..."),
              ("t", "SoL Week 16: tutor models NFR then KPIs and a time-boxed spike. Given/when/then frames."),
          ]),
          A("Progress check: one accessibility or scalability NFR", "Identify one accessibility or scalability requirement.", "Progress check", 8, ["NFR"], [
              ("h2", "Name one"),
              ("short", "one", "Write one accessibility or scalability NFR for Oakfield.", "NFR: ..."),
          ])),
        L("Lesson 2: KPIs versus acceptance criteria", "KPIs for responsiveness, load handling and reliability.",
          A("Retrieval: KPI is not AC", "Retrieve the difference.", "Retrieval", 8, ["KPIs"], [
              ("h2", "Two kinds of check"),
              ("single", "q1", "The difference between a KPI and an acceptance criterion is:",
               [("a", "There is no difference"), ("b", "A KPI tracks ongoing performance; an acceptance criterion checks whether a specific requirement is met"), ("c", "KPIs replace user testing"), ("d", "Acceptance is only for Waterfall")],
               "b", "Acceptance, KPIs and spikes are the basis of later testing, client sign-off and Task 1 proposals.", "Link a KPI to a business risk if missed."),
          ]),
          A("Write KPIs", "Responsiveness, load, reliability.", "Guided learning", 25, ["KPIs", "Acceptance"], [
              ("h2", "Measures that can hide exclusion"),
              ("short", "kpi", "Write one KPI each for responsiveness, load handling and reliability for Oakfield. Note a risk if the measure is missed.", "Resp: ... Load: ... Rel: ... Missed: ..."),
              ("t", "SoL Week 16: KPIs plus acceptance. Extension: KPI to business risk."),
          ]),
          A("Progress check: KPI versus AC", "Explain the difference.", "Progress check", 8, ["KPIs"], [
              ("h2", "Difference"),
              ("short", "diff", "Give one Oakfield KPI and one related acceptance criterion, and say how they differ.", "KPI: ... AC: ... Differ: ..."),
          ])),
        L("Lesson 3: Plan a spike", "Time-boxed investigation to reduce a technical unknown.",
          A("Retrieval: an unknown", "Retrieve a technical unknown still in the project.", "Retrieval", 8, ["Spikes"], [
              ("h2", "Unknowns"),
              ("short", "u", "What technical unknown would stop you committing scope?", "Unknown: ..."),
          ]),
          A("Spike card", "Independent application: question and time box.", "Independent application", 25, ["Spike testing"], [
              ("h2", "Question and time box"),
              ("short", "spike", "Plan a spike: question, time box, who, what 'done' looks like, and how it changes scope.", "Question: ... Time box: ... Done: ... Scope change: ..."),
              ("t", "SoL Week 16 independent: spike to establish requirements and scope. Spike card."),
          ]),
          A("Progress check: question and time box", "A spike has a question and a time box.", "Progress check", 8, ["Spikes"], [
              ("h2", "Both required"),
              ("short", "both", "Write the spike question and the time box only.", "Question: ... Time box: ..."),
          ])),
      ],
      H("Homework: rewrite vague quality statements", "Rewrite two vague quality statements, such as fast or user-friendly, so they can be checked.", "quality", 15, ["NFR", "Wording"], [
          ("h2", "Independent study"),
          ("short", "two", "Rewrite 'fast' and 'user-friendly' so Oakfield could check them.", "Fast becomes: ... User-friendly becomes: ..."),
      ])),
    w(17, "Emerging Technologies in Depth", "2027-01-18", "emerging-tech",
      "LO1 / 1.6 — outline IoT, AI, generative AI, ML, computer vision, biometrics, robotics, cloud, data, drones, 3D printing and connectivity",
      ["lo1"],
      [("w17-ai-iot", "Outline IoT, AI, generative AI and machine learning"), ("w17-vision-bio", "Outline object recognition, computer vision, biometrics and robotics"), ("w17-cloud-connect", "Outline cloud, data, drone, 3D printing and connectivity technologies")],
      [
        L("Lesson 1: IoT, AI, generative AI, ML", "Structured technology profiles; AI is not a single technology.",
          A("Retrieval: Week 2 shortlist", "Retrieve Week 2 notes and which technologies still need a deeper look.", "Retrieval", 8, ["Emerging technology"], [
              ("h2", "Back to Week 2"),
              ("short", "list", "Which Week 2 candidates still need an evidence-based look for Oakfield?", "Still need: ..."),
              ("single", "q1", "Treating 'AI' as one technology is weak because:",
               [("a", "AI does not exist"), ("b", "Generative AI, machine learning and simpler automation solve different problems with different data and risks"), ("c", "Vendors forbid distinctions"), ("d", "IoT is the only real topic")],
               "b", "Task 1 needs emerging-technology knowledge without fashionable tools that do not fit the problem.", "Avoid treating AI as a single technology."),
          ]),
          A("Profile template", "What it is, problem, data, risks, now/later/reject.", "Guided learning", 35, ["IoT", "AI", "ML"], [
              ("h2", "Profile, do not hype"),
              ("c", "template", "Technology profile", "What it is; problem it might solve for Oakfield; data it needs; risks (including surveillance, environment, exclusion); now / later / reject with a requirement-and-risk link."),
              ("short", "ai", "Complete a profile for one AI-related technology (not 'AI' as a blob).", "What: ... Problem: ... Data: ... Risks: ... Decision: ..."),
              ("short", "iot", "Complete a short profile for one IoT or connectivity idea (for example classroom sensors).", "What: ... Decision: ..."),
              ("t", "SoL Week 17: structured technology profile. At least one AI-related and one connectivity or data technology. Shared glossary."),
          ]),
          A("Progress check: not one AI", "Learners avoid treating AI as a single technology.", "Progress check", 8, ["AI"], [
              ("h2", "Be specific"),
              ("short", "specific", "Name two different AI-related technologies and one different risk for each.", "1. ... Risk: ... 2. ... Risk: ..."),
          ])),
        L("Lesson 2: Vision, biometrics, robotics", "Object recognition, computer vision, biometrics, robotics — data, risk, user impact.",
          A("Retrieval: special category data", "Retrieve why biometrics need extra care.", "Retrieval", 8, ["Biometrics"], [
              ("h2", "Data and harm"),
              ("short", "bio", "Why might biometric attendance be a poor Now item for Oakfield?", "Because..."),
          ]),
          A("Profiles with user impact", "Complete profiles including at least one of this set.", "Guided learning", 30, ["Computer vision", "Biometrics", "Robotics"], [
              ("h2", "Not just benefits"),
              ("short", "profile", "Profile object recognition, biometrics or robotics for Oakfield. Include data, risk and user impact — not only benefits.", "Technology: ... Data: ... Risk: ... Users: ... Decision: ..."),
              ("t", "SoL Week 17: profiles checked for data, risk and user impact. Surveillance, environmental cost and digital exclusion count."),
          ]),
          A("Progress check: reject or later", "Justify a reject or later decision.", "Progress check", 8, ["Technology choice"], [
              ("h2", "Say no when it does not fit"),
              ("short", "no", "Reject or delay one fashionable option. Link to a requirement and a risk.", "Reject/later: ... Because: ..."),
          ])),
        L("Lesson 3: Cloud, data, drones, 3D, 5G — scoped recommendations", "Recommend now, later or reject for each profiled technology.",
          A("Retrieval: requirements and risk", "Retrieve the requirements you will judge against.", "Retrieval", 8, ["Scope"], [
              ("h2", "Judge against the problem"),
              ("short", "req", "Which Oakfield requirements will you use to accept or reject a technology?", "Requirements: ..."),
          ]),
          A("Scoped recommendations", "Independent application: now / later / reject table.", "Independent application", 30, ["Cloud", "Data", "Connectivity"], [
              ("h2", "Recommendations a proposal can defend"),
              ("short", "table", "For cloud, a data store idea, and 5G/broadband, recommend now, later or reject with a short justification.", "Cloud: ... Data: ... Connectivity: ..."),
              ("short", "drone3d", "Are drones or 3D printing in scope for Oakfield increment 1? Why?", "Decision: ..."),
              ("t", "SoL Week 17 independent: scoped recommendations. Extension: compare two technologies against the same requirement."),
          ]),
          A("Progress check: evidence not novelty", "Profiles checked for more than benefits.", "Progress check", 8, ["Evaluation"], [
              ("h2", "Fit the problem"),
              ("short", "fit", "Which profiled technology is most likely Now for Oakfield, and which is Reject? Why?", "Now: ... Reject: ..."),
          ])),
      ],
      H("Homework: sources on one profile", "Add sources to one technology profile and note how recent and independent those sources are.", "sources", 20, ["Sources", "Emerging technology"], [
          ("h2", "Independent study"),
          ("short", "src", "Technology, two sources, recency, and whether they are independent of a vendor.", "Tech: ... Sources: ... Recent? Independent?"),
      ])),
    w(18, "Training Needs, Legal and Ethical Requirements, Sources and Evaluation", "2027-01-25", "legal-sources",
      "LO1 / 1.6, LO2 / 2.1–2.2 and LO3 / 3.1–3.2 — training plan; legal, regulatory, ethical and risk requirements; reliable sources and evaluation techniques",
      ["lo1", "lo2", "lo3"],
      [("w18-training", "Identify knowledge, skill and ability gaps and create a training plan"), ("w18-legal-ethics", "Investigate legal, regulatory, ethical and risk-management requirements"), ("w18-sources-eval", "Use reliable sources and qualitative and quantitative evaluation techniques")],
      [
        L("Lesson 1: Personal training plan", "Identify knowledge, skill and ability gaps.",
          A("Retrieval: gaps already visible", "Retrieve decisions made and personal gaps.", "Retrieval", 8, ["Training"], [
              ("h2", "What you still cannot defend"),
              ("short", "gaps", "List one knowledge, one skill and one information gap from the Oakfield project.", "Knowledge: ... Skill: ... Information: ..."),
              ("single", "q1", "A training method besides watching a video is:",
               [("a", "There is no other method"), ("b", "Guided practice, shadowing, reading official guidance, or a time-boxed spike"), ("c", "Guessing in the exam"), ("d", "Copying a classmate's file")],
               "b", "Task 1 rewards reliable evidence. Teams do not justify a design with a single uncredited opinion.", "Plan more than video watching."),
          ]),
          A("Write the plan", "Personal training plan for the live task window.", "Guided learning", 30, ["Training plan"], [
              ("h2", "Methods that close gaps"),
              ("short", "plan", "Create a training plan: gap, method, source or person, and a check that it worked.", "Gap: ... Method: ... Check: ..."),
              ("t", "SoL Week 18: training-plan template. One method beyond watching a video."),
          ]),
          A("Progress check: beyond video", "Identify one training method beyond watching a video.", "Progress check", 8, ["Training"], [
              ("h2", "Another method"),
              ("short", "m", "Name one method you will actually use this week.", "Method: ..."),
          ])),
        L("Lesson 2: Legal, regulatory, ethical, risk", "Investigate one requirement that applies to the client.",
          A("Retrieval: duties already named", "Retrieve legal or ethical issues already listed.", "Retrieval", 8, ["Legal", "Ethics"], [
              ("h2", "Duties"),
              ("short", "duty", "Name one legal and one ethical issue already in the Oakfield file.", "Legal: ... Ethical: ..."),
          ]),
          A("Investigate one requirement", "Short legal and risk review using named sources.", "Guided learning", 35, ["UK GDPR", "Ethics", "Risk"], [
              ("h2", "Investigate, then cite"),
              ("p", "intro", "Distinguish law, regulation, ethics and software standards. You are not giving legal advice; you are showing you can find and apply a reliable source."),
              ("short", "inv", "Investigate one legal, regulatory or ethical requirement for Oakfield. What it requires, who is affected, source.", "Requirement: ... Requires: ... Affected: ... Source: ..."),
              ("short", "risk", "Add one risk-management action (owner and monitoring, not just a name).", "Risk: ... Owner: ... Monitor: ..."),
              ("t", "SoL Week 18: law and ethics grid. Structured investigation sheet. Whose voices are missing from sources."),
          ]),
          A("Progress check: source on the recommendation", "Recommendations are checked for a source, not just an opinion.", "Progress check", 8, ["Sources"], [
              ("h2", "Cite it"),
              ("short", "cite", "Cite the source you would put under one Oakfield recommendation.", "Recommendation: ... Source: ..."),
          ])),
        L("Lesson 3: Sources and qualitative / quantitative evaluation", "Rate sources; choose one qualitative and one quantitative method.",
          A("Retrieval: sources already used", "Retrieve sources already used on the project.", "Retrieval", 8, ["Sources"], [
              ("h2", "What have you already cited?"),
              ("short", "used", "List two sources already in your Oakfield log and a weakness of each.", "1. ... Weakness: ..."),
          ]),
          A("Evaluate and choose methods", "Independent application: source ratings plus evaluation methods.", "Independent application", 30, ["Sources", "Evaluation"], [
              ("h2", "Reliable enough for a proposal"),
              ("c", "criteria", "Source criteria", "Authority, recency, independence from a vendor, relevance to UK public-sector adult learning, and whether users who do not write reviews are missing."),
              ("short", "rate", "Rate a webpage, a forum post and official guidance with the same criteria.", "Webpage: ... Forum: ... Official: ..."),
              ("short", "methods", "Choose one qualitative and one quantitative method to evaluate a design or prototype, and recommend one change with a cited source.", "Qual: ... Quant: ... Change: ... Source: ..."),
              ("t", "SoL Week 18 independent: qualitative and quantitative methods. Extension: missing evidence that would change a recommendation."),
          ]),
          A("Progress check: match method to decision", "Match an evaluation technique to a decision it can support.", "Progress check", 8, ["Evaluation"], [
              ("h2", "Fit the decision"),
              ("short", "match", "Which method would you use to decide if tutors can complete a register in class, and why?", "Method: ... Why: ..."),
          ])),
      ],
      H("Homework: two sources on the same topic", "Evaluate two sources on the same legal or technology topic and write which you would trust more in a proposal, and why.", "two-sources", 20, ["Sources"], [
          ("h2", "Independent study"),
          ("short", "pair", "Topic, source A, source B, which you would trust in a proposal, and why.", "Topic: ... A: ... B: ... Trust: ... Why: ..."),
      ])),
    w(19, "Revision 1 - SDLC and Digital Team Roles", "2027-02-01", "revision",
      "LO1 revision — SDLC research through maintenance; digital-team roles and responsibilities",
      ["lo1"],
      [("w19-sdlc-early", "Revise SDLC research, planning, user analysis and design stages"), ("w19-sdlc-late", "Revise development, testing, deployment and maintenance stages"), ("w19-roles", "Revise digital-team roles and responsibilities")],
      [
        L("Lesson 1: SDLC retrieval and common errors", "Repair common errors in SDLC sequence and role responsibilities.",
          A("Retrieval: full SDLC set", "Retrieve research, planning, user analysis, design, development, testing, deployment, maintenance and roles.", "Retrieval", 12, ["SDLC"], [
              ("h2", "Sequence without gaps"),
              ("short", "seq", "Write the SDLC stages in order. Do not miss testing or maintenance.", "1. ..."),
              ("single", "q1", "If testing is missing from a sequence, the usual repair is:",
               [("a", "Pretend design includes it"), ("b", "Put testing in the lifecycle before relying on a live service, and keep maintenance after"), ("c", "Skip it for public services"), ("d", "Give it only to the product owner")],
               "b", "Revision prepares learners to use Areas 1 and 1.2 in the live Occupational Specialism task.", "Who is harmed if a stage is skipped on a public service?"),
          ]),
          A("Repair common errors", "Applied questions on sequence and roles.", "Guided learning", 30, ["SDLC", "Roles"], [
              ("h2", "Fix the errors"),
              ("short", "error", "A classmate listed 'code, then maybe test'. Rewrite the sequence for Oakfield and name the handover that would fail if skipped.", "Sequence: ... Failed handover: ..."),
              ("t", "SoL Week 19: short applied questions. Retrieval grids and stage cards. Support limited to process and specification interpretation."),
          ]),
          A("Progress check: sequence", "Sequence SDLC stages without missing testing or maintenance.", "Progress check", 8, ["SDLC"], [
              ("h2", "No gaps"),
              ("short", "full", "Paste your full stage list including testing and maintenance.", "Stages: ..."),
          ])),
        L("Lesson 2: Roles recap on the scenario", "Match roles to a project scenario.",
          A("Retrieval: PO versus PM again", "Distinguish product owner from project manager.", "Retrieval", 8, ["Roles"], [
              ("h2", "PO and PM"),
              ("short", "diff", "PO versus PM in one sentence each, using Oakfield.", "PO: ... PM: ..."),
          ]),
          A("Match roles to Oakfield", "Guided role matching.", "Guided learning", 30, ["Roles"], [
              ("h2", "Who owns the increment"),
              ("short", "match", "Match PO, SM, tech lead, PM, analyst, UX, developer, ops, security, tester, QA to one Oakfield activity each.", "Matches: ..."),
              ("t", "SoL Week 19: match roles to a project scenario. Role cards."),
          ]),
          A("Progress check: skipped handover", "One role handover that would fail if skipped.", "Progress check", 8, ["Handovers"], [
              ("h2", "Exit check",),
              ("short", "fail", "Name one handover that would fail if skipped, and who is harmed.", "Handover: ... Harmed: ..."),
          ])),
        L("Lesson 3: One-page recap", "Produce a one-page SDLC and roles recap for the continuing client project.",
          A("Retrieval: weakest earlier evidence", "Identify one weak piece of earlier evidence.", "Retrieval", 8, ["Revision"], [
              ("h2", "What to strengthen"),
              ("short", "weak", "Which earlier Oakfield artefact is weakest (brief, roles, tests)?", "Weak: ..."),
          ]),
          A("One-page recap", "Independent application.", "Independent application", 30, ["SDLC", "Roles"], [
              ("h2", "One page for Oakfield"),
              ("short", "page", "Write a one-page recap: SDLC stages with Oakfield examples, then roles and one critical handover.", "Recap: ..."),
              ("t", "SoL Week 19 independent: one-page SDLC and roles recap. Extension: stronger justifications with better evidence."),
          ]),
          A("Progress check: recap complete", "Confirm testing, maintenance and PO/PM are in the recap.", "Progress check", 8, ["Revision"], [
              ("h2", "Checklist"),
              ("short", "tick", "Tick: testing? maintenance? PO ≠ PM? One handover?", "Ticks: ..."),
          ])),
      ],
      H("Homework: revise one weak artefact", "Revise one weak piece of earlier project evidence, such as a brief annotation or role assignment.", "revise-artefact", 25, ["Revision"], [
          ("h2", "Independent study"),
          ("short", "rev", "What you revised, what was weak, and the improved version.", "Was: ... Now: ..."),
      ])),
    w(20, "Revision 2 - Methodologies, Requirements, Emerging Technology and Training", "2027-02-08", "revision",
      "LO1 revision — compare methodologies; revise UCD, secure-by-design and requirements; revise emerging technologies and training needs",
      ["lo1"],
      [("w20-methods", "Compare Agile, Scaled Agile, Waterfall, RAD and Lean"), ("w20-ucd-req", "Revise UCD, secure-by-design and requirements"), ("w20-tech-train", "Revise emerging technologies and personal training needs")],
      [
        L("Lesson 1: Methodology comparison task", "Justify a methodology with context, not a label.",
          A("Retrieval: methods, requirements, tech, training", "Retrieve methodology, requirements, technology profiles and training plans.", "Retrieval", 10, ["Methodology"], [
              ("h2", "Pull the file forward"),
              ("short", "pull", "State your current methodology choice, one NFR, one technology decision, and one training gap.", "Method: ... NFR: ... Tech: ... Gap: ..."),
          ]),
          A("Comparison under a constraint", "Scenario questions on methodology selection.", "Guided learning", 30, ["Methodology"], [
              ("h2", "Same client, tighter constraint"),
              ("short", "compare", "Compare all five methodologies for Oakfield if the client can only meet you at stage gates. Does your choice change?", "Comparison: ... Choice now: ..."),
              ("t", "SoL Week 20: comparison and scenario questions. Decision tree for support. Extension: two methodologies for the same constraint."),
          ]),
          A("Progress check: context not label", "Justify a methodology with context.", "Progress check", 8, ["Methodology"], [
              ("h2", "Because"),
              ("short", "because", "Write the because-clause only.", "Because..."),
          ])),
        L("Lesson 2: Rewrite a weak requirement and a weak technology recommendation", "UCD, secure-by-design, reject fashionable tech that does not fit.",
          A("Retrieval: secure by design in requirements", "Check that secure by design appears in requirements.", "Retrieval", 8, ["Requirements"], [
              ("h2", "Still in the FR list?"),
              ("short", "sec", "Quote a security-related FR or admit it is missing and write it now.", "FR: ..."),
          ]),
          A("Rewrite two weak items", "Guided repair.", "Guided learning", 30, ["Requirements", "Emerging technology"], [
              ("h2", "Repair for Task 1"),
              ("short", "req", "Rewrite one weak requirement so it is testable and secure-by-design aware.", "Was: ... Now: ..."),
              ("short", "tech", "Rewrite one weak technology recommendation, or reject a fashionable tool that does not fit.", "Was: ... Now: ..."),
              ("t", "SoL Week 20: rewrite weak requirement and weak technology recommendation. Users excluded by insecure, inaccessible or over-complex choices."),
          ]),
          A("Progress check: reject the fashion", "Reject one fashionable technology that does not fit the problem.", "Progress check", 8, ["Emerging technology"], [
              ("h2", "Does not fit"),
              ("short", "reject", "Name it and the requirement it fails.", "Reject: ... Fails: ..."),
          ])),
        L("Lesson 3: Update the training plan", "Update against gaps still showing in revision.",
          A("Retrieval: gaps still showing", "What revision still exposes.", "Retrieval", 8, ["Training"], [
              ("h2", "Still shaky"),
              ("short", "still", "Which topic is still shaky after today's comparison?", "Topic: ..."),
          ]),
          A("Update the plan", "Independent application.", "Independent application", 25, ["Training plan"], [
              ("h2", "Plan against remaining gaps"),
              ("short", "update", "Update your training plan: remaining gaps, methods, and a check before the assessment window.", "Updated plan: ..."),
              ("t", "SoL Week 20 independent: update personal training plan."),
          ]),
          A("Progress check: one remaining gap", "Name the gap you will close next.", "Progress check", 8, ["Training"], [
              ("h2", "Next close"),
              ("short", "next", "Gap and method for this week.", "Gap: ... Method: ..."),
          ])),
      ],
      H("Homework: one recent source on a technology profile", "Add one recent source to an emerging-technology profile.", "recent-source", 15, ["Sources", "Emerging technology"], [
          ("h2", "Independent study"),
          ("short", "add", "Profile, new source, date, and why it is usable.", "Profile: ... Source: ..."),
      ])),
    w(21, "Revision 3 - Legal, Risk, Sources and Evaluation", "2027-02-22", "revision",
      "LO2 and LO3 revision — legal and ethical scenarios; risk, CIA, continuity; reliable sources and evaluation methods",
      ["lo2", "lo3"],
      [("w21-legal", "Revise legal, regulatory and ethical scenario questions"), ("w21-risk-cia", "Revise risk assessment, mitigation, CIA, continuity and recovery"), ("w21-sources", "Revise reliable sources and evaluation methods")],
      [
        L("Lesson 1: Legal and ethical scenarios", "Distinguish law, regulation, ethics and software standards.",
          A("Retrieval: Weeks 6 and 18 notes", "Retrieve legal, ethical, risk and source notes.", "Retrieval", 10, ["Legal", "Ethics"], [
              ("h2", "Pull Weeks 6 and 18"),
              ("short", "pull", "One legal duty, one ethical issue, one risk, one source already used.", "Legal: ... Ethical: ... Risk: ... Source: ..."),
              ("single", "q1", "Law, regulation, ethics and software standards are different because:",
               [("a", "They are four names for the same thing"), ("b", "Law is enforceable rules; regulation can specify how; ethics is about right conduct beyond the minimum; standards guide professional practice"), ("c", "Ethics always override UK law"), ("d", "Standards replace GDPR")],
               "b", "Revision prepares learners to apply Area 2 and Area 3 in the live task.", "Who is most affected when a service is unavailable or data is wrong?"),
          ]),
          A("Scenario questions", "Worked legal and ethical scenarios.", "Guided learning", 30, ["Legal", "Ethics"], [
              ("h2", "Apply, do not quote slogans"),
              ("short", "scen", "A tutor wants to WhatsApp a class list of names and phone numbers. What is the issue, the better action, and a source type you would cite?", "Issue: ... Action: ... Source type: ..."),
              ("t", "SoL Week 21: legal and ethical scenario questions. Structured investigation sheet."),
          ]),
          A("Progress check: four-way distinction", "Distinguish law, regulation, ethics and software standards.", "Progress check", 8, ["Legal"], [
              ("h2", "Four boxes"),
              ("short", "four", "Give one Oakfield example in each box: law, regulation, ethics, standard.", "Law: ... Reg: ... Ethics: ... Standard: ..."),
          ])),
        L("Lesson 2: Risk register, CIA, continuity", "Owners and monitoring, not just a risk name.",
          A("Retrieval: CIA", "Retrieve confidentiality, integrity, availability.", "Retrieval", 8, ["CIA"], [
              ("h2", "CIA"),
              ("short", "cia", "Give one Oakfield example each for confidentiality, integrity and availability.", "C: ... I: ... A: ..."),
          ]),
          A("Register extract and continuity", "Guided risk-register extract.", "Guided learning", 30, ["Risk", "CIA", "Continuity"], [
              ("h2", "Owners and triggers"),
              ("short", "reg", "Write a three-row risk register extract with owner, mitigation, contingency, and a monitoring trigger. Include a CIA incident and a continuity/recovery note.", "Rows: ... Continuity: ..."),
              ("t", "SoL Week 21: CIA incident and risk-register extract. Extension: residual risk and monitoring trigger."),
          ]),
          A("Progress check: owners and monitoring", "Registers are checked for owners and monitoring.", "Progress check", 8, ["Risk"], [
              ("h2", "Not just a name"),
              ("short", "own", "Pick one risk: owner and monitoring trigger.", "Risk: ... Owner: ... Trigger: ..."),
          ])),
        L("Lesson 3: Source grid and evaluation methods", "More than a single blog post; qualitative and quantitative.",
          A("Retrieval: weak sources", "Retrieve why a single blog post is not enough.", "Retrieval", 8, ["Sources"], [
              ("h2", "Not one blog"),
              ("short", "why", "Why is one vendor blog a weak sole source for a Task 1 recommendation?", "Because..."),
          ]),
          A("Source grid", "Independent application.", "Independent application", 25, ["Sources", "Evaluation"], [
              ("h2", "Traffic-light the Oakfield sources"),
              ("short", "grid", "Complete a source grid (at least four sources) with traffic lights. Then name one qualitative and one quantitative method and the decision each would support.", "Grid: ... Qual method → decision: ... Quant method → decision: ..."),
              ("t", "SoL Week 21 independent: source grid. Traffic-light source grid. Questioning checks more than a single blog post."),
          ]),
          A("Progress check: two methods", "Choose qualitative and quantitative and the decision each supports.", "Progress check", 8, ["Evaluation"], [
              ("h2", "Two methods"),
              ("short", "two", "Qual method and decision; quant method and decision.", "Qual: ... Quant: ..."),
          ])),
      ],
      H("Homework: two sources on a legal topic", "Evaluate two sources on the same legal topic and write which you would trust in a proposal, and why.", "legal-sources", 20, ["Sources", "Legal"], [
          ("h2", "Independent study"),
          ("short", "pair", "Legal topic, two sources, which you would trust, and why.", "Topic: ... Trust: ... Why: ..."),
      ])),
    w(22, "Revision 4 - Integrated Case Study, Readiness and Placement", "2027-03-01", "revision",
      "LO1–LO3 revision — timed integrated requirements and risk case study; peer-assess; assessment-readiness checklist",
      ["lo1", "lo2", "lo3"],
      [("w22-case", "Complete a timed integrated requirements and risk case study"), ("w22-peer", "Peer-assess against acceptance criteria"), ("w22-readiness", "Complete a final assessment-readiness checklist")],
      [
        L("Lesson 1: Cumulative retrieval and Task 1 structure", "How Task 1 draws on Areas 1 to 3 together, without providing assessed responses.",
          A("Retrieval: Areas 1 to 3", "Cumulative retrieval covering Areas 1 to 3.", "Retrieval", 15, ["Task 1"], [
              ("h2", "Before the timed extract"),
              ("short", "cumul", "In bullets: one requirements point, one user point, one risk point, one source point you would refuse to omit.", "Req: ... User: ... Risk: ... Source: ..."),
              ("single", "q1", "Task 1 success looks like:",
               [("a", "Writing code for the whole system in the exam"), ("b", "Analysing, justifying and evidencing a proposal using Areas 1 to 3, then stopping and submitting"), ("c", "Copying a vendor brochure"), ("d", "Skipping users because the client is in a hurry")],
               "b", "The week practises the Occupational Specialism proposal process. Who benefits, and who is not included?", "Specimen structure only — not assessed responses."),
          ]),
          A("Task 1 structure review", "Tutor reviews how the areas combine.", "Guided learning", 25, ["Task 1"], [
              ("h2", "Together, not as three essays"),
              ("short", "together", "How will you make requirements, users, risks and sources appear in one extract, not as disconnected lists?", "I will..."),
              ("t", "SoL Week 22: tutor reviews Task 1 structure using a specimen structure without providing assessed responses. Checklists and familiar scenario."),
          ]),
          A("Progress check: all four appear", "Requirements, users, risks and sources all appear.", "Progress check", 8, ["Task 1"], [
              ("h2", "Four threads"),
              ("short", "four", "Write the heading you will use for each thread in your answer.", "1. ... 2. ... 3. ... 4. ..."),
          ])),
        L("Lesson 2: Timed integrated case study", "Requirements and risk together, then peer-assess against acceptance criteria.",
          A("Retrieval: acceptance for the practice", "Retrieve the peer-assessment checklist.", "Retrieval", 8, ["Peer assessment"], [
              ("h2", "Checklist, not praise"),
              ("short", "list", "List four checks you will use when peer-assessing (not 'it was good').", "1. ..."),
          ]),
          A("Timed case study", "Guided timed practice on Oakfield or a close variant.", "Guided learning", 40, ["Case study"], [
              ("h2", "Timed extract"),
              ("p", "intro", "Work to the centre's timed conditions. Support is limited to process, structure and specification interpretation. Do not invent Pearson mark schemes."),
              ("short", "extract", "Paste or summarise your timed response covering requirements, users, risks and sources. Note the time you used.", "Response: ... Time: ..."),
              ("t", "SoL Week 22: timed integrated requirements and risk case study, then peer-assess against acceptance criteria."),
          ]),
          A("Progress check: peer assessment uses the checklist", "Peer assessment uses the checklist, not general praise.", "Progress check", 10, ["Peer assessment"], [
              ("h2", "Against criteria"),
              ("short", "peer", "Using the checklist, give one strength and one missing evidence point in a peer (or your own) response.", "Strength: ... Missing: ..."),
          ])),
        L("Lesson 3: Readiness checklist and placement", "Final assessment-readiness checklist and one remaining personal training need.",
          A("Retrieval: remaining need", "Identify one remaining personal training need.", "Retrieval", 8, ["Readiness"], [
              ("h2", "One remaining need"),
              ("short", "need", "What will you practise before the assessment window?", "I will..."),
          ]),
          A("Readiness checklist", "Independent application: organise evidence according to centre rules.", "Independent application", 25, ["Readiness", "Placement"], [
              ("h2", "Stop, organise, submit"),
              ("p", "intro", "After week 22, learners go on industry placement. Organise the research log, requirements list, models and source list so they can be reused under assessment conditions according to centre rules."),
              ("short", "check", "Complete a readiness checklist: artefacts you have, artefacts still missing, remaining training need, and a placement goal linked to Areas 1 to 3.", "Have: ... Missing: ... Training: ... Placement goal: ..."),
              ("t", "SoL Week 22 independent: final assessment-readiness checklist. Extension: strengthen weaker justifications with better evidence."),
          ]),
          A("Progress check: remaining training need", "Identify one remaining personal training need before the assessment window.", "Progress check", 8, ["Training"], [
              ("h2", "Before the window"),
              ("short", "one", "One remaining training need.", "Need: ..."),
          ])),
      ],
      H("Homework: organise the evidence pack", "Organise your research log, requirements list, models and source list so they can be reused under assessment conditions according to centre rules.", "evidence-pack", 30, ["Task 1", "Organisation"], [
          ("h2", "Independent study"),
          ("short", "pack", "List the artefacts in your pack and one that still needs a cited source.", "Pack: ... Still needs a source: ..."),
      ])),
]


ALL_WEEKS = WEEKS + WEEKS_REST

LO_CORE = [
    ("foundations-lo", "Prepare for occupational software development tasks"),
    ("lo1", "LO1: Analyse a problem to define requirements and acceptance criteria aligned to user needs (1.1 to 1.6)"),
    ("lo2", "LO2: Apply ethical principles and manage risks in line with legal and regulatory requirements (2.1 to 2.2)"),
    ("lo3", "LO3: Discover, evaluate and apply reliable sources of knowledge (3.1 to 3.2)"),
]


def foundations_from_existing():
    existing = json.loads((CONTENT / "activities.json").read_text(encoding="utf-8"))
    kept = [item for item in existing if str(item.get("id", "")).startswith("foundations-")]
    if len(kept) != 5:
        raise SystemExit(f"expected 5 foundations activities, found {len(kept)}")
    return kept


def week_html(n: int, title: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Week {n} overview for T Level Digital Software Development: {title}.">
  <meta name="theme-color" content="#0d2a42">
  <link rel="icon" href="data:,">
  <title>Week {n}: {title} | T Level Digital Software Development Hub</title>
  <script src="../js/core/theme-bootstrap.js?v=2"></script>
</head>
<body data-page="week-{n}" data-section="week-{n}" data-root="..">
  <noscript><p>JavaScript is required for the T Level Digital Software Development Hub.</p></noscript>
  <div id="root"></div>
  <script type="module" src="../src/main.tsx"></script>
</body>
</html>
"""


def build_activity(week_n: int, lo_ids: list[str], ident: str, spec: dict):
    return activity(
        ident,
        spec["title"],
        spec["summary"],
        spec["type"],
        spec["topics"],
        lo_ids,
        spec["minutes"],
        expand_blocks(ident, spec["blocks"]),
        spec.get("difficulty", "standard"),
    )


def build_content():
    if [spec["n"] for spec in ALL_WEEKS] != list(range(1, 23)):
        raise SystemExit(f"expected weeks 1-22, got {[spec['n'] for spec in ALL_WEEKS]}")

    weekly_outcomes = [rec("learning-outcome", oid, {"title": title}) for spec in ALL_WEEKS for oid, title in spec["outcomes"]]
    learning_outcomes = [rec("learning-outcome", oid, {"title": title}) for oid, title in LO_CORE] + weekly_outcomes
    week_ids = [f"week-{spec['n']}" for spec in ALL_WEEKS]
    outcome_ids = [item["id"] for item in learning_outcomes]

    weeks = [week_meta(spec) for spec in ALL_WEEKS]
    sessions = []
    activities = foundations_from_existing()

    for spec in ALL_WEEKS:
        n = spec["n"]
        lo_ids = spec["lo_ids"] + [oid for oid, _ in spec["outcomes"]]
        for index, lesson in enumerate(spec["lessons"], start=1):
            session_id = f"week-{n}-lesson-{index}"
            retrieval_id = f"{session_id}-retrieval"
            main_id = f"{session_id}-main"
            formative_id = f"{session_id}-formative"
            sessions.append(
                rec(
                    "session",
                    session_id,
                    {
                        "title": lesson["title"],
                        "kind": "session",
                        "summary": lesson["summary"],
                        "sortOrder": index,
                        "defaultOpen": index == 1,
                        "status": session_release_status(n, index),
                    },
                    {"week": f"week-{n}", "activities": [retrieval_id, main_id, formative_id]},
                )
            )
            activities.append(build_activity(n, lo_ids, retrieval_id, lesson["retrieval"]))
            activities.append(build_activity(n, lo_ids, main_id, lesson["main"]))
            activities.append(build_activity(n, lo_ids, formative_id, lesson["formative"]))
        hw = spec["homework"]
        hw_session = f"week-{n}-homework"
        hw_activity = f"{hw_session}-{hw['id_suffix']}"
        sessions.append(
            rec(
                "session",
                hw_session,
                {
                    "title": hw["title"],
                    "kind": "homework",
                    "summary": hw["summary"],
                    "sortOrder": 4,
                    "defaultOpen": False,
                    "status": session_release_status(n, homework=True),
                },
                {"week": f"week-{n}", "activities": [hw_activity]},
            )
        )
        activities.append(
            activity(
                hw_activity,
                hw["title"],
                hw["summary"],
                "Independent study",
                hw["topics"],
                lo_ids,
                hw["minutes"],
                expand_blocks(hw_activity, hw["blocks"]),
            )
        )

    hub = rec(
        "hub",
        "tlevel-software-development",
        {
            "name": "T Level Digital Software Development Hub",
            "description": "T Level Digital Software Development learner hub.",
        },
        {"curriculum": "tlevel-software-development-curriculum"},
    )
    hub["version"] = "0.1.0"
    curriculum = rec(
        "curriculum",
        "tlevel-software-development-curriculum",
        {"title": "T Level Digital Software Development", "course": "t-level-digital-software-development"},
        {
            "learningOutcomes": outcome_ids,
            "assignments": ["foundations-practice", "os-formative"],
            "weeks": week_ids,
        },
    )
    assignments = [
        rec("assignment", "foundations-practice", {"title": "Formative Foundations practice", "status": "available"}),
        rec(
            "assignment",
            "os-formative",
            {"title": "Formative Occupational Specialism Areas 1 to 3 practice", "status": "available"},
            {"learningOutcomes": ["lo1", "lo2", "lo3"], "weeks": week_ids},
        ),
    ]
    package_index = rec(
        "package",
        "tlevel-software-development-content",
        {"title": "T Level Digital Software Development"},
        {
            "hub": "hub.json",
            "curriculum": "curriculum.json",
            "learningOutcomes": "learning-outcomes.json",
            "assignments": "assignments.json",
            "weeks": "weeks.json",
            "sessions": "sessions.json",
            "activities": "activities.json",
            "questions": [],
            "assets": [],
        },
    )
    package_index["version"] = PACKAGE_VERSION
    # Keep full catalogue blocks in the bundled package so week pages can render
    # InteractiveActivity inline (L2E pattern). Do not slim week activities to metadata.
    package = {
        "schema": "lp.content.package",
        "schemaVersion": SCHEMA,
        "id": "tlevel-software-development-content",
        "version": PACKAGE_VERSION,
        "hub": hub,
        "curriculum": curriculum,
        "learningOutcomes": learning_outcomes,
        "assignments": assignments,
        "weeks": weeks,
        "sessions": sessions,
        "activities": activities,
    }
    return {
        "hub": hub,
        "curriculum": curriculum,
        "learningOutcomes": learning_outcomes,
        "assignments": assignments,
        "weeks": weeks,
        "sessions": sessions,
        "activities": activities,
        "index": package_index,
        "package": package,
    }


def write_week_routes(weeks):
    for spec in weeks:
        folder = ROOT / f"week-{spec['n']}"
        folder.mkdir(exist_ok=True)
        (folder / "index.html").write_text(week_html(spec["n"], spec["title"]), encoding="utf-8")


def main():
    built = build_content()
    dump(CONTENT / "hub.json", built["hub"])
    dump(CONTENT / "curriculum.json", built["curriculum"])
    dump(CONTENT / "learning-outcomes.json", built["learningOutcomes"])
    dump(CONTENT / "assignments.json", built["assignments"])
    dump(CONTENT / "weeks.json", built["weeks"])
    dump(CONTENT / "sessions.json", built["sessions"])
    dump(CONTENT / "activities.json", built["activities"])
    dump(CONTENT / "index.json", built["index"])
    dump(CONTENT / "package.json", built["package"])
    write_week_routes(ALL_WEEKS)
    print(
        f"Wrote {len(built['weeks'])} weeks, {len(built['sessions'])} sessions, "
        f"{len(built['activities'])} activities (package {PACKAGE_VERSION})."
    )


if __name__ == "__main__":
    main()


