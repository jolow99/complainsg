# nodes.py
from pocketflow import AsyncNode
from utils import call_llm_async, stream_llm_async
import json
from firebase_config import db

class HTTPDataExtractionNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print("🔍 DATA EXTRACTION NODE: prep_async() called")
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
        }
        print(f"🔍 DATA EXTRACTION NODE: Current inputs = {inputs}")
        return inputs
    async def exec_async(self, inputs):
        
        # All 3 need to be filled to end the flow
        complaint_topic = inputs.get("complaint_topic", "")
        complaint_location = inputs.get("complaint_location", {})
        complaint_summary = inputs.get("complaint_summary", "")
        
        # Check if any required metadata is missing
        missing_fields = [key for key, value in inputs.items() if key in ['complaint_topic', 'complaint_location', 'complaint_summary'] and not value]
        print(f"🔍 DATA EXTRACTION NODE: Missing fields = {missing_fields}")
        
         # Retrieve all documents from the 'topics' collection
        topics_ref = db.collection('topics')
        topics_docs = topics_ref.stream()
        topics = [doc.to_dict() for doc in topics_docs]
        print(f"🔍 DATA EXTRACTION NODE: Retrieved topics = {topics}")
        
        if missing_fields:
            print("🔍 DATA EXTRACTION NODE: Calling LLM to extract missing data")
            # Extract topics from the retrieved documents
            topic_list = [doc['topic'] for doc in topics]
            topics_string = ', '.join(topic_list)

            print(f"🔍 DATA EXTRACTION NODE: Topics string = {topics_string}")
            
            # Include topics_string in the prompt
            prompt = f"""
            Conversation history: {inputs['conversation_history']}
            
            The data I need: {', '.join(missing_fields)}
            
            Extract the following information from the conversation and return it as valid JSON:
            
            Examples:
            - complaint_topics: "Treatment of construction workers", "Construction noise", "Noise from birds"
            - complaint_locations: "Joo Chiat", "Boon Lay", "Bishan"
            - complaint_summary: "Citizen thinks that construction works are not treated fairly. He/She thinks that workers are not paid fairly and are not given enough breaks. He/She thinks that the construction site is not safe and that there are no safety measures in place. Citizen wants to know if the government is doing anything to improve the situation."
            
            For complaint_topic, try and match the topic to one of the following topics if possible: {topics_string}
            If you cant find a match, just make up a topic.
            
            Return ONLY valid JSON in this format:
            {{
                "complaint_topic": "extracted topic or null",
                "complaint_location": "extracted location or null", 
                "complaint_summary": "extracted summary or null"
            }}
            
            If you cannot extract a field, set it to null.
            """
            
            response = await call_llm_async(prompt)
            print(f"🔍 DATA EXTRACTION NODE: LLM response = {response}")
            
            # Parse response into JSON
            try:
                result = json.loads(response)
                
                # Check if LLM wants to continue
                if "status" in result and result["status"] == "continue":
                    return "continue"
                
                # Update inputs with extracted data
                for key, value in result.items():
                    if key in inputs and value and value != "null":
                        inputs[key] = value
                        print(f"🔍 DATA EXTRACTION NODE: Updated {key} = {value}")
                        
                # Update local variables
                complaint_topic = inputs.get("complaint_topic", "")
                complaint_location = inputs.get("complaint_location", "")
                complaint_summary = inputs.get("complaint_summary", "")
                        
            except json.JSONDecodeError:
                print("❌ DATA EXTRACTION NODE: Failed to parse JSON response from LLM")
                print(f"❌ DATA EXTRACTION NODE: Raw response was: {response}")
                return "continue"
            
       

        result = {
            "complaint_topic": complaint_topic,
            "complaint_location": complaint_location,
            "complaint_summary": complaint_summary
        }
        print(f"🔍 DATA EXTRACTION NODE: Final result = {result}")
        return result
    
    async def post_async(self, shared, prep_res, exec_res):
        print("🔍 DATA EXTRACTION NODE: post_async() called")
        
        print(f"🔍 DATA EXTRACTION NODE: exec_res = {exec_res}")
        
        # Populate task metadata with extracted data
        shared["task_metadata"]["complaint_topic"] = exec_res.get("complaint_topic")
        shared["task_metadata"]["complaint_location"] = exec_res.get("complaint_location")
        shared["task_metadata"]["complaint_summary"] = exec_res.get("complaint_summary")
        
        print(f"🔍 DATA EXTRACTION NODE: task_metadata = {shared['task_metadata']}")
        if exec_res.get("complaint_topic") and exec_res.get("complaint_location") and exec_res.get("complaint_summary"):
            print("🔍 DATA EXTRACTION NODE: All fields complete - returning 'end'")
            return "end"
        else:
            print("🔍 DATA EXTRACTION NODE: Some fields missing - returning 'continue'")
            return 'continue'


class HTTPGenerateNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print(f"🔍 GENERATE NODE: prep_async() called")
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
            "queue": shared.get("message_queue")
        }
        return inputs
    async def exec_async(self, inputs):
        print(f"🔍 GENERATE NODE: exec_async() called")
        
        queue = inputs.get("queue")
        
        missing_fields = [key for key, value in inputs.items() if key in ['complaint_topic', 'complaint_location', 'complaint_summary'] and not value]
        print(f"🔍 GENERATE NODE: Missing fields = {missing_fields}")
        
        if missing_fields:
            print("🔍 GENERATE NODE: Calling LLM to generate question")
        
        prompt = f"""
Conversation history: {inputs['conversation_history']}

Missing Data: {', '.join(missing_fields)}

Based on this conversation history and the data I need, suggest the next clarifying question to better understand the complaint and to get the data I want. Only output the question.
"""
        full_response = ""
        async for chunk in stream_llm_async([{"role": "user", "content": prompt}]):
            if chunk:
                full_response += chunk
                if queue:
                    await queue.put(chunk)
        if queue:
            await queue.put(None)
        return full_response
    async def post_async(self, shared, prep_res, exec_res):
        shared["conversation_history"].append({"role": "assistant", "content": exec_res})
        return "default"

class HTTPSummarizerNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print('shared: conversation_history', shared.get("conversation_history"))
        
        return {
            "conversation_history": shared["conversation_history"],
            "queue": shared.get("message_queue")
        }
    async def exec_async(self, inputs):
        prompt = f"""
You are summarizing a citizen complaint conversation for processing by a government agency.

Conversation history:
{inputs["conversation_history"]}

Write a short, clear summary of the complaint as a single paragraph.
"""
        full_response = ""
        queue = inputs.get("queue")
        async for chunk in stream_llm_async([{"role": "user", "content": prompt}]):
            if chunk:
                full_response += chunk
                if queue:
                    await queue.put(chunk)
        if queue:
            await queue.put(None)
        return full_response
    async def post_async(self, shared, prep_res, exec_res):
        return "default"

class HTTPRejectionNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        print("🔍 PREP: Rejection Node")
        queue = shared.get("message_queue")
        return {"queue": queue}
    
    async def exec_async(self, inputs):
        import asyncio
        
        # Response text
        response_text = "Seems like this thread has ended. Create a new chat if you want to start anther complaint!"
        
        queue = inputs.get("queue")
        full_response = ""
        
        # Fake streaming response lol more vibes then j throwing up a wall of text
        if queue:
            # Split the response into words
            words = response_text.split()
            # Put each word into the queue with a small delay
            for word in words:
                word_with_space = word + " "
                full_response += word_with_space
                await queue.put(word_with_space)
                await asyncio.sleep(0.1)  # Small delay to simulate streaming
            
            # Signal end of stream
            await queue.put(None)
        
        return response_text
    
    async def post_async(self, shared, prep_res, exec_res):
        return "default"