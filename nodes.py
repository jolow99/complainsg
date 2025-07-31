# nodes.py
from pocketflow import AsyncNode
from utils import call_llm_async, socket_loop
import json
    
    
# Recieve first message from user, feed into generation
class EntryNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print("ENTRY NODE PREP")
        data = await shared["websocket"].receive_text()
        await shared["websocket"].send_text(json.dumps({"type": "message_received", "content": ""}))
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
class GenerateFollowUpNodeAsync(AsyncNode):
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
    
    
class AwaitAnswerNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print("AWAIT ANSWER NODE PREP")
        data = await shared['websocket'].receive_text()
        await shared['websocket'].send_text(json.dumps({"type": "message_received", "content": ""}))
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
class DecisionNodeAsync(AsyncNode):
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
    
class SummarizerNodeAsync(AsyncNode):
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