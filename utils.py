import os 
import anthropic 

def call_llm(prompt):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set.")
    
    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": "user", "content": prompt}]
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=messages
    )
    return message.content[0].text