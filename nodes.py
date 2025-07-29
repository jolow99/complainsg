# nodes.py
from pocketflow import Node, AsyncNode
from utils import call_llm, call_llm_async, stream_llm_async, socket_send, socket_loop
import threading
import json

class ReceiveComplaintNode(Node):
    def prep(self, shared):
        return shared["latest_user_message"]
    
    def exec(self, user_message):
        return user_message

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



class StreamingChatNode(AsyncNode):
    async def prep_async(self, shared):
        
        user_message = shared.get("latest_user_message", "")
        websocket = shared.get("websocket")
        
        conversation_history = shared.get("conversation_history", [])
        conversation_history.append({"role": "user", "content": user_message})
        
        return (conversation_history, websocket)
    
    async def exec_async(self, prep_res):
        messages, websocket = prep_res
        await socket_send(websocket, "start", "")
        full_response = await socket_loop(messages, websocket)
        await socket_send(websocket, "end", "")
        return full_response
        
    
    async def post_async(self, shared, _, exec_res):
        full_response = exec_res        
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
    
    
# Recieve first message from user, feed into generation
class EntryNode(AsyncNode):
    async def prep_async(self, shared):
        print("ENTRY NODE PREP")
        data = await shared["websocket"].receive_text()
        return data
    
    async def exec_async(self, inputs):
        print("ENTRY NODE EXEC")
        print(f"inputs: {inputs}")
        message = json.loads(inputs)
        print(f"msg: {message}")
        return message
    
    async def post_async(self, shared, prep_res, exec_res):
        print("ENTRY NODE POST")
        if exec_res["type"] == "message":
            shared["conversation_history"].append({"role": "user", "content": exec_res["content"]})
            shared["latest_user_message"] = exec_res["content"]
            shared["complaint"] = exec_res["content"]
        return "default"
    
# Generate next question to user, feed into decision
class GenerateFollowUpAsyncNode(AsyncNode):
    async def prep_async(self, shared):
        print("GENERATE FOLLOW UP NODE PREP")
        return {
            "complaint": shared["latest_user_message"],
            # This gets all of the assistant messages from the conversation history in a single array
            "conversation_history": shared["conversation_history"],
            "websocket": shared["websocket"]
        }
        
    async def exec_async(self, inputs):
        print("GENERATE FOLLOW UP NODE EXEC")
        print(f"inputs: {inputs}")        
        prompt = f"""
Complaint: {inputs['complaint']}
Follow-up Q&A so far: {inputs['conversation_history']}
Suggest the next clarifying question to better understand this complaint.
Only output the question.
"""
        print(f"PROMPT: {prompt}")
        response = await socket_loop(prompt, inputs["websocket"])
        print(f"RESPONSE: {response}")
        return response

    async def post_async(self, shared, prep_res, exec_res):
        print("GENERATE FOLLOW UP NODE POST")
        shared["conversation_history"].append({"role": "assistant", "content": exec_res})
        shared["next_question"] = exec_res
        return "default"
    
    
class AwaitAnswerNode(AsyncNode):
    async def prep_async(self, shared):
        print("AWAIT ANSWER NODE PREP")
        data = await shared['websocket'].receive_text()
        return data
    async def exec_async(self, inputs):
        message = json.loads(inputs)
        print(f"msg: {message}")
        return message
    async def post_async(self, shared, prep_res, exec_res):
        print("AWAIT ANSWER NODE POST")
        if (exec_res["type"] == "message"):
            shared["conversation_history"].append({"role": "user", "content": exec_res["content"]})
            shared["latest_user_message"] = exec_res["content"]
        return "default"


# Decide if we should continue or stop the conversation
class DecisionNode(AsyncNode):
    async def prep_async(self, shared):
        print("DECISION NODE PREP")
        return {
            "last_message": shared["latest_user_message"],
            "conversation_history": shared["conversation_history"]
        }

    async def exec_async(self, inputs):
        print("DECISION NODE EXEC")
        print(f"inputs: {inputs}")
        prompt = f"""
Last message: {inputs['last_message']}
Conversation history: {inputs['conversation_history']}

Is this enough to understand and process the complaint?
Respond with one word: "complete" or "continue".
"""
        return await call_llm_async(prompt)

    async def post_async(self, shared, prep_res, exec_res):
        print("DECISION NODE POST")
        print(f"exec_res: {exec_res}")
        shared["status"] = exec_res.lower()
        return shared["status"]  # either "complete" or "continue"
    
class AsyncSummarizerNode(AsyncNode):
    async def prep_async(self, shared):
        return {
            "conversation_history": shared["conversation_history"],
            "complaint": shared["complaint"],
            "websocket": shared["websocket"]
        }

    async def exec_async(self, inputs):

        prompt = f"""
You are summarizing a citizen complaint for processing by a government agency.

Original Complaint:
{inputs["complaint"]}

Conversation history:
{inputs["conversation_history"]}

Write a short, clear summary of the complaint as a single paragraph.


"""
        response = await socket_loop(prompt, inputs["websocket"])
        return response

    async def post_async(self, shared, prep_res, exec_res):
        print(f"ASYNC SUMMARIZER NODE POST")
        print(f"final summary: {exec_res}")
        shared["final_summary"] = exec_res
        return "default"