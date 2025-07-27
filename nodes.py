# nodes.py
from pocketflow import Node, AsyncNode
from utils import call_llm, call_llm_stream, stream_llm
import threading
import json

class ReceiveComplaintNode(Node):
    def exec(self, _):
        return input("📝 Describe your complaint: ")

    def post(self, shared, prep_res, exec_res):
        shared["complaint"] = exec_res
        shared["follow_ups"] = []
        return "default"

class GenerateFollowUpNode(Node):
    def prep(self, shared):
        return {
            "complaint": shared["complaint"],
            "follow_ups": shared["follow_ups"]
        }

    def exec(self, inputs):
        prompt = f"""
Complaint: {inputs['complaint']}
Follow-up Q&A so far: {inputs['follow_ups']}

Suggest the next clarifying question to better understand this complaint.
Only output the question.
"""
        return call_llm(prompt)

    def post(self, shared, prep_res, exec_res):
        shared["next_question"] = exec_res
        return "default"

class CollectAnswerNode(Node):
    def prep(self, shared):
        return shared["next_question"]

    def exec(self, question):
        answer = input(f"🤖 {question}\n👤 Your answer: ")
        return {"question": question, "answer": answer}

    def post(self, shared, prep_res, exec_res):
        shared["follow_ups"].append(exec_res)
        return "default"

class DecideFollowUpNode(Node):
    def prep(self, shared):
        return {
            "complaint": shared["complaint"],
            "follow_ups": shared["follow_ups"]
        }

    def exec(self, inputs):
        prompt = f"""
Complaint: {inputs['complaint']}
Follow-up Q&A so far: {inputs['follow_ups']}

Is this enough to understand and process the complaint?
Respond with one word: "complete" or "continue".
"""
        return call_llm(prompt).lower()

    def post(self, shared, prep_res, exec_res):
        shared["status"] = exec_res
        return exec_res  # either "complete" or "continue"

class SummarizerNode(Node):
    def prep(self, shared):
        return {
            "complaint": shared["complaint"],
            "follow_ups": shared["follow_ups"]
        }

    def exec(self, inputs):
        complaint = inputs["complaint"]
        followups = inputs["follow_ups"]

        followup_text = "\n".join(
            f"Q: {qa['question']}\nA: {qa['answer']}" for qa in followups
        )

        prompt = f"""
You are summarizing a citizen complaint for processing by a government agency.

Original Complaint:
{complaint}

Clarifying Details:
{followup_text}

Write a short, clear summary of the complaint as a single paragraph.
"""
        return call_llm(prompt)

    def post(self, shared, prep_res, exec_res):
        shared["final_summary"] = exec_res
        return "default"

class StreamNode(Node):
    def prep(self, shared):
        prompt = shared["user_message"] # hard coded prompt
        print("Requesting stream...")
        
        chunks_iterator = call_llm_stream(prompt)

        interrupt_event = threading.Event()

        # Store the interrupt event in shared so WebSocket can access it
        shared["interrupt_event"] = interrupt_event
        
        print("WebSocket interrupt listener ready...")

        # Pass the live feed, signal, and shared_store to the 'exec' step
        return chunks_iterator, interrupt_event, shared

    def exec(self, prep_res):
        chunks, interrupt_event, shared_store = prep_res

        print("Streaming response:")
        stream_finished_normally = True 

        # Loop through the live feed from the AI
        for chunk in chunks:
            if interrupt_event.is_set(): 
                print("--- Interrupted by WebSocket ---")
                stream_finished_normally = False 
                break 

            print(chunk, end="", flush=True) # Show text immediately
            
            # Store chunk in shared_store for WebSocket streaming
            shared_store["llm_output"] += chunk

        if stream_finished_normally:
            print("\n--- Stream finished ---")

        # Return the full response for post processing
        return shared_store["response"], stream_finished_normally
    def post(self, shared, prep_res, exec_res):
        # Get the response and completion status from exec's results
        response, stream_finished_normally = exec_res

        # Store the result in shared for the WebSocket to send back
        shared["llm_output"] = response
        shared["stream_completed"] = stream_finished_normally
        
        # Clean up the interrupt event from shared
        if "interrupt_event" in shared:
            del shared["interrupt_event"]
        
        print("Stream processing completed.")
        return "default"

class StreamingChatNode(AsyncNode):
    async def prep_async(self, shared):
        print("StreamingChatNode prep_async")
        user_message = shared.get("user_message", "")
        websocket = shared.get("websocket")
        print(f"user_message: {user_message}")
        print(f"websocket: {websocket}")
        conversation_history = shared.get("conversation_history", [])
        print(f"conversation_history: {conversation_history}")
        conversation_history.append({"role": "user", "content": user_message})
        print(f"conversation_history: {conversation_history}")
        
        result = (conversation_history, websocket)
        print(f"prep_async returning: {result}")
        print(f"type of result: {type(result)}")
        return result
    
    
    
    async def exec_async(self, prep_res):

        messages, websocket = prep_res

        await websocket.send_text(json.dumps({"type": "start", "content": ""}))
        full_response = ""  
        print(f"messages: {messages}")
        async for chunk_content in stream_llm(messages):
            full_response += chunk_content
            print(chunk_content, end="", flush=True)
            await websocket.send_text(json.dumps({
                "type": "chunk", 
                "content": chunk_content
            }))
        
        await websocket.send_text(json.dumps({"type": "end", "content": ""}))
        
        return full_response, websocket
        
    
    async def post_async(self, shared, prep_res, exec_res):
        full_response, websocket = exec_res        
        conversation_history = shared.get("conversation_history", [])
        conversation_history.append({"role": "assistant", "content": full_response})
        shared["conversation_history"] = conversation_history
        return "default" 
        
        
class TestNode(Node):
    def prep(self, shared):
        return shared["user_message"]
    def exec(self, user_message):
        prompt = f"User message: {user_message}\n\nPlease provide a helpful response to this message. Make it short and concise."
        return call_llm(prompt)
    def post(self, shared, prep_res, exec_res):
        shared["llm_output"] = exec_res
        return "default"