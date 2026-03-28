# Sif

Sif is a personal physics-chemistry study app for a French `2nde` student.

The name comes from the Norse goddess **Sif**, associated with earth, fertility, and golden hair. The project uses the name as a metaphor for cultivation: a study tool meant to help knowledge take root steadily, lesson by lesson, review by review.

## Purpose

The app is designed around three constraints:

- the student studies in French and follows the official French curriculum;
- content should grow by module over time;
- long-term review should happen in a single global Anki-like deck, while progress remains readable by module.

## Product Model

The repository is organized around:

- `content/`: curriculum, module metadata, lesson markdown, exercises, and source cards;
- `server/`: Python backend serving the app and persisting progress in SQLite;
- `app/`: static frontend pages, styles, and scripts;
- `data/`: local runtime data, including `app.db`.

## Learning Model

There are three learning surfaces:

- `Dashboard`: resume study, inspect modules, and see weak spots.
- `Module study`: read theory, complete exercises, and inspect module metrics.
- `Global review`: review all due cards from a single spaced-repetition deck.

Metrics are intentionally separated:

- module exercise performance;
- module-linked review load;
- global review health.

## Current Scope

The first fully wired module is:

- `constitution-transformations`

The curriculum scaffold already includes:

- `mouvement-interactions`
- `ondes-signaux`

## Run

```bash
python3 server/server.py
```

Default URL:

```text
http://localhost:3070/
```

## Content Expansion

To add a new module:

1. Add it to `content/curriculum.json`.
2. Create `content/modules/<slug>/module.json`.
3. Add lesson markdown files under `lessons/`.
4. Add `exercises.json`.
5. Add `cards.json`.

Cards are synchronized into the single deck stored in SQLite. Existing review progress is preserved when card ids stay stable.

## Repository Notes

- The app is intentionally framework-light.
- Content is stored as files so it can be revised incrementally.
- Progress is stored as events and card state in SQLite, not as opaque aggregate JSON.
