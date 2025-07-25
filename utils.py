import os 
import anthropic 
import requests
import json
from dotenv import load_dotenv

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

def call_llm_stream(prompt):
    qwen_api_key = os.getenv("QWEN3_FREE")
    if not (qwen_api_key):
        raise ValueError("QWEN3_FREE environment variable is set.")
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
            "stream": True
        }
        buffer = ""
        # i copied this code block from openrouter docs, should be reviewed again i dont fully understand it
        with requests.post(url, headers=headers, json=data, stream=True) as r:
            for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
                buffer += chunk
                while True:
                    try:
                        line_end = buffer.find('\n')
                        if line_end == -1:
                            break
                        line = buffer[:line_end].strip()
                        buffer = buffer[line_end + 1:]
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                return
                            try:
                                data_obj = json.loads(data)
                                content = data_obj["choices"][0]["delta"].get("content")
                                if content:
                                    yield content
                                else:
                                    pass
                            except json.JSONDecodeError as e:
                                pass
                    except Exception as e:
                        break