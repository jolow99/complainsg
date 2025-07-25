from typing import Union
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from flow import create_stream_flow, basic_flow

app = FastAPI()

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Send welcome message on connection open
    welcome_message = {
        "type": "connection",
        "message": "WebSocket connection established successfully!"
    }
    await websocket.send_text(json.dumps(welcome_message))
    
    # Initialize conversation history for this connection
    shared_store = {
        "user_message": "when is singapore independence day?",
        "llm_output": ""
    }
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            print(f"Received message: {message}")
            
            # Update only the current message, keep conversation history
            shared_store["user_message"] = message.get("content", "")
            
            # Send acknowledgment back to client
            response = {
                "type": "message_received",
                "content": f"Server received: {message.get('content', '')}"
            }
            await websocket.send_text(json.dumps(response))
            
            flow = basic_flow()
            flow.run(shared_store)
            
            llm_response = {
                "type": "llm_output",
                "content": shared_store.get("llm_output", "")
            }
            await websocket.send_text(json.dumps(llm_response))
            
            
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Invalid JSON format"
        }))
    except Exception as e:
        print(f"Error handling message: {e}")
        await websocket.send_text(json.dumps({
            "type": "error", 
            "message": "Internal server error"
        }))
    
    # try:
    #     while True:
    #         data = await websocket.receive_text()
    #         message = json.loads(data)
            
    #         # Update only the current message, keep conversation history
    #         shared_store["user_message"] = message.get("content", "")
            
    #         flow = create_streaming_chat_flow()
    #         await flow.run_async(shared_store)
            
    # except WebSocketDisconnect:
    #     pass
    
app.mount("/", StaticFiles(directory="frontend/.next", html=True), name="static")