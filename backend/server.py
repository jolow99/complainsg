from typing import Union
import json

from fastapi import FastAPI, WebSocket, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from flow import create_streaming_chat_flow
from fastapi.middleware.cors import CORSMiddleware

from utils import stream_llm_async

app = FastAPI()

# List of allowed origins (your frontend URL)
origins = [
    "http://localhost:3000",
]

# Add CORSMiddleware to the application
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Allows specific origins
    allow_credentials=True,         # Allows cookies
    allow_methods=["*"],            # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],            # Allows all headers
)



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Send welcome message on connection open
    welcome_message: ConnectionMessage = {
        "type": "connection",
        "message": "Hello! I'm here to help you with your complaint. Please describe your complaint in detail!"
    }
    await websocket.send_text(json.dumps(welcome_message))
    
    # Initialize conversation history for this connection
    shared_store = {
        "complaint": "",
        "websocket": websocket,
        "conversation_history": [],
        "latest_user_message": "",
        "latest_assistant_message": "",
        "status": "continue",
        "final_summary": ""
    }

    flow = create_streaming_chat_flow()
    await flow.run_async(shared_store)


@app.post("/api/chat/stream")
async def chat_stream(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    
    # Hard-coded system prompt for the POC
    system_prompt = "You are a helpful complaint assistant. Help users articulate and structure their complaints clearly and professionally."
    
    # Convert to the format expected by stream_llm_async
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        formatted_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    async def generate_stream():
        print('Generating stream...')
        try:
            async for chunk in stream_llm_async(formatted_messages):
                if chunk:
                    # SSE format: data: {json}\n\n
                    print('Sending chunk: ', chunk)
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Send done event
            print('Sending done event')
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )
            
            
    
# app.mount("/", StaticFiles(directory="frontend/.next", html=True), name="static")