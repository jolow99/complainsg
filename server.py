from typing import Union
import json
import threading
import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from flow import basic_flow, create_streaming_chat_flow
from websocket_types import (
    ConnectionMessage,
    MessageReceivedAck,
    InterruptAckMessage,
    ErrorMessage,
    ServerMessage
)

app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Send welcome message on connection open
    welcome_message: ConnectionMessage = {
        "type": "connection",
        "message": "WebSocket connection established successfully!"
    }
    await websocket.send_text(json.dumps(welcome_message))
    
    # Initialize conversation history for this connection
    shared_store = {
        "websocket": websocket,
        "conversation_history": [],
        "current_message": "Give me a short 1 sentence summary of the book 'The Great Gatsby'",
        "llm_output": ""
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"Received message: {message}")
            if message["type"] == "message":
                shared_store["current_message"] = message["content"]
            
            flow = create_streaming_chat_flow()
            await flow.run_async(shared_store)
            
            
    except WebSocketDisconnect:
            pass
    

    
app.mount("/", StaticFiles(directory="frontend/.next", html=True), name="static")