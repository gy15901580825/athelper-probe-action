#!/usr/bin/env python
# tests/stub_openai_server.py
"""Minimal OpenAI-compat-shaped server for action self-test.

Listens on :8765, accepts POST /v1/chat/completions, echoes the user message.
"""
from aiohttp import web


async def chat(request):
    body = await request.json()
    user = next((m["content"] for m in body.get("messages", []) if m["role"] == "user"), "")
    return web.json_response({
        "choices": [{
            "message": {"role": "assistant", "content": f"echo: {user}"},
            "finish_reason": "stop",
        }],
        "usage": {"input_tokens": max(1, len(user) // 4), "output_tokens": 5},
    })


def main():
    app = web.Application()
    app.router.add_post("/v1/chat/completions", chat)
    web.run_app(app, port=8765)


if __name__ == "__main__":
    main()
