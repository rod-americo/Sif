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

Fully wired modules:

- `constitution-transformations`
- `mouvement-interactions`

The curriculum scaffold also includes:

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

## Persistence Model

The app separates **content** from **learner progress**.

### Content

Content lives in `content/` and is versionable:

- `content/curriculum.json`: top-level module ordering and metadata
- `content/modules/<slug>/module.json`: module metadata and chapter list
- `content/modules/<slug>/lessons/*.md`: theory content
- `content/modules/<slug>/exercises.json`: module exercises
- `content/modules/<slug>/cards.json`: source cards linked to modules and lessons

### Runtime Deck

The learner-facing deck lives in `data/app.db`.

The source `cards.json` files are synchronized into SQLite on startup. The schema now separates:

- `cards`: the shared card catalog
- `user_cards`: the live review state for one learner

That split keeps the app ready for future multi-user support without changing the frontend flow today.

The database stores the live review state for each card in `user_cards`:

- prompt and answer
- module and lesson links
- current interval
- due date
- ease factor
- review count and lapse count

### Learner Progress

Learner progress also lives in `data/app.db`:

- `users`: learner identities
- `user_cards`: current state of each card for a given learner
- `review_events`: review history
- `exercise_attempts`: exercise history

Metrics are derived from these tables instead of being stored as fragile aggregate blobs.

### Single Learner Today, Multi-User Later

The current app still behaves as a single-learner app.

The backend uses a fixed learner id through `SIF_ACTIVE_USER_ID`, defaulting to `default-user`. There is no login screen yet, but the persistence model is already shaped so a future login layer can attach progress to multiple users without redesigning the deck model.

### Portability

The backend resolves paths relative to the repository root, not to a machine-specific absolute path.

That means:

- the repository can be moved to another directory or machine;
- `content/` remains portable;
- if `data/app.db` is missing, the database is recreated automatically on startup.

If the database is recreated, content and source cards are restored from `content/`, but learner progress and live review state are reset unless an old `app.db` is carried over.

## Repository Notes

- The app is intentionally framework-light.
- Content is stored as files so it can be revised incrementally.
- Progress is stored as events and card state in SQLite, not as opaque aggregate JSON.
- The repository is licensed under the MIT License. See `LICENSE`.
