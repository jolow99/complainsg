# main.py
from flow import create_complaint_flow
from dotenv import load_dotenv

def main():
    shared = {
        "complaint": "",
        "follow_ups": [],
        "status": "incomplete"
    }

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
    main()
