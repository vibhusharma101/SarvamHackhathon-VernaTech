"""Single Supabase client. Backend is the only writer (TRD §1) — never import
this from anywhere the frontend can reach."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import SUPABASE_SERVICE_KEY, SUPABASE_URL


@lru_cache
def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY not set — copy .env.example to .env "
            "and fill in project credentials before hitting any DB-backed route."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
