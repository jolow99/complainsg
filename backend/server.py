import asyncio
import json
import uuid

from fastapi import FastAPI, Request, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from flow import generate_or_summarize_flow

app = FastAPI()

# Dictionary to hold queues for different tasks
task_queues = {}
# Dictionary to hold metadata for different tasks
task_metadata = {}
# Lock to prevent race conditions when creating tasks
task_creation_lock = asyncio.Lock()

# List of allowed origins (your frontend URL)
origins = [
    "http://localhost:3000",
]

# Add CORSMiddleware to the application
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # This function is untouched as per the instructions.
    await websocket.accept()

    welcome_message = {
        "type": "connection",
        "message": "Hello! I'm here to help you with your complaint. Please describe your complaint in detail!",
    }
    await websocket.send_text(json.dumps(welcome_message))

    from flow import create_streaming_chat_flow
    shared_store = {
        "complaint": "",
        "websocket": websocket,
        "conversation_history": [],
        "latest_user_message": "",
        "latest_assistant_message": "",
        "status": "continue",
        "final_summary": "",
    }
    flow = create_streaming_chat_flow()
    await flow.run_async(shared_store)


async def run_flow(shared_store: dict):
    flow = generate_or_summarize_flow()
    await flow.run_async(shared_store)


# Kick off flow for existing task
@app.post("/api/chat")
async def chat_endpoint(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    # HARD CODED TASK ID FOR NOW
    task_id = "123"
    
    # Use lock to prevent race conditions
    async with task_creation_lock:
        # Check if task queue exists, if not create it
        if task_id not in task_queues:
            print(f"Task {task_id} queue not found, creating it...")
            message_queue = asyncio.Queue()
            task_queues[task_id] = message_queue
            print(f"✅ Created new queue for task {task_id}")
        else:
            message_queue = task_queues[task_id]
            print(f"✅ Using existing queue for task {task_id}")
    
    # Define all shared parameters here and kick off the flow
    shared_store = {
        "complaint_topic": data.get("complaint_topic", ""),
        "complaint_metadata": data.get("complaint_metadata", {}),
        "conversation_history": data.get("messages", []),
        "message_queue": message_queue,
        "task_id": task_id,
        "status": "continue",
    }
    
    # Initialize metadata storage for this task using the shared_store values
    task_metadata[task_id] = {
        "complaint_topic": shared_store["complaint_topic"],
        "complaint_metadata": shared_store["complaint_metadata"],
    }
    
    print(f"🚀 Starting background flow for task {task_id}")
    background_tasks.add_task(run_flow, shared_store)
    return {"task_id": task_id}

# SSE endpoint to receive streaming response from the queue for a specific task
@app.get("/api/chat/stream/{task_id}")
async def stream_endpoint(task_id: str):
    """
    This endpoint returns the streaming response from the queue for a specific task.
    If the task doesn't exist, it creates the task ID and queue but doesn't run the flow.
    """
    print(f"📥 GET /api/chat/stream/{task_id} - Current tasks: {list(task_queues.keys())}")
    
    # Use lock to prevent race conditions
    async with task_creation_lock:
        # If task doesn't exist, create the queue only (no flow execution)
        if task_id not in task_queues:
            print(f"Task {task_id} not found, creating queue...")
            message_queue = asyncio.Queue()
            task_queues[task_id] = message_queue
            print(f"✅ Queue created for task {task_id}")
        else:
            print(f"✅ Task {task_id} already exists")
        if task_id not in task_metadata:
            print(f"Task {task_id} not found, creating metadata...")
            task_metadata[task_id] = {
                "complaint_topic": "",
                "complaint_metadata": {}
            }
            print(f"✅ Metadata created for task {task_id}")

    async def stream_generator():
        queue = task_queues[task_id]
        print(f"🔄 Starting stream for task {task_id}")
        try:
            while True:
                message = await queue.get()
                print(f"📨 Got message from queue: {message}")
                # If message is done, queue will have None at the end
                if message is None:
                    print(f"🏁 End of stream for task {task_id}")
                    # Send metadata from storage instead of hardcoded values
                    stored_metadata = task_metadata.get(task_id, {})
                    metadata = {
                        "type": "metadata",
                        "complaintTopic": stored_metadata.get("complaint_topic", ""), 
                        "complaintMetadata": stored_metadata.get("complaint_metadata", {})
                    }
                    
                    print(f"🔍 Sending metadata: {metadata}")
                    yield f"data: {json.dumps(metadata)}\n\n"
                    # Sentinel to indicate the end of the stream
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
                yield f"data: {json.dumps({'content': message})}\n\n"
                queue.task_done()
        finally:
            # Clean up the queue and metadata
            if task_id in task_queues:
                print(f"🧹 Cleaning up task {task_id}")
                del task_queues[task_id]
            if task_id in task_metadata:
                print(f"🧹 Cleaning up metadata for task {task_id}")
                del task_metadata[task_id]

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
