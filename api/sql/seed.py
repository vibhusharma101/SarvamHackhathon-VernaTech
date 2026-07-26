"""Seed `role` + the four `rubric_criterion` rows from PRD §8. Run once
against a fresh Supabase instance: `python sql/seed.py`.

Never hand-enter these rows in the Supabase dashboard (TRD §5) — this script
is the single source of truth for the rubric.
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db import get_client  # noqa: E402

ROLE_TITLE = "Backend Engineer"

CRITERIA = [
    {
        "name": "Production debugging",
        "definition": "Diagnosed a real failure in a running system.",
        "evidence_required": "a specific symptom, the diagnostic method used, and the fix.",
        "anchor_l1": 'generic ("we fixed bugs")',
        "anchor_l2": "names a bug, no method",
        "anchor_l3": "symptom + method",
        "anchor_l4": "symptom + method + fix, specific and coherent",
        "anchor_l5": "all of that plus what they'd do differently or how they prevented recurrence",
    },
    {
        "name": "Data modelling",
        "definition": "Made a schema or data-structure decision and can justify it.",
        "evidence_required": "the shape chosen, and why over an alternative.",
        "anchor_l1": "names a database only",
        "anchor_l2": "describes a schema, no reasoning",
        "anchor_l3": "schema + one reason",
        "anchor_l4": "schema + reasoning + rejected alternative",
        "anchor_l5": "all that plus how it behaved under real load or change",
    },
    {
        "name": "Concurrency / scale behaviour",
        "definition": "Handled concurrent load, race conditions, caching, or queueing.",
        "evidence_required": "a concrete instance with the mechanism named.",
        "anchor_l1": "buzzwords only",
        "anchor_l2": "names a mechanism, no instance",
        "anchor_l3": "mechanism + instance",
        "anchor_l4": "mechanism + instance + why that mechanism",
        "anchor_l5": "plus failure modes or trade-offs of the choice",
    },
    {
        "name": "Trade-off articulation",
        "definition": "Chose one path and can explain what was given up.",
        "evidence_required": "decision, alternative, cost accepted.",
        "anchor_l1": "no trade-off framing",
        "anchor_l2": "asserts a decision",
        "anchor_l3": "decision + alternative",
        "anchor_l4": "decision + alternative + cost accepted",
        "anchor_l5": "plus what would change the decision",
    },
]


def seed():
    db = get_client()

    existing = db.table("role").select("id").eq("title", ROLE_TITLE).execute()
    if existing.data:
        print(f"role '{ROLE_TITLE}' already seeded (id={existing.data[0]['id']}) — skipping")
        return

    rubric_id = str(uuid.uuid4())
    role = db.table("role").insert({"title": ROLE_TITLE, "rubric_id": rubric_id}).execute()
    print(f"created role: {role.data[0]}")

    for c in CRITERIA:
        row = db.table("rubric_criterion").insert({**c, "rubric_id": rubric_id}).execute()
        print(f"  + criterion: {row.data[0]['name']}")


if __name__ == "__main__":
    seed()
