"""
Reports call completion and usage data to the AiNet API
for credit deduction and call log updates.
"""

import os
import logging

import httpx

from agent.transcript_tracker import TranscriptTracker

logger = logging.getLogger("ainet-voice")


async def report_call_end(
    call_id: str,
    project_id: str,
    duration_seconds: int,
    tracker: TranscriptTracker,
    recording_url: str | None = None,
):
    """POST call data to /api/voice/webhook for billing."""
    api_url = os.environ.get("AINET_API_URL", "http://localhost:3000")
    secret = os.environ.get("VOICE_WEBHOOK_SECRET", "")

    payload = {
        "call_id": call_id,
        "project_id": project_id,
        "duration_seconds": duration_seconds,
        "transcript": tracker.get_transcript(),
        "summary": _generate_summary(tracker),
        "recording_url": recording_url,
        "llm_tokens_input": tracker.total_tokens_input,
        "llm_tokens_output": tracker.total_tokens_output,
        "tts_characters": tracker.total_tts_characters,
        "status": "completed",
        "metadata": {},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_url}/api/voice/webhook",
                json=payload,
                headers={"x-voice-secret": secret},
                timeout=15.0,
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(
                    f"Billing reported for call {call_id}: "
                    f"{data.get('credits_consumed', 0)} credits consumed"
                )
            else:
                logger.error(
                    f"Billing webhook failed ({response.status_code}): {response.text}"
                )
    except Exception as e:
        logger.error(f"Failed to report billing for call {call_id}: {e}")


def _generate_summary(tracker: TranscriptTracker) -> str:
    """Generate a simple summary from the transcript."""
    entries = tracker.entries
    if not entries:
        return "No conversation recorded."

    user_messages = [e.content for e in entries if e.role == "user"]
    if not user_messages:
        return "No user messages recorded."

    # Simple summary: first user message + message count
    first_topic = user_messages[0][:100]
    return (
        f"Call with {len(user_messages)} user messages. "
        f"Topic: {first_topic}"
    )
