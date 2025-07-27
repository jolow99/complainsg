from typing import Union, TypedDict, Literal

# WebSocket JSON Message Types and Available Keys
# =============================================

# Client to Server Messages
class ClientMessage(TypedDict, total=False):
    """Messages sent from client to server"""
    content: str  # User's message content
    type: Literal["interrupt"]  # Interrupt signal

# Server to Client Messages
class ConnectionMessage(TypedDict):
    """Welcome message sent on WebSocket connection"""
    type: Literal["connection"]
    message: str  # Welcome message text

class MessageReceivedAck(TypedDict):
    """Acknowledgment that server received a message"""
    type: Literal["message_received"]
    content: str  # Confirmation message

class StreamChunkMessage(TypedDict):
    """Individual word from streaming response"""
    type: Literal["stream_chunk"]
    content: str  # Single word from LLM stream

class StreamCompleteMessage(TypedDict):
    """Signal that streaming is complete"""
    type: Literal["stream_complete"]
    content: str  # Usually empty string

class InterruptAckMessage(TypedDict):
    """Acknowledgment of interrupt signal"""
    type: Literal["interrupt_acknowledged"]
    message: str  # Success message

class ErrorMessage(TypedDict):
    """Error message from server"""
    type: Literal["error"]
    message: str  # Error description

class LLMOutputMessage(TypedDict):
    """Legacy fallback for LLM output"""
    type: Literal["llm_output"]
    content: str  # Full LLM response

# Legacy/Alternative Message Types (from nodes.py)
class StartMessage(TypedDict):
    """Stream start signal (from StreamingChatNode)"""
    type: Literal["start"]
    content: str  # Usually empty

class ChunkMessage(TypedDict):
    """Stream chunk (from StreamingChatNode)"""
    type: Literal["chunk"]
    content: str  # Chunk content

class EndMessage(TypedDict):
    """Stream end signal (from StreamingChatNode)"""
    type: Literal["end"]
    content: str  # Usually empty

# Union type for all possible server responses
ServerMessage = Union[
    ConnectionMessage,
    MessageReceivedAck,
    StreamChunkMessage,
    StreamCompleteMessage,
    InterruptAckMessage,
    ErrorMessage,
    LLMOutputMessage,
    StartMessage,
    ChunkMessage,
    EndMessage
]

# Available Keys Summary:
# ======================
# 
# Client → Server:
# - content: str (user message)
# - type: "interrupt" (interrupt signal)
#
# Server → Client:
# - type: "connection" | "message_received" | "stream_chunk" | "stream_complete" | 
#         "interrupt_acknowledged" | "error" | "llm_output" | "start" | "chunk" | "end"
# - message: str (for connection, interrupt_acknowledged, error)
# - content: str (for message_received, stream_chunk, stream_complete, llm_output, start, chunk, end)

# Usage Examples (TypeScript-like patterns):
# =========================================
#
# 1. Type annotations for variables:
#    welcome_msg: ConnectionMessage = {
#        "type": "connection",
#        "message": "WebSocket connected!"
#    }
#
# 2. Function parameter typing:
#    def send_message(websocket: WebSocket, message: ServerMessage) -> None:
#        await websocket.send_text(json.dumps(message))
#
# 3. Return type annotations:
#    def create_welcome_message() -> ConnectionMessage:
#        return {"type": "connection", "message": "Welcome!"}
#
# 4. Type checking with isinstance (runtime):
#    if isinstance(message, dict) and message.get("type") == "interrupt":
#        # Handle interrupt
#
# 5. IDE autocomplete will show available keys:
#    message: StreamChunkMessage = {"type": "stream_chunk", "content": "hello"}
#    # IDE will autocomplete "content" when you type message.
#
# 6. Union Types (like TypeScript):
#    def handle_message(message: ServerMessage) -> None:
#        if message["type"] == "stream_chunk":
#            # IDE knows message has "content" key
#            print(message["content"])
#        elif message["type"] == "error":
#            # IDE knows message has "message" key
#            print(message["message"]) 