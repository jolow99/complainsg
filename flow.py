# flow.py
from pocketflow import Flow, AsyncFlow
from nodes import (
    ReceiveComplaintNode,
    GenerateFollowUpNode,
    CollectAnswerNode,
    DecideFollowUpNode,
    SummarizerNode,
    TestNode,
    GenerateFollowUpAsyncNode,
    DecisionNode,
    EntryNode,
    AwaitAnswerNode,
    AsyncSummarizerNode,
)

def create_complaint_flow():
    receive = ReceiveComplaintNode()
    generate = GenerateFollowUpNode()
    collect = CollectAnswerNode()
    decide = DecideFollowUpNode()
    summary = SummarizerNode()

    # Define transitions
    receive >> generate
    generate >> collect
    collect >> decide
    decide - "continue" >> generate
    decide - "complete" >> summary

    return Flow(start=receive)

def basic_flow():
    test = TestNode()
    return Flow(start=test)
    
    

def create_streaming_chat_flow():
    entry = EntryNode()
    await_answer = AwaitAnswerNode()
    decision = DecisionNode()
    generate = GenerateFollowUpAsyncNode()
    summarizer = AsyncSummarizerNode()
    
    entry >> generate
    generate >> await_answer
    await_answer >> decision
    decision - "continue" >> generate
    decision - "complete" >> summarizer
            
    # should be entry (recieve) to generate (send) to await (receive) to decision (think) to generate(send)/summarise(send)
    
    return AsyncFlow(start=entry)