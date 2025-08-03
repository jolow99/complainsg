import os 
import anthropic 
import requests
import json
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables from .env file
load_dotenv()

# Models
QWEN_THINKING = "qwen/qwen3-235b-a22b-thinking-2507"
QWEN_30B = "qwen/qwen3-30b-a3b:free"
CLAUDE_SONNET = "claude-sonnet-4-20250514"

def call_llm(prompt):
    anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
    qwen_api_key = os.getenv("QWEN_30B")
    if not (anthropic_api_key or qwen_api_key):
        raise ValueError("Neither ANTHROPIC_API_KEY nor QWEN3_FREE environment variable is set.")
    elif anthropic_api_key:
        client = anthropic.Anthropic(api_key=anthropic_api_key)
        messages = [{"role": "user", "content": prompt}]
        message = client.messages.create(
            model=CLAUDE_SONNET,
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

async def stream_llm_async(
    messages,
    model=QWEN_30B,
    api_key=os.environ.get("QWEN_30B"),
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

async def call_llm_async(prompt, model=QWEN_30B, api_key=os.environ.get("QWEN_30B"), base_url="https://openrouter.ai/api/v1"):
    messages = [{"role": "user", "content": prompt}]    
    client = AsyncOpenAI(
        base_url=base_url,
        api_key=api_key,
    )
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        extra_body={"max_tokens": 1024},
    )
    return response.choices[0].message.content

async def socket_send(websocket, type, content):
    await websocket.send_text(json.dumps({"type": type, "content": content}))

async def socket_loop(prompt, websocket):
    # In the future, we could look into using the entire conversation history to generate the next question, rather than just a single prompt
    messages = [{"system": "You are a dog assistant. You are helpful and friendly, before every reply, make sure you saw WOOF WOOF!.", "role": "user", "content": prompt}]
    full_response = ""
    max_retries = 3
    retry_count = 0
    await socket_send(websocket, "starting_stream", "")
    
    while retry_count < max_retries:
        async for chunk_content in stream_llm_async(messages):
            if chunk_content == "":
                continue
            full_response += chunk_content
            print(f"chunk_content: {chunk_content}")
            await socket_send(websocket, "chunk", chunk_content)
        
        # Check if response is empty or just whitespace
        if full_response.strip():
            print(f"stream_complete: {full_response}")
            await socket_send(websocket, "stream_complete", full_response)
            return full_response
        
        # Empty response, retry with a more explicit prompt
        retry_count += 1
        if retry_count < max_retries:
            await socket_send(websocket, "error", "Retrying...")

    await socket_send(websocket, "error", "Max retries reached for response generation. Failure at socket_loop level")
    
    # If all retries failed, return a fallback response
    return "default"