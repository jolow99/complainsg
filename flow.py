# flow.py
from pocketflow import Flow, AsyncFlow
from nodes import (
    ReceiveComplaintNode,
    GenerateFollowUpNode,
    CollectAnswerNode,
    DecideFollowUpNode,
    SummarizerNode,
    TestNode,
    StreamingChatNode,
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
    stream = StreamingChatNode()
    return AsyncFlow(start=stream)