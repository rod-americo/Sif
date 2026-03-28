import json
import os
import sqlite3
import time
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from socketserver import TCPServer
from urllib.parse import parse_qs, urlparse


PORT = int(os.environ.get("PORT", "3070"))
REPO_ROOT = Path(__file__).resolve().parent.parent
APP_ROOT = REPO_ROOT / "app"
CONTENT_ROOT = REPO_ROOT / "content"
DATA_ROOT = REPO_ROOT / "data"
DB_PATH = DATA_ROOT / "app.db"
SECONDS_PER_DAY = 86400


def now_ts() -> int:
    return int(time.time())


def normalize_text_list(values):
    return json.dumps(values, ensure_ascii=False)


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db():
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                answer TEXT NOT NULL,
                module_ids TEXT NOT NULL,
                lesson_ids TEXT NOT NULL,
                tags TEXT NOT NULL,
                interval_days INTEGER NOT NULL DEFAULT 0,
                due_at INTEGER NOT NULL DEFAULT 0,
                review_count INTEGER NOT NULL DEFAULT 0,
                lapse_count INTEGER NOT NULL DEFAULT 0,
                last_reviewed_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS review_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id TEXT NOT NULL,
                rating TEXT NOT NULL,
                interval_before INTEGER NOT NULL,
                interval_after INTEGER NOT NULL,
                due_before INTEGER NOT NULL,
                due_after INTEGER NOT NULL,
                reviewed_at INTEGER NOT NULL,
                FOREIGN KEY(card_id) REFERENCES cards(id)
            );

            CREATE TABLE IF NOT EXISTS exercise_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exercise_id TEXT NOT NULL,
                module_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                is_correct INTEGER NOT NULL,
                answered INTEGER NOT NULL,
                selected_index INTEGER,
                correct_index INTEGER NOT NULL,
                attempted_at INTEGER NOT NULL
            );
            """
        )


def sync_cards():
    module_dir = CONTENT_ROOT / "modules"
    with get_db() as conn:
        for cards_path in module_dir.glob("*/cards.json"):
            for card in load_json(cards_path):
                conn.execute(
                    """
                    INSERT INTO cards (
                        id, prompt, answer, module_ids, lesson_ids, tags,
                        interval_days, due_at, review_count, lapse_count, last_reviewed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL)
                    ON CONFLICT(id) DO UPDATE SET
                        prompt = excluded.prompt,
                        answer = excluded.answer,
                        module_ids = excluded.module_ids,
                        lesson_ids = excluded.lesson_ids,
                        tags = excluded.tags
                    """,
                    (
                        card["id"],
                        card["prompt"],
                        card["answer"],
                        normalize_text_list(card.get("moduleIds", [])),
                        normalize_text_list(card.get("lessonIds", [])),
                        normalize_text_list(card.get("tags", [])),
                    ),
                )


def load_curriculum():
    return load_json(CONTENT_ROOT / "curriculum.json")


def load_module(module_id: str):
    module_root = CONTENT_ROOT / "modules" / module_id
    module_path = module_root / "module.json"
    if not module_path.exists():
        return None

    module = load_json(module_path)
    lessons = []
    for chapter in module.get("chapters", []):
        lesson_path = module_root / "lessons" / chapter["lessonFile"]
        body = lesson_path.read_text(encoding="utf-8")
        lessons.append(
            {
                "id": chapter["id"],
                "title": chapter["title"],
                "content": body,
            }
        )

    exercises_path = module_root / "exercises.json"
    exercises = load_json(exercises_path) if exercises_path.exists() else []
    module["lessons"] = lessons
    module["exercises"] = exercises
    return module


def get_review_summary(conn, module_id=None):
    cards = conn.execute("SELECT * FROM cards").fetchall()
    current = now_ts()
    rows = []
    for row in cards:
        module_ids = set(json.loads(row["module_ids"]))
        if module_id and module_id not in module_ids:
            continue
        rows.append(row)

    total = len(rows)
    due = sum(1 for row in rows if row["due_at"] <= current)
    learned = sum(1 for row in rows if row["interval_days"] > 0)
    mature = sum(1 for row in rows if row["interval_days"] >= 7)
    new_cards = sum(1 for row in rows if row["review_count"] == 0)

    recent_window = current - (14 * SECONDS_PER_DAY)
    recent_reviews = [
        event
        for event in conn.execute(
            """
            SELECT re.*, c.module_ids
            FROM review_events re
            JOIN cards c ON c.id = re.card_id
            WHERE re.reviewed_at >= ?
            ORDER BY re.reviewed_at DESC
            """,
            (recent_window,),
        ).fetchall()
        if not module_id or module_id in set(json.loads(event["module_ids"]))
    ]
    recent_failures = sum(1 for event in recent_reviews if event["rating"] == "wrong")
    recent_error_rate = (
        round((recent_failures / len(recent_reviews)) * 100, 1) if recent_reviews else None
    )

    return {
        "totalCards": total,
        "dueCards": due,
        "newCards": new_cards,
        "learnedCards": learned,
        "matureCards": mature,
        "recentReviewCount": len(recent_reviews),
        "recentErrorRate": recent_error_rate,
    }


def get_module_exercise_metrics(conn, module_id: str):
    attempts = conn.execute(
        """
        SELECT *
        FROM exercise_attempts
        WHERE module_id = ?
        ORDER BY attempted_at DESC
        """,
        (module_id,),
    ).fetchall()

    total = len(attempts)
    correct = sum(1 for attempt in attempts if attempt["is_correct"])
    recent = attempts[:8]
    recent_correct = sum(1 for attempt in recent if attempt["is_correct"])

    exercises = load_module(module_id)["exercises"] if load_module(module_id) else []
    exercise_ids = {exercise["id"] for exercise in exercises}
    covered_ids = {attempt["exercise_id"] for attempt in attempts}

    weakest = []
    for exercise in exercises:
        exercise_attempts = [a for a in attempts if a["exercise_id"] == exercise["id"]]
        if not exercise_attempts:
            continue
        accuracy = sum(1 for item in exercise_attempts if item["is_correct"]) / len(exercise_attempts)
        weakest.append(
            {
                "exerciseId": exercise["id"],
                "prompt": exercise["prompt"],
                "lessonId": exercise["lessonId"],
                "accuracy": round(accuracy * 100, 1),
                "attempts": len(exercise_attempts),
            }
        )

    weakest.sort(key=lambda item: (item["accuracy"], item["attempts"]))

    return {
        "totalAttempts": total,
        "accuracyRate": round((correct / total) * 100, 1) if total else None,
        "recentAccuracyRate": round((recent_correct / len(recent)) * 100, 1) if recent else None,
        "coveredExercises": len(covered_ids.intersection(exercise_ids)),
        "totalExercises": len(exercise_ids),
        "lastActivityAt": attempts[0]["attempted_at"] if attempts else None,
        "weakestExercises": weakest[:3],
    }


def get_module_summary(conn, module_meta):
    module_id = module_meta["id"]
    exercise_metrics = get_module_exercise_metrics(conn, module_id) if module_meta["status"] == "active" else {
        "totalAttempts": 0,
        "accuracyRate": None,
        "recentAccuracyRate": None,
        "coveredExercises": 0,
        "totalExercises": 0,
        "lastActivityAt": None,
        "weakestExercises": [],
    }
    review_metrics = get_review_summary(conn, module_id if module_meta["status"] == "active" else None)

    return {
        **module_meta,
        "exerciseMetrics": exercise_metrics,
        "reviewMetrics": review_metrics if module_meta["status"] == "active" else {
            "totalCards": 0,
            "dueCards": 0,
            "newCards": 0,
            "learnedCards": 0,
            "matureCards": 0,
            "recentReviewCount": 0,
            "recentErrorRate": None,
        },
    }


def get_dashboard():
    curriculum = load_curriculum()
    with get_db() as conn:
        modules = [get_module_summary(conn, module_meta) for module_meta in curriculum["modules"]]
        review = get_review_summary(conn)

        weak_spots = []
        for module in modules:
            for exercise in module["exerciseMetrics"].get("weakestExercises", []):
                if exercise["accuracy"] >= 80:
                    continue
                weak_spots.append(
                    {
                        "moduleId": module["id"],
                        "moduleTitle": module["title"],
                        **exercise,
                    }
                )

        weak_spots.sort(key=lambda item: item["accuracy"])

        active_modules = [module for module in modules if module["status"] == "active"]
        next_module = sorted(
            active_modules,
            key=lambda item: (
                item["exerciseMetrics"]["coveredExercises"] == 0,
                item["reviewMetrics"]["dueCards"],
                item["exerciseMetrics"]["lastActivityAt"] or 0,
            ),
            reverse=True,
        )[0] if active_modules else None

    return {
        "curriculum": curriculum,
        "modules": modules,
        "review": review,
        "weakSpots": weak_spots[:4],
        "resumeModuleId": next_module["id"] if next_module else None,
    }


def get_due_card(conn, module_id=None):
    current = now_ts()
    rows = conn.execute("SELECT * FROM cards ORDER BY due_at ASC, review_count ASC, id ASC").fetchall()
    for row in rows:
        if row["due_at"] > current:
            continue
        module_ids = set(json.loads(row["module_ids"]))
        if module_id and module_id not in module_ids:
            continue
        return {
            "id": row["id"],
            "prompt": row["prompt"],
            "answer": row["answer"],
            "moduleIds": json.loads(row["module_ids"]),
            "lessonIds": json.loads(row["lesson_ids"]),
            "tags": json.loads(row["tags"]),
            "intervalDays": row["interval_days"],
            "reviewCount": row["review_count"],
            "dueAt": row["due_at"],
        }
    return None


def compute_next_interval(current_interval: int, rating: str) -> int:
    if rating == "wrong":
        return 0
    if rating == "hard":
        return max(1, current_interval + 1)
    if rating == "medium":
        return 2 if current_interval == 0 else current_interval * 2
    if rating == "easy":
        return 4 if current_interval == 0 else current_interval * 3
    raise ValueError("Unsupported rating")


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/dashboard":
            self.respond_json(get_dashboard())
            return
        if parsed.path == "/api/modules":
            self.respond_json(get_dashboard()["modules"])
            return
        if parsed.path.startswith("/api/modules/"):
            module_id = parsed.path.split("/")[-1]
            module = load_module(module_id)
            if not module:
                self.respond_json({"error": "Module not found"}, status=404)
                return
            with get_db() as conn:
                payload = {
                    "module": module,
                    "metrics": get_module_exercise_metrics(conn, module_id),
                    "reviewMetrics": get_review_summary(conn, module_id),
                }
            self.respond_json(payload)
            return
        if parsed.path == "/api/review/next":
            query = parse_qs(parsed.query)
            module_id = query.get("moduleId", [None])[0]
            with get_db() as conn:
                card = get_due_card(conn, module_id)
            self.respond_json({"card": card})
            return
        if parsed.path == "/api/review/summary":
            query = parse_qs(parsed.query)
            module_id = query.get("moduleId", [None])[0]
            with get_db() as conn:
                summary = get_review_summary(conn, module_id)
            self.respond_json(summary)
            return

        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/exercise-attempt":
            self.handle_exercise_attempt()
            return
        if parsed.path == "/api/review":
            self.handle_review()
            return
        self.respond_json({"error": "Not found"}, status=404)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        payload = self.rfile.read(length)
        return json.loads(payload.decode("utf-8"))

    def respond_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_exercise_attempt(self):
        try:
            payload = self.read_json_body()
            attempted_at = int(payload.get("attemptedAt") or now_ts())
            with get_db() as conn:
                conn.execute(
                    """
                    INSERT INTO exercise_attempts (
                        exercise_id, module_id, lesson_id, is_correct, answered,
                        selected_index, correct_index, attempted_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["exerciseId"],
                        payload["moduleId"],
                        payload["lessonId"],
                        1 if payload["isCorrect"] else 0,
                        1 if payload.get("answered", True) else 0,
                        payload.get("selectedIndex"),
                        payload["correctIndex"],
                        attempted_at,
                    ),
                )
                metrics = get_module_exercise_metrics(conn, payload["moduleId"])
            self.respond_json({"ok": True, "metrics": metrics})
        except Exception as exc:
            self.respond_json({"error": str(exc)}, status=400)

    def handle_review(self):
        try:
            payload = self.read_json_body()
            reviewed_at = int(payload.get("reviewedAt") or now_ts())
            with get_db() as conn:
                row = conn.execute("SELECT * FROM cards WHERE id = ?", (payload["cardId"],)).fetchone()
                if not row:
                    raise ValueError("Card not found")

                interval_before = int(row["interval_days"])
                due_before = int(row["due_at"])
                interval_after = compute_next_interval(interval_before, payload["rating"])
                due_after = reviewed_at + (interval_after * SECONDS_PER_DAY)
                lapse_count = row["lapse_count"] + (1 if payload["rating"] == "wrong" else 0)

                conn.execute(
                    """
                    UPDATE cards
                    SET interval_days = ?, due_at = ?, review_count = review_count + 1,
                        lapse_count = ?, last_reviewed_at = ?
                    WHERE id = ?
                    """,
                    (interval_after, due_after, lapse_count, reviewed_at, payload["cardId"]),
                )
                conn.execute(
                    """
                    INSERT INTO review_events (
                        card_id, rating, interval_before, interval_after,
                        due_before, due_after, reviewed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["cardId"],
                        payload["rating"],
                        interval_before,
                        interval_after,
                        due_before,
                        due_after,
                        reviewed_at,
                    ),
                )
                summary = get_review_summary(conn, payload.get("moduleId"))
            self.respond_json({"ok": True, "summary": summary})
        except Exception as exc:
            self.respond_json({"error": str(exc)}, status=400)


class ReusableTCPServer(TCPServer):
    allow_reuse_address = True


def main():
    initialize_db()
    sync_cards()
    print("======================================")
    print("Sif server started")
    print(f"Open http://localhost:{PORT}/")
    print("======================================")
    with ReusableTCPServer(("", PORT), AppHandler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    main()
