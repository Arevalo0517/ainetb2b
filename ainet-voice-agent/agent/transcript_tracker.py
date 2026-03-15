"""
Accumulates the conversation transcript and tracks token/character counts
during a voice call.
"""

import time
from dataclasses import dataclass, field


@dataclass
class TranscriptEntry:
    role: str
    content: str
    timestamp: float


class TranscriptTracker:
    def __init__(self, project_id: str, call_id: str):
        self.project_id = project_id
        self.call_id = call_id
        self.entries: list[TranscriptEntry] = []
        self.total_tts_characters: int = 0
        self.total_tokens_input: int = 0
        self.total_tokens_output: int = 0
        self._start_time = time.time()

    def add_entry(self, role: str, content: str):
        """Add a transcript entry and track TTS characters for assistant messages."""
        self.entries.append(TranscriptEntry(
            role=role,
            content=content,
            timestamp=time.time() - self._start_time,
        ))

        if role == "assistant":
            self.total_tts_characters += len(content)

        # Rough token estimate: ~4 chars per token
        estimated_tokens = len(content) // 4
        if role == "user":
            self.total_tokens_input += estimated_tokens
        elif role == "assistant":
            self.total_tokens_output += estimated_tokens

    def get_transcript(self) -> list[dict]:
        """Return transcript as a list of dicts for JSON serialization."""
        return [
            {
                "role": entry.role,
                "content": entry.content,
                "timestamp": round(entry.timestamp, 2),
            }
            for entry in self.entries
        ]

    @property
    def duration_seconds(self) -> int:
        return int(time.time() - self._start_time)
