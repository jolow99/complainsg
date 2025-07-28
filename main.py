# main.py
from flow import basic_flow, create_streaming_chat_flow
from flow import create_complaint_flow
from dotenv import load_dotenv
import argparse

def main(stream: bool = False, basic: bool = False):
    shared = {
        "complaint": "",
        "follow_ups": [],
        "status": "incomplete",
        "user_message": "when is singapore independence day?",
        "llm_output": ""
    }

    if stream:
        flow = create_streaming_chat_flow()
        print("Running stream flow...")
        print("📝 Prompt:", "what is the capital of italy?")
        flow.run(shared)    
        
    elif basic:
        flow = basic_flow()
        print("Running basic flow...")
        flow.run(shared)
        print(shared["llm_output"])
        
    else:   
        flow = create_complaint_flow()
        flow.run(shared)
        print("\n✅ Complaint submission complete.")
        print("📝 Complaint:", shared["complaint"])
        print("📋 Clarifying Q&A:")
        for i, qa in enumerate(shared["follow_ups"], 1):
            print(f"  {i}. Q: {qa['question']}\n     A: {qa['answer']}")

        if "final_summary" in shared:
            print("\n🧾 Final Summary:")
            print(shared["final_summary"])
    

    

if __name__ == "__main__":
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--stream", action="store_true", help="Run the stream flow")
    parser.add_argument("--basic", action="store_true", help="Run the basic flow")
    args = parser.parse_args()
    main(stream=args.stream, basic=args.basic)
