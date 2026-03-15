"""
Core voice pipeline: Deepgram STT → OpenAI LLM → Deepgram TTS.

Joins a LiveKit room, loads project config from Supabase,
and runs the conversational pipeline.
"""

import logging
import time

from livekit.agents import AutoSubscribe, JobContext, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero

from agent.config_loader import load_project_config
from agent.tool_executor import build_function_context
from agent.transcript_tracker import TranscriptTracker
from agent.billing_reporter import report_call_end

logger = logging.getLogger("ainet-voice")


async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Parse project_id and call_id from room name: "voice-{projectId}-{callId}"
    room_name = ctx.room.name
    parts = room_name.split("-", 2)
    if len(parts) < 3:
        logger.error(f"Invalid room name format: {room_name}")
        return

    project_id = parts[1]
    call_id = parts[2]

    logger.info(f"Joining room {room_name} for project {project_id}, call {call_id}")

    # Load config from Supabase
    config = await load_project_config(project_id)
    if not config:
        logger.error(f"No voice config found for project {project_id}")
        return

    # Initialize plugins
    stt = deepgram.STT(
        model=config.get("stt_model", "nova-2"),
        language=config.get("stt_language", "es"),
    )

    tts = deepgram.TTS(
        model=config.get("tts_model", "aura-asteria-en"),
    )

    llm_plugin = openai.LLM(
        model=config.get("voice_ai_model", "gpt-4o-mini"),
    )

    # VAD for detecting speech
    vad = silero.VAD.load()

    # Build tool/function context from voice_tools config
    fnc_ctx = build_function_context(
        config.get("voice_tools", []),
        config.get("n8n_voice_webhook_url"),
    )

    # System prompt
    system_prompt = config.get("voice_system_prompt", "You are a helpful voice assistant.")

    # Chat context
    chat_ctx = llm.ChatContext()
    chat_ctx.append(role="system", text=system_prompt)

    # Transcript tracker
    tracker = TranscriptTracker(
        project_id=project_id,
        call_id=call_id,
    )

    # Create the pipeline agent
    agent_kwargs = {
        "vad": vad,
        "stt": stt,
        "llm": llm_plugin,
        "tts": tts,
        "chat_ctx": chat_ctx,
    }
    if fnc_ctx:
        agent_kwargs["fnc_ctx"] = fnc_ctx

    agent = VoicePipelineAgent(**agent_kwargs)

    # Track transcripts
    @agent.on("user_speech_committed")
    def on_user_speech(text: str):
        tracker.add_entry("user", text)

    @agent.on("agent_speech_committed")
    def on_agent_speech(text: str):
        tracker.add_entry("assistant", text)

    # Start the agent
    agent.start(ctx.room)

    # Say greeting
    greeting = config.get("greeting_message", "Hola, ¿en qué le puedo ayudar?")
    await agent.say(greeting)
    tracker.add_entry("assistant", greeting)

    start_time = time.time()

    # When all participants leave, report billing
    @ctx.room.on("participant_disconnected")
    async def on_disconnect(participant):
        if ctx.room.remote_participants:
            return  # Still has participants

        duration = int(time.time() - start_time)
        logger.info(f"Call ended. Duration: {duration}s")

        await report_call_end(
            call_id=call_id,
            project_id=project_id,
            duration_seconds=duration,
            tracker=tracker,
        )
