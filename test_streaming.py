#!/usr/bin/env python3
"""
Test script to verify word-by-word streaming implementation
"""

import asyncio
import websockets
import json
import threading
import time

async def test_streaming():
    """Test the word-by-word streaming functionality"""
    
    # Connect to WebSocket
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket server")
        
        # Wait for welcome message
        welcome = await websocket.recv()
        welcome_data = json.loads(welcome)
        print(f"Welcome message: {welcome_data}")
        
        # Send a test message
        test_message = {
            "content": "Tell me a short story about a cat"
        }
        await websocket.send(json.dumps(test_message))
        print(f"Sent message: {test_message}")
        
        # Listen for responses
        word_count = 0
        while True:
            try:
                response = await websocket.recv()
                data = json.loads(response)
                
                if data["type"] == "message_received":
                    print(f"Message acknowledged: {data['content']}")
                
                elif data["type"] == "stream_chunk":
                    word_count += 1
                    print(f"Word {word_count}: '{data['content']}'")
                
                elif data["type"] == "stream_complete":
                    print(f"Stream completed after {word_count} words")
                    break
                
                elif data["type"] == "error":
                    print(f"Error: {data['message']}")
                    break
                    
            except websockets.exceptions.ConnectionClosed:
                print("WebSocket connection closed")
                break
            except Exception as e:
                print(f"Error: {e}")
                break

if __name__ == "__main__":
    print("Testing word-by-word streaming...")
    asyncio.run(test_streaming()) 