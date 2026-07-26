from fastapi import APIRouter, Header, HTTPException

from app.config import ADMIN_TOKEN
from app.db import get_client

router = APIRouter(tags=["admin"])

# Truncate order matters — children before parents (FK constraints).
_RESET_TABLES = [
    "criterion_result",
    "criterion_score",
    "scoring_pass",
    "language_proficiency",
    "turn",
    "harness_pair",
    "session",
    "candidate",
]


def _require_admin(x_admin_token: str | None) -> None:
    """Destructive endpoint, no other auth in this scaffold (PRD scopes real
    auth out) — but this one route is reachable from the public API URL, so
    it needs more than obscurity. Fails closed if ADMIN_TOKEN isn't set."""
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="missing or invalid X-Admin-Token")


@router.post("/admin/reset")
def reset_demo_state(x_admin_token: str | None = Header(default=None)):
    """Truncate sessions/turns/scores, keep role + rubric_criterion (they're
    seed data, not demo state). Needed at Hour 6 — see TRD §11 checklist."""
    _require_admin(x_admin_token)
    db = get_client()
    for table in _RESET_TABLES:
        db.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    return {"status": "reset"}
