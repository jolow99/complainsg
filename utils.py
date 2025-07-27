import os 
import anthropic 
import requests
import json
from dotenv import load_dotenv
import httpx
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()

def call_llm(prompt):
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    qwen_api_key = os.getenv("QWEN3_FREE")
    if not (anthropic_api_key or qwen_api_key):
        raise ValueError("Neither ANTHROPIC_API_KEY nor QWEN3_FREE environment variable is set.")
    elif anthropic_api_key:
        client = anthropic.Anthropic(api_key=anthropic_api_key)
        messages = [{"role": "user", "content": prompt}]
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=messages
        )
        return message.content[0].text
    # qwen fallback
    elif qwen_api_key:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {qwen_api_key}",
            "Content-Type": "application/json"
    }
    data = {
        "model": "qwen/qwen3-30b-a3b:free",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1024,
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

async def call_llm_stream(prompt):
    messages = [{"role": "user", "content": prompt}]
    async for content in stream_llm(messages):
        yield content

async def stream_llm(
    messages,
    model="qwen/qwen3-30b-a3b:free",
    api_key=os.environ.get("QWEN3_FREE"),
    base_url="https://openrouter.ai/api/v1",
):
    client = AsyncOpenAI(
        base_url=base_url,
        api_key=api_key,
    )
    
    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        temperature=0.7,
        extra_body={"max_tokens": 1024},
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content