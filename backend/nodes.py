# nodes.py
from pocketflow import AsyncNode
from utils import call_llm_async, stream_llm_async
import json
from firebase_config import db
import asyncio

# If the complaint quality is at or below this threshold, it will try to atttempt to ask more questions
complaint_threshold = 4

class HTTPDataExtractionNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
            "complaint_quality": shared.get("task_metadata", {}).get("complaint_quality", 0),
        }
        print(f"🔍 DATA EXTRACTION NODE: Current inputs = {inputs}")
        return inputs
    async def exec_async(self, inputs):
        has_been_summarized = False
        to_generate_topic = False
    
        # All 3 need to be filled to end the flow
        complaint_topic = inputs.get("complaint_topic", "")
        complaint_location = inputs.get("complaint_location", {})
        complaint_summary = inputs.get("complaint_summary", "")
        complaint_quality = inputs.get("complaint_quality", 0)
        
        print(f"🔍 DATA EXTRACTION NODE: complaint_quality (pre LLM) = {complaint_quality}")

        # Check if any required metadata is missing (and if the complaint quality is below 3)
        missing_fields = []
        for key, value in inputs.items():
            if key in ['complaint_topic', 'complaint_location', 'complaint_summary', 'complaint_quality']:
                if not value:
                    missing_fields.append(key)
                if key == 'complaint_quality' and value < complaint_threshold:
                    missing_fields.append(key)
        
        # If no missing fields, this has been summarized before
        if not missing_fields:
            has_been_summarized = True
            
        if not inputs.get("complaint_topic", ""):
            to_generate_topic = True
        
         # Retrieve all documents from the 'topics' collection
        topics_ref = db.collection('topics')
        topics_docs = topics_ref.stream()
        topics = [doc.to_dict() for doc in topics_docs]
        
        if missing_fields:
            # Extract topics from the retrieved documents
            topic_list = [doc['topic'] for doc in topics]
            topics_string = ', '.join(topic_list)

            # Include topics_string in the prompt
            prompt = f"""
            Conversation history: {inputs['conversation_history']}
            
            The data I need: {', '.join(missing_fields)}
            
            Extract the following information from the conversation and return it as valid JSON:
            
            Examples:
            - complaint_topics: "Treatment of construction workers", "Construction noise", "Noise from birds"
            - complaint_locations: "Joo Chiat", "Boon Lay", "Bishan"
            - complaint_summary: "Citizen thinks that construction works are not treated fairly. He/She thinks that workers are not paid fairly and are not given enough breaks. He/She thinks that the construction site is not safe and that there are no safety measures in place. Citizen wants to know if the government is doing anything to improve the situation."
            - complaint_quality: 3
            
            For complaint_topic, try and match the topic to one of the following topics if possible: {topics_string}
            If you cant find a match, just make up a topic.
            
            For the complaint_quality: Give a number based on the productivity and actionability of the complaint. Consider:
                - Is the issue specific and actionable by government?
                - Is there sufficient detail for policymakers to understand?
                - Does it describe community impact or broader implications?
                - Is the concern constructive rather than just emotional venting?
            Follow this scale:
                1 = Not productive (vague, personal, or outside government scope)
                2 = Minimal productivity (lacks detail or context)
                3 = Somewhat productive (has potential but needs more information)
                4 = Productive (clear, actionable, policy-relevant)
                5 = Very productive (specific, impactful, well-detailed)
            
            
            Return ONLY valid JSON in this format:
            {{
                "complaint_topic": "extracted topic or null",
                "complaint_location": "extracted location or null", 
                "complaint_summary": "extracted summary or null",
                "complaint_quality": "extracted quality or null"
            }}
            
            If you cannot extract a field, set it to null.
            """
            
            response = await call_llm_async(prompt)
            
            # Parse response into JSON
            try:
                result = json.loads(response)
                
                print(f"🔍 DATA EXTRACTION NODE: Result = {result}")
                
                # Update inputs with extracted data
                for key, value in result.items():
                    if key in inputs and value and value != "null":
                        inputs[key] = value
                        print(f"🔍 DATA EXTRACTION NODE: Updated {key} = {value}")
                        
                # Update local variables
                complaint_topic = inputs.get("complaint_topic", "")
                complaint_location = inputs.get("complaint_location", "")
                complaint_summary = inputs.get("complaint_summary", "")
                complaint_quality = inputs.get("complaint_quality", 0)
                                
                # If topic has just been generated AND there is a new topic AND it was not one of the existing topics, generate a new topic document
                if to_generate_topic and inputs.get("complaint_topic", "") and (inputs.get("complaint_topic", "") not in topic_list):
                    # Create a new topic document in the 'topics' collection
                    
                    new_topic_ref = topics_ref.document()
                    new_topic_data = {
                        "topic": complaint_topic,
                        "summary": complaint_summary,
                        "imageURL": "https://firebasestorage.googleapis.com/v0/b/complainsg-b0b10.firebasestorage.app/o/Default_Cuphead.png?alt=media"
                    }
                    new_topic_ref.set(new_topic_data)
                    print(f"🔍 DATA EXTRACTION NODE: Created new topic document = {new_topic_data}")
                        
            except json.JSONDecodeError:
                print("❌ DATA EXTRACTION NODE: Failed to parse JSON response from LLM")
                print(f"❌ DATA EXTRACTION NODE: Raw response was: {response}")
                return "continue"
            
        result = {
            "complaint_topic": complaint_topic,
            "complaint_location": complaint_location,
            "complaint_summary": complaint_summary,
            "complaint_quality": complaint_quality,
            "has_been_summarized": has_been_summarized
        }
        return result
    
    async def post_async(self, shared, prep_res, exec_res):
        
        print(f"🔍 DATA EXTRACTION NODE: complaint_quality (post LLM) = {exec_res.get('complaint_quality')}")
        
        # Populate task metadata with extracted data
        shared["task_metadata"]["complaint_topic"] = exec_res.get("complaint_topic")
        shared["task_metadata"]["complaint_location"] = exec_res.get("complaint_location")
        shared["task_metadata"]["complaint_summary"] = exec_res.get("complaint_summary")
        shared["task_metadata"]["complaint_quality"] = exec_res.get("complaint_quality")
        
        if exec_res.get("has_been_summarized"):
            return "reject"
        
        print(f"🔍 DATA EXTRACTION NODE: task_metadata = {shared['task_metadata']}")
        if exec_res.get("complaint_topic") and exec_res.get("complaint_location") and exec_res.get("complaint_summary") and exec_res.get("complaint_quality") > complaint_threshold:
            print("🔍 DATA EXTRACTION NODE: All fields complete - returning 'end'")
            return "summarize"
        else:
            print("🔍 DATA EXTRACTION NODE: Some fields missing - returning 'continue'")
            return 'continue'


class HTTPGenerateNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
            "complaint_quality": shared.get("task_metadata", {}).get("complaint_quality", 0),
            "queue": shared.get("message_queue")
        }
        return inputs
    async def exec_async(self, inputs):
        
        queue = inputs.get("queue")
        
        missing_fields = [key for key, value in inputs.items() if key in ['complaint_topic', 'complaint_location', 'complaint_summary'] and not value]
        
        
        prompt = f"""
            You are a helpful assistant that is trying to understand a citizen complaint by asking a single question
            
            Past conversation history: {inputs['conversation_history']}

            Missing Data: {', '.join(missing_fields)}
            Complaint Quality: {inputs.get("complaint_quality", 0)}

            If the complaint quality is 3 or below, you want the user to provide more information. The question should probe the user to provide more information and details to improve the clarity of the complaint.

            Suggest the next clarifying question to better understand the complaint and to get the data I want. Only output the question.
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
        return {
            "conversation_history": shared["conversation_history"],
            "queue": shared.get("message_queue")
        }
    async def exec_async(self, inputs):
        prompt = f"""
            You are summarizing a citizen complaint conversation for processing by a government agency.

            Conversation history:
            {inputs["conversation_history"]}

            Write a short, clear summary of the complaint as a single paragraph. Start the parapgraph with: Your complaint has been logged!
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
        queue = shared.get("message_queue")
        return {"queue": queue}
    
    async def exec_async(self, inputs):        
        # Response text
        response_text = "This complaint thread has ended. Create a new chat if you want to start anther complaint!"
        
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