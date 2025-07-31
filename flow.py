# flow.py
from pocketflow import Flow, AsyncFlow
from nodes import (
    EntryNodeAsync,
    GenerateFollowUpNodeAsync,
    AwaitAnswerNodeAsync,
    DecisionNodeAsync,
    SummarizerNodeAsync,
)
    
    

def create_streaming_chat_flow():
    entry = EntryNodeAsync()
    await_answer = AwaitAnswerNodeAsync()
    decision = DecisionNodeAsync()
    generate = GenerateFollowUpNodeAsync()
    summarizer = SummarizerNodeAsync()
    
    entry >> generate
    generate >> await_answer
    await_answer >> decision
    decision - "continue" >> generate
    decision - "complete" >> summarizer
            
    # should be entry (recieve) to generate (send) to await (receive) to decision (think) to generate(send)/summarise(send)
    
    return AsyncFlow(start=entry)