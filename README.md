# ComplainSG

A conversational assistant for collecting, clarifying, and summarizing citizen complaints, powered by LLMs and [pocketflow](https://github.com/jolow/pocketflow).

## Features

- **Interactive Complaint Intake:** Guides users to describe their complaint.
- **Automated Clarification:** Uses an LLM to suggest follow-up questions for missing details.
- **Iterative Q&A:** Collects answers and continues until enough information is gathered.
- **Summary Generation:** Produces a clear, single-paragraph summary for processing.

## How It Works

1. **User describes a complaint.**
2. **The assistant asks clarifying questions** (generated by an LLM).
3. **User answers each question** until the assistant determines the complaint is “complete.”
4. **A summary is generated** for the final submission.

## Setup (CLI)

1. **Clone the repository** and install dependencies:
   uv pip install -r pyproject.toml && cd frontend && npm install 
   

2. **Set up API key:**

   - Create a `.env` file in the project root:
     ```
     ANTHROPIC_API_KEY=your_api_key_here
     QWEN_30B=your_api_key_here
     QWEN_THINKING=your_api_key_here
     ```
   - Or set the environment variable directly.

3. **Run the app:**
    fastapi run dev (backend)

    cd frontend && npm run dev


4. (Alterantively) *Run the CLI version**

   ```sh
   uv run main.py
   ```

   Or:

   ```sh
   python main.py
   ```

   for streaming use

   ```sh
   python main.py --stream
   ```


## Requirements

- Python 3.11+
- [Anthropic API key](https://console.anthropic.com/)
- Internet connection

## Project Structure

- `main.py` — Entry point; runs the complaint flow.
- `flow.py` — Defines the flow of nodes (steps).
- `nodes.py` — Logic for each step: intake, follow-up, decision, summary.
- `utils.py` — LLM call utility.
- `pyproject.toml` — Dependencies.

## License

MIT

## 4 ryan

source agent-venv/bin/activate
uv pip install -r pyproject.toml
