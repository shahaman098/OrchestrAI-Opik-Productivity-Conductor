# OrchestrAI

AI Productivity Orchestrator that uses 5 specialized AI agents to break down your goals, prioritize tasks, estimate time, build an optimized daily schedule, and coach you -- all with full Opik observability and evaluation.

## Ship Your Best Self Hackathon 2026

**Tracks:** Productivity & Work Habits + Best Use of Opik

### Problem

Planning your day effectively is hard. Most people either:
- Spend 30+ minutes manually organizing tasks each morning
- Skip planning entirely and lose hours to context-switching and reactive work
- Use rigid tools that don't adapt to their energy, available time, or priorities

### Solution

OrchestrAI is a multi-agent AI system that orchestrates your entire daily planning workflow in seconds:

1. **Decomposer Agent** -- Breaks vague goals into concrete, actionable tasks
2. **Prioritizer Agent** -- Scores tasks by urgency and importance (Eisenhower Matrix)
3. **Estimator Agent** -- Estimates realistic time requirements per task
4. **Scheduler Agent** -- Builds an optimized time-blocked schedule (Morning/Afternoon/Evening)
5. **Coach Agent** -- Provides motivational insights, productivity tips, and warnings

Each agent is a specialized LLM call with its own system prompt and structured JSON output, chained in a pipeline. Every call is traced by **Opik** for full observability.

### Unique Selling Proposition

Unlike simple to-do apps, OrchestrAI provides true **delegation of the planning process itself**. You describe your goals in natural language, and the AI agent pipeline handles decomposition, prioritization, time estimation, and scheduling -- all in one conversational flow.

## Opik Integration

### Backend Tracing (Node.js)

- **`opik-openai`** wraps every OpenAI API call with automatic tracing
- Hierarchical traces: parent trace per orchestration request, child spans per agent
- Tags and metadata: agent name, strategy, energy level, input/output
- Token usage, latency, and model info captured automatically

### Evaluation Pipeline (Python)

- **10 diverse test scenarios** covering work, personal, wellness, and academic use cases
- **3 GEval metrics** (LLM-as-judge):
  - **Decomposition Quality**: Are tasks specific, actionable, and well-categorized?
  - **Priority Accuracy**: Does the ranking follow logical urgency/importance?
  - **Schedule Feasibility**: Does the schedule fit time constraints with good energy matching?
- **Opik Experiments**: Compare different strategies, models, or prompt versions
- **Opik Dashboards**: View traces, metrics, and evaluation results in the Opik UI

### Running the Evaluation

```bash
cd evaluation
pip install -r requirements.txt
export OPIK_API_KEY=your_opik_key
export OPENAI_API_KEY=your_openai_key
python evaluate.py
```

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** React, Vite, Tailwind CSS
- **AI:** OpenAI API (GPT-4o-mini)
- **Observability:** Opik (Comet) -- tracing, evaluation, experiments
- **Other:** Framer Motion, Lucide React, ElevenLabs (optional voice)

## Project Structure

```
OrchestrAI/
├── server.js                 # Express server with /api/orchestrate endpoint
├── services/
│   ├── llmService.js         # 5 AI agents + Opik tracing + orchestration pipeline
│   └── voiceService.js       # Optional voice summary via ElevenLabs
├── evaluation/
│   ├── evaluate.py           # Opik evaluation script with GEval metrics
│   ├── dataset.json          # 10 test scenarios for evaluation
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main application with schedule UI
│   │   ├── components/
│   │   │   ├── AgentNetwork.jsx    # Pentagon visualization of 5 agents
│   │   │   ├── AgentNeuralLink.jsx # Real-time agent activity header
│   │   │   ├── GamifiedInput.jsx   # Gamified slider inputs
│   │   │   └── MissionDebrief.jsx  # Post-commit debrief modal
│   │   └── utils/
│   │       └── personality.js      # Dynamic personality comments
│   └── ...
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- OpenAI API key
- Opik API key (from [comet.com/opik](https://www.comet.com/opik))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shahaman098/OrchestrAI.git
cd OrchestrAI
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_openai_key
OPIK_API_KEY=your_opik_key
OPIK_URL_OVERRIDE=https://www.comet.com/opik/api
OPIK_WORKSPACE_NAME=your_workspace
```

### Running the Application

1. Start the backend server:
```bash
npm start
```
Server runs at http://localhost:5000

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```
Frontend runs at http://localhost:5173

## API Endpoints

### POST /api/orchestrate
Runs the full 5-agent pipeline to generate an optimized daily schedule.

**Request Body:**
```json
{
  "goals": "Finish report, prepare presentation, go to gym",
  "availableHours": 8,
  "energyLevel": "high",
  "strategy": "balanced"
}
```

**Response:**
```json
{
  "schedule": [...],
  "reasoning": "Agent pipeline logs...",
  "totalMinutes": 360,
  "coaching": { "message": "...", "focusScore": 85, "topTip": "..." },
  "metrics": { "goalsProcessed": 3, "tasksScheduled": 5, "focusScore": 85 }
}
```

### POST /api/commit
Simulates committing the schedule to a calendar.

### POST /api/speak
Generates an audio summary of the schedule (requires ElevenLabs API key).

## Demo Scenario

> "Finish quarterly report, prepare team presentation, review 3 pull requests, go to the gym, read 30 pages"

OrchestrAI automatically:
- Decomposes 5 goals into 5+ actionable tasks
- Prioritizes by urgency and importance
- Estimates time for each task
- Builds a time-blocked schedule (Morning/Afternoon/Evening)
- Provides a coaching briefing with productivity tips

## Team

Built for Ship Your Best Self Hackathon 2026

## License

MIT
