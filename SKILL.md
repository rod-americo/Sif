---
name: sif-learning-app
description: Use when working on the Sif repository, especially for modular curriculum content, exercise metrics, the global review deck, and SQLite-backed study persistence.
---

# Sif Learning App

This repository contains a personal study app for French `2nde` physics-chemistry.

## Use This Skill When

- adding or revising lesson content in `content/`;
- creating or editing module exercises;
- adding cards to the shared deck;
- changing dashboard, module, or review metrics;
- updating the SQLite-backed backend in `server/server.py`;
- adjusting the lightweight frontend in `app/`.

## Project Rules

- Modules are the primary learning structure.
- The review deck is global.
- Cards must stay linked to modules.
- Exercise metrics and review metrics stay separate in the UI.
- Content belongs in files, not in giant embedded page blobs.

## Main Files

- `content/curriculum.json`
- `content/modules/*`
- `server/server.py`
- `app/index.html`
- `app/module.html`
- `app/review.html`

## Safe Workflow

1. Check whether the task changes content, metrics, or review behavior.
2. If adding content, update module files first.
3. If adding cards, keep ids stable and module mappings explicit.
4. If changing metrics, prefer deriving from `exercise_attempts` and `review_events`.
5. If changing UI, keep dashboard, module page, and review page visually coherent.
