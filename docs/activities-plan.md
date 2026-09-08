# T Level week activities — L2E-style inline practice

This hub teaches **T Level Digital Software Development** Occupational Specialism Areas 1 to 3. Learners follow a 22-week Scheme of Learning (Oakfield Adult Skills Hub client). Exercises live **on the week page**, using the shared UI catalogue — not Cyber-style `/week-N/<slug>/` activity routes.

## UX reference: L2E, with a T Level session model

[L2E Exploring Emerging Digital Technologies](https://github.com/Acerosa) is the UX reference:

- One URL per week: `/week-N/`
- Each activity renders inline through `InteractiveActivity` (`OptionCards`, `Classification`, `ShortResponse` / `Reflection`)
- Drafts via `createDraftStore` / `initialResponses`, with `lp-block-result` for persistence
- Formative chrome: `PracticeProgressPanel` (left, collapsed) and optional `CompletionModal`
- Prose, callouts and teacher notes use `renderFallback` (Content `renderBlock`), not hub-local widgets

**Difference:** L2E has **one session** per week. T Level has **three lessons + homework** per week. Those are four `WeekView` sessions on the same `/week-N/` page (accordion `<details>`). Lesson 1 opens by default. Homework stays a session of kind `homework`.

Foundations (`foundations/*`) stay a **separate track**. Catalogue Foundations activities can later follow this inline pattern; `programming-editor` stays a **hub host**. Do not fold Foundations into the week SoL page in this wave.

UI is pinned at **`@learning-platform/ui` v0.1.9**.

## Component bar and variety rules

Every taught week’s inline catalogue path must include, where the SoL allows:

| Type | UI component | Role in an L2E-like lesson |
| --- | --- | --- |
| `single-choice` | `OptionCards` | Retrieval / check |
| `classification` | `Classification` | Progress / sort check |
| `short-response` (or `reflection`) | `ShortResponse` / `Reflection` | Apply / justify / research |

**Per lesson (aim):**

- **Retrieval:** MCQ plus light writing
- **Main:** writing (apply / research log)
- **Formative:** classification and/or MCQ, plus a short justify

Do **not** build hub-local quiz, classify or textarea widgets for those types. If a lesson is missing classify or MCQ, **enrich Content** (generator / package), then re-render through `InteractiveActivity`.

Homework may stay writing-heavy. Scored practice (`single-choice`, `classification`) feeds the progress panel; text is unscored.

## Foundations: catalogue vs programming host

| Track | Where | Renderer |
| --- | --- | --- |
| Week SoL (priority) | `/week-N/` | `InteractiveActivity` + UI catalogue |
| Foundations catalogue (requirements, decomposition, data, testing) | `/foundations/<slug>/` | Existing host until a later wave |
| Foundations programming diagnostic | `/foundations/programming-diagnostic/` | Hub `programming-editor` (not moving into UI) |

Next wave for Foundations: catalogue activities only. Programming stays host-owned.

## Rollout

| Wave | Scope | Status |
| --- | --- | --- |
| 1 (this session) | Plan, audit, L2E-style `WeekPage`, enrich Weeks **1–3**, presentation tests | Done |
| 2 | Enrich Weeks **4–22** so each taught lesson has MCQ + classification + writing where the SoL allows | Not started |
| 3 | Foundations **catalogue** on the same InteractiveActivity path | Not started |
| Out of scope | Cyber activity-page IA; new UI components; moving `programming-editor` into UI | — |

The week page component already maps **all 22 weeks**. Weeks 4–22 will show inline exercises immediately; many still need Content enrichment for classification / MCQ variety (see audit below).

## How L2E patterns were ported

The bundled `package.json` keeps full catalogue `blocks` (not metadata-only cards) so `InteractiveActivity` can render them. That increases uncompressed JS; gzip remains the network budget.
2. **`WeekPage`** maps each session activity to `{ children: <InteractiveActivity … /> }`, with `renderFallback` for heading / paragraph / callout / teacher-note.
3. **Content engine** (`content/engine/*.js`, `src/content/engine.ts`) copied from L2E: `createDraftStore`, `bindInteractive`, `lp-block-result`.
The week page prefers a published package when that copy includes catalogue blocks for the week, and otherwise uses the bundled SoL so `/week-N/` still teaches while Admin publication catches up.

## Audit (catalogue block counts)

Counts are from the SoL package (week activities only; Foundations excluded). `sc` = `single-choice`, `cl` = `classification`, `sr` = `short-response`.

### Weeks 1–3 (pilot — enriched)

After this wave, **every taught lesson** in Weeks 1–3 includes MCQ, classification and short-response. Homework remains short-response (independent study).

| Week | Title | sc | cl | sr | Enrichment this wave |
| --- | --- | --- | --- | --- | --- |
| 1 | Client Brief, Context and Initial Research | 4 | 3 | 13 | Added classification to Lesson 3 formative (known system vs research gap) |
| 2 | Emerging Technologies, Solutions and Knowledge Gaps | 4 | 3 | 13 | Added classification to Lesson 2 (known / unknown / assumption) and Lesson 3 (emerging vs established) |
| 3 | Business Requirements, Scope and Decomposition | 4 | 3 | 13 | Added classification to Lesson 2 (decomposition / pattern / abstraction) and Lesson 3 (in / out / unknown), plus a scope MCQ |

### Weeks 4–22 (next wave — do not mass-edit yet)

These weeks already render inline on `/week-N/`. Variety is still short-response-heavy; classification is rare after Week 4.

| Week | sc | cl | sr | Taught lessons missing classify and/or MCQ |
| --- | --- | --- | --- | --- |
| 4 | 3 | 1 | 13 | L2, L3 lack classification |
| 5 | 3 | 0 | 14 | All three lessons lack classification |
| 6 | 3 | 0 | 14 | All three lessons lack classification |
| 7 | 2 | 0 | 14 | L3 lacks MCQ and classification |
| 8 | 2 | 0 | 14 | L3 lacks MCQ and classification |
| 9 | 2 | 0 | 14 | L2 lacks MCQ and classification |
| 10 | 1 | 0 | 13 | L2, L3 lack MCQ and classification |
| 11 | 1 | 0 | 13 | L2, L3 lack MCQ and classification |
| 12 | 1 | 0 | 12 | L1, L2 lack MCQ and classification |
| 13 | 1 | 0 | 13 | L2, L3 lack MCQ and classification |
| 14 | 2 | 0 | 12 | L3 lacks MCQ and classification |
| 15 | 2 | 0 | 11 | L2 lacks MCQ and classification |
| 16 | 1 | 0 | 9 | L1, L3 lack MCQ and classification |
| 17 | 1 | 0 | 12 | L2, L3 lack MCQ and classification |
| 18 | 1 | 0 | 12 | L2, L3 lack MCQ and classification |
| 19 | 1 | 0 | 10 | L2, L3 lack MCQ and classification |
| 20 | 0 | 0 | 11 | All three lessons lack MCQ and classification |
| 21 | 1 | 0 | 10 | L2, L3 lack MCQ and classification |
| 22 | 1 | 0 | 10 | L2, L3 lack MCQ and classification |

Wave 2 should add classification (and MCQ where missing) in the generator, lesson by lesson, still using catalogue block types only.
