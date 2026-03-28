# AGENTS

This repository is meant to be workable by multiple coding agents, not just Codex.

## Mission

Maintain and expand a personal study application for French `2nde` physics-chemistry with:

- modular theory content;
- module-scoped exercises and metrics;
- one global Anki-like review deck;
- a calm, low-friction interface for an individual learner.

## Non-Negotiable Product Rules

1. The primary organizational unit is the **module**.
2. The review deck is **global**, not one deck per module.
3. Cards must remain traceable back to one or more modules.
4. Exercise metrics and review metrics must remain visibly separate.
5. New content should be added through the `content/` model, not by hardcoding large HTML pages.

## Architecture Rules

- Keep content under `content/`.
- Keep runtime persistence in SQLite under `data/app.db`.
- Prefer deriving metrics from persisted events instead of storing fragile precomputed summaries.
- Preserve card review history whenever card ids remain stable.
- Avoid introducing frontend or backend frameworks unless there is a demonstrated need.

## Content Rules

- Interface and learning content should remain in French unless a file is explicitly internal documentation.
- Favor concise, accurate theory over inflated AI-generated prose.
- Keep lessons modular and scannable.
- Exercises should test understanding, not only recognition.
- Cards should be short, atomic, and suitable for spaced repetition.

## Editing Rules

- Do not rebuild the app around monolithic HTML pages.
- Do not split the review deck into per-module decks.
- Do not hide pedagogically distinct metrics inside a single score.
- Do not overwrite learner progress just because content changed.
- When changing schemas, document the migration path in `README.md`.

## Files Worth Reading First

- `README.md`
- `SKILL.md`
- `content/curriculum.json`
- `server/server.py`

## Expected Workflow For Agents

1. Inspect the relevant module and current content model.
2. Confirm whether the task affects content, persistence, metrics, or UI.
3. Prefer small coherent changes that keep module data and review behavior aligned.
4. Verify locally by running the server when practical.
