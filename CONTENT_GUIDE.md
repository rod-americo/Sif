# Content Guide

This file is the editorial guide for adding or revising learning content in Sif.

Use it when creating:

- new modules;
- new lesson markdown files;
- new exercises;
- new review cards.

## Goal

Keep new content:

- pedagogically useful for a strong student who still struggles in physics-chemistry;
- aligned with the French `2nde` curriculum;
- modular;
- concise;
- easy to expand later without breaking the review deck or metrics.

## Student Context

Write for:

- a 17-year-old student;
- strong in mathematics;
- weaker than expected in physics-chemistry;
- studying in French;
- likely to benefit from conceptual clarity, vocabulary precision, and repeated retrieval.

This means content should not assume the difficulty is algebraic. Often the problem is:

- vocabulary;
- conceptual distinctions;
- identifying the right model;
- connecting formulas to phenomena;
- remembering definitions, conventions, and classifications.

## Repository Model

New content belongs under:

- `content/curriculum.json`
- `content/modules/<module-slug>/module.json`
- `content/modules/<module-slug>/lessons/*.md`
- `content/modules/<module-slug>/exercises.json`
- `content/modules/<module-slug>/cards.json`

Do not add large hardcoded theory blocks to frontend HTML files.

## Module Structure

Each module should have:

- a stable `id` / slug;
- a clear title;
- a chapter list in `module.json`;
- one markdown lesson file per chapter;
- exercises mapped to `lessonId`;
- cards mapped to one or more `lessonIds`.

Prefer one module per major curriculum theme, with several lessons inside it.

## Lesson Writing Rules

Lessons should be written in French.

Each lesson should:

- stay focused on one chapter or one coherent idea block;
- be readable on mobile;
- use short sections;
- prefer concrete examples over inflated explanation;
- define terms clearly;
- distinguish similar concepts explicitly.

Good lesson content usually contains:

- a short introduction;
- 2 to 5 key ideas;
- one or two worked examples or concrete cases;
- a compact summary.

Avoid:

- long unbroken walls of text;
- overexplaining obvious things;
- vague AI-style prose;
- definitions without context;
- formulas without meaning or units.

## Markdown Style

Prefer simple Markdown:

- headings;
- short paragraphs;
- bullet lists;
- bold for important distinctions;
- inline formulas only when necessary.

Do not rely on complex Markdown features unless the renderer clearly supports them.

## Exercise Design Rules

Exercises should test understanding, not only recognition.

Each exercise must include:

- stable `id`;
- `moduleId`;
- `lessonId`;
- `type`;
- `difficulty`;
- `prompt`;
- `choices`;
- `correctIndex`;
- `explanation`.

Use difficulties consistently:

- `foundation`: direct understanding, vocabulary, first distinctions
- `application`: applying concepts to cases or data
- `advanced`: multi-step reasoning, careful discrimination, or less obvious traps

Exercise prompts should often target:

- classification;
- interpretation;
- conceptual contrast;
- identifying the correct formula or model;
- reading a scenario correctly.

Avoid making all questions into trivial definition recall.

## Card Design Rules

Cards belong to the single global deck, but they must remain traceable to modules and lessons.

Each card should be:

- short;
- atomic;
- answerable in a few seconds;
- tied to one fact, distinction, formula, or method cue;
- linked with `moduleIds` and `lessonIds`.

Good cards usually test:

- a definition;
- a symbol or notation;
- a distinction between two concepts;
- a formula and what it means;
- the identification of a species, model, unit, or law.

Avoid cards that are:

- too broad;
- essay-like;
- compound;
- redundant with another card;
- dependent on a long paragraph of context.

If a card asks too much, split it into multiple cards.

## ID Rules

Keep ids stable once content is in use.

Suggested patterns:

- exercises: `ctm_ex_01`, `mi_ex_01`, etc.
- cards: `ctm_card_01`, `mi_card_01`, etc.

Do not rename ids casually, because learner progress depends on them.

## Mapping Rules

Every exercise should map to exactly one `lessonId`.

Every card should map to:

- at least one `moduleId`;
- at least one `lessonId` when possible.

If a card is genuinely cross-cutting, multiple module or lesson links are acceptable, but do not overuse that.

## Quality Checks Before Finishing

Before considering a content addition complete, verify:

- the new lesson appears in `module.json`;
- the markdown file exists and reads well on mobile;
- exercises use the correct `lessonId`;
- cards are not obvious duplicates;
- cards are not too long;
- explanations are accurate and concise;
- terminology is correct French school terminology;
- no metric or deck rule was broken.

## Expansion Workflow

When adding a new module or extending an existing one:

1. Read `README.md`, `AGENTS.md`, and `SKILL.md`.
2. Inspect an existing module as reference.
3. Add or revise `module.json`.
4. Create or revise lesson markdown files.
5. Add exercises mapped to the right lessons.
6. Add cards mapped to the right lessons.
7. Run the local server and verify the module page and review flow.

## What A New Thread Can Ask For

A new thread can safely ask for things like:

- "Add the next module from the curriculum."
- "Create lessons for Theme 2."
- "Expand cards for transformations chimiques."
- "Add 15 better exercises for the mole chapter."
- "Clean weak AI wording in module 1."

The combination of `README.md`, `AGENTS.md`, `SKILL.md`, and this file should be enough for an agent to continue productively.
