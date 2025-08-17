import asyncio
import json
import uuid
from time import sleep

from fastapi import FastAPI, Request, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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

# Mount the static files directory
app.mount("/", StaticFiles(directory="../frontend/out", html=True), name="static")

async def run_flow(shared_store: dict):
    flow = generate_or_summarize_flow()
    await flow.run_async(shared_store)

# Kick off flow for existing task
# The curently way of procesing metadata is having the serve send the thread metadata store back to the client (even if it empty)
# Even if the client already has the metadata, it needs to send it back to the server so the server can summarize the thread / tell the user the thread has ended
# While it seems like wasted bandwidth sending back and forth, this is to maintain statelessness of each task and to ensure that metadata/threads/messages are not stored in server memory making the system more scalable/robust
@app.post("/api/chat")
async def chat_endpoint(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    
    # Task ID for client reference
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    
    # Use lock to prevent race conditions
    async with task_creation_lock:
        # Check if task queue exists, if not create it
        if task_id not in task_queues:
            print(f"Task {task_id} queue not found, creating it...")
            message_queue = asyncio.Queue()
            task_queues[task_id] = message_queue
            print(f"✅ Created new queue for task {task_id}")
        else:
            raise Exception(f"Task {task_id} already exists")
            
    # Populate dictionary with task metadata from POST
    print(f"🔍 DATA: {data}")
    
    task_metadata[task_id] = {
        "complaint_topic": data.get("threadMetaData", {}).get("topic", ""),
        "complaint_summary": data.get("threadMetaData", {}).get("summary", ""),
        "complaint_location": data.get("threadMetaData", {}).get("location", ""),
        "complaint_quality": data.get("threadMetaData", {}).get("quality", 0),
    }
    
    # Define all shared parameters here and kick off the flow
    shared_store = {    
        "conversation_history": data.get("messages", []),
        # Reference to queue for streaming response (for that id)
        "message_queue": message_queue,
        "task_id": task_id,
        "status": "continue",
        # Reference to dictionary (for that id)
        "task_metadata": task_metadata[task_id],
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
                "complaint_quality": 0,
                "complaint_summary": "",
                "complaint_location": ""
            }
            print(f"✅ Metadata created for task {task_id}")

    async def stream_generator():
        queue = task_queues[task_id]
        print(f"🔄 Starting stream for task {task_id}")
        try:
            while True:
                message = await queue.get()
                # If message is done, queue will have None at the end
                if message is None:
                    print(f"🏁 End of stream for task {task_id}")
                    
                    # Metadata is generated before stream, but only retrieve after stream is done to prevent race condition
                    stored_metadata = task_metadata.get(task_id, {})
                    metadata = {
                        "type": "metadata",
                        "threadMetaData": stored_metadata
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