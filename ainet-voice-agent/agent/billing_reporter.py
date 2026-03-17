"""
Reports call completion and usage data to the AiNet API
for credit deduction and call log updates.
Optionally runs post-call LLM analysis if configured.
"""

import os
import logging
import json

import httpx

from agent.transcript_tracker import TranscriptTracker

logger = logging.getLogger("ainet-voice")


async def _run_analysis(
    transcript: list[dict],
    analysis_config: dict,
) -> dict:
    """Run post-call LLM analysis (summary, structured data, success eval)."""
    from openai import AsyncOpenAI

    summary_prompt = analysis_config.get("analysis_summary_prompt")
    structured_schema = analysis_config.get("analysis_structured_schema")
    success_prompt = analysis_config.get("analysis_success_prompt")
    model = analysis_config.get("voice_ai_model", "gpt-4o-mini")

    if not any([summary_prompt, success_prompt]):
        return {}

    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    transcript_text = "\n".join(
        f"{e['role'].upper()}: {e['content']}" for e in transcript
    )

    result: dict = {}

    if summary_prompt:
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": summary_prompt},
                    {"role": "user", "content": f"Transcript de la llamada:\n\n{transcript_text}"},
                ],
                max_tokens=400,
            )
            result["analysis_summary"] = resp.choices[0].message.content
        except Exception as e:
            logger.error(f"Analysis summary failed: {e}")

    if success_prompt:
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": success_prompt},
                    {"role": "user", "content": f"Transcript de la llamada:\n\n{transcript_text}"},
                ],
                max_tokens=200,
            )
            result["analysis_success"] = resp.choices[0].message.content
        except Exception as e:
            logger.error(f"Analysis success eval failed: {e}")

    if structured_schema and transcript:
        try:
            schema_str = json.dumps(structured_schema) if isinstance(structured_schema, dict) else str(structured_schema)
            resp = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"Extrae los datos del transcript según este schema JSON: {schema_str}. "
                            "Responde SOLO con el JSON, sin explicación adicional."
                        ),
                    },
                    {"role": "user", "content": f"Transcript:\n\n{transcript_text}"},
                ],
                max_tokens=500,
                response_format={"type": "json_object"},
            )
            result["analysis_structured_data"] = json.loads(
                resp.choices[0].message.content or "{}"
            )
        except Exception as e:
            logger.error(f"Analysis structured data failed: {e}")

    return result


async def report_call_end(
    call_id: str,
    project_id: str,
    duration_seconds: int,
    tracker: TranscriptTracker,
    recording_url: str | None = None,
    analysis_config: dict | None = None,
):
    """POST call data to /api/voice/webhook for billing."""
    api_url = os.environ.get("AINET_API_URL", "http://localhost:3000")
    secret = os.environ.get("VOICE_WEBHOOK_SECRET", "")

    # Run post-call analysis if configured
    analysis_results: dict = {}
    if analysis_config and tracker.entries:
        transcript_list = [{"role": e.role, "content": e.content} for e in tracker.entries]
        analysis_results = await _run_analysis(transcript_list, analysis_config)

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
        **analysis_results,
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

    first_topic = user_messages[0][:100]
    return (
        f"Call with {len(user_messages)} user messages. "
        f"Topic: {first_topic}"
    )
