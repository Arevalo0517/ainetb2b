"""
Builds LLM function/tool context from voice_tools config.
When the LLM invokes a tool, this module POSTs to the n8n webhook.
"""

import logging
from typing import Optional

import httpx
from livekit.agents import llm

logger = logging.getLogger("ainet-voice")


def build_function_context(
    voice_tools: list[dict],
    n8n_base_url: Optional[str],
) -> Optional[llm.FunctionContext]:
    """
    Create a FunctionContext from the voice_tools config.

    Each tool in voice_tools looks like:
    {
        "name": "check_order",
        "description": "Check the status of a customer order",
        "parameters": { "order_id": {"type": "string", "description": "The order ID"} },
        "n8n_endpoint": "https://n8n.example.com/webhook/abc123"  # optional override
    }
    """
    if not voice_tools:
        return None

    fnc_ctx = llm.FunctionContext()

    for tool_def in voice_tools:
        name = tool_def.get("name")
        description = tool_def.get("description", "")
        endpoint = tool_def.get("n8n_endpoint", n8n_base_url)

        if not name or not endpoint:
            continue

        # Register the tool dynamically
        _register_tool(fnc_ctx, name, description, tool_def.get("parameters", {}), endpoint)

    return fnc_ctx if voice_tools else None


def _register_tool(
    fnc_ctx: llm.FunctionContext,
    name: str,
    description: str,
    parameters: dict,
    endpoint: str,
):
    """Register a single tool that calls an n8n webhook."""

    async def tool_handler(**kwargs):
        logger.info(f"Tool call: {name} with args: {kwargs}")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    json={"tool": name, "arguments": kwargs},
                    timeout=10.0,
                )
                data = response.json()
                return data.get("result", str(data))
        except Exception as e:
            logger.error(f"Tool {name} failed: {e}")
            return f"Error executing {name}: {str(e)}"

    # Set metadata for the LLM
    tool_handler.__name__ = name
    tool_handler.__doc__ = description

    fnc_ctx.register(name=name, description=description, fn=tool_handler)
