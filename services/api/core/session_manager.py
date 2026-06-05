"""
TradeNexus API — Lucy Session Manager.

Manages conversational memory and contextual parameters in Upstash Redis.
"""

from typing import Any, Dict, List, Optional
import json
from pydantic import BaseModel, Field
from core.redis_client import get_redis_client
from core.database import get_client


class LucySession(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]] = Field(default_factory=list)  # [{"role": "user"|"assistant", "content": str}]
    context: Dict[str, Any] = Field(default_factory=lambda: {
        "active_commodity": None,
        "quantity": None,
        "unit": "quintal",
        "origin": None,
        "destination": None,
        "deal": None,
        "inventory_snapshot": {}
    })


class SessionManager:
    """Manages conversational session state for Lucy."""

    def __init__(self):
        self.redis = get_redis_client()
        self.ttl = 7200  # 2 hours

    def _get_key(self, session_id: str) -> str:
        return f"lucy:session:{session_id}"

    async def get_session(self, session_id: str) -> Optional[LucySession]:
        """Retrieve a session from Redis."""
        key = self._get_key(session_id)
        data_str = await self.redis.get(key)
        if not data_str:
            return None
        try:
            data = json.loads(data_str)
            return LucySession(**data)
        except Exception as e:
            print(f"Error parsing session data for {session_id}: {e}")
            return None

    async def save_session(self, session: LucySession) -> None:
        """Save a session to Redis with TTL."""
        key = self._get_key(session.session_id)
        data_str = session.json()
        await self.redis.set(key, data_str, ex=self.ttl)

    async def create_session(self, session_id: str) -> LucySession:
        """Create a new session, pre-populate inventory snapshot from Supabase, and save."""
        session = LucySession(session_id=session_id)
        await self.refresh_inventory_snapshot(session)
        await self.save_session(session)
        return session

    async def refresh_inventory_snapshot(self, session: LucySession) -> None:
        """Fetch current user inventory from Supabase and update the snapshot."""
        sb = get_client()
        snapshot = {}
        try:
            res = sb.table("user_inventory").select("quantity, commodities(canonical_name)").execute()
            if res.data:
                for row in res.data:
                    comm = row.get("commodities")
                    if comm and "canonical_name" in comm:
                        snapshot[comm["canonical_name"]] = float(row["quantity"])
            session.context["inventory_snapshot"] = snapshot
        except Exception as e:
            print(f"Error fetching inventory snapshot for session {session.session_id}: {e}")
            session.context["inventory_snapshot"] = {}

    async def append_message(self, session: LucySession, role: str, content: str) -> None:
        """Append a message to the session history and trim to last 8 turns (16 messages)."""
        # Store compact history in Redis — full markdown responses can exceed URL limits.
        stored = content if len(content) <= 2000 else content[:2000] + "…"
        session.messages.append({"role": role, "content": stored})
        # Last 8 turns = 16 messages max
        if len(session.messages) > 16:
            session.messages = session.messages[-16:]
        await self.save_session(session)

    async def update_context(self, session: LucySession, updates: Dict[str, Any]) -> None:
        """Update session context variables and save."""
        for k, v in updates.items():
            if k in session.context:
                session.context[k] = v
            else:
                session.context[k] = v
        await self.save_session(session)


_session_manager: SessionManager | None = None


def get_session_manager() -> SessionManager:
    """Return a shared SessionManager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
