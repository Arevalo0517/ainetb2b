"""
Loads voice_config for a project directly from Supabase.
Uses service role key for low-latency direct access.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger("ainet-voice")

_supabase_client = None


def _get_supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
    return _supabase_client


async def load_project_config(project_id: str) -> Optional[dict]:
    """Fetch voice_config for a project from Supabase."""
    try:
        supabase = _get_supabase()
        result = (
            supabase.table("voice_configs")
            .select("*")
            .eq("project_id", project_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"Failed to load config for project {project_id}: {e}")
        return None
