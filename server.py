from typing import Union
import json

from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from flow import create_streaming_chat_flow
from websocket_types import (
    ConnectionMessage
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
            
            
    
app.mount("/", StaticFiles(directory="frontend/.next", html=True), name="static")