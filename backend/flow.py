from pocketflow import AsyncFlow

from nodes import (
    HTTPGenerateNodeAsync,
    HTTPDataExtractionNodeAsync,
    HTTPSummarizerNodeAsync,
    HTTPRejectionNodeAsync
)
    
def generate_or_summarize_flow():
    generate = HTTPGenerateNodeAsync()
    extraction = HTTPDataExtractionNodeAsync()
    summarizer = HTTPSummarizerNodeAsync()
    rejection = HTTPRejectionNodeAsync()
    
    extraction - 'continue' >> generate
    extraction - 'end' >> summarizer

    return AsyncFlow(start=extraction)