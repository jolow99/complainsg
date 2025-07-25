# flow.py
from pocketflow import Flow
from nodes import (
    ReceiveComplaintNode,
    GenerateFollowUpNode,
    CollectAnswerNode,
    DecideFollowUpNode,
    SummarizerNode,
    StreamNode,
    TestNode,
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
    
    

def create_stream_flow():
    stream = StreamNode()
    return Flow(start=stream)