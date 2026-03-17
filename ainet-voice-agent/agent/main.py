"""
AiNet Voice Agent — LiveKit Worker entry point.

Listens for new LiveKit rooms with prefix 'voice-' and joins them
with a configured STT → LLM → TTS pipeline.

Usage:
  python -m agent.main dev     # development mode
  python -m agent.main start   # production mode
"""

import logging
from dotenv import load_dotenv
from livekit.agents import WorkerOptions, cli

from agent.voice_agent import entrypoint

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ainet-voice")


def main():
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            num_idle_processes=1,
        )
    )


if __name__ == "__main__":
    main()
