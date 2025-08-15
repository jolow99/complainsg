from pocketflow import AsyncFlow

from nodes import (
    HTTPGenerateNodeAsync,
    HTTPDataExtractionNodeAsync,
    HTTPSummarizerNodeAsync,
)
    
def generate_or_summarize_flow():
    generate = HTTPGenerateNodeAsync()
    extraction = HTTPDataExtractionNodeAsync()
    summarizer = HTTPSummarizerNodeAsync()
    
    extraction - 'continue' >> generate
    extraction - 'end' >> summarizer

    return AsyncFlow(start=extraction)