"""
OrchestrAI Evaluation Script
=============================
Uses Opik's evaluate() framework with GEval (LLM-as-judge) metrics
to systematically evaluate the quality of the AI productivity pipeline.

Metrics evaluated:
1. Task Decomposition Quality - Are subtasks concrete and actionable?
2. Priority Accuracy - Does the ranking make logical sense?
3. Schedule Feasibility - Is the schedule realistic given time constraints?

Usage:
    pip install -r requirements.txt
    export OPIK_API_KEY=your_key
    export OPENAI_API_KEY=your_key
    python evaluate.py
"""

import json
import os
import time
import opik
from opik import Opik
from opik.evaluation import evaluate
from opik.evaluation.metrics import GEval
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Initialize clients
openai_client = OpenAI()
opik_client = Opik(project_name="orchestrai-evaluation")

# ============================================================
# AGENT FUNCTIONS (Python mirror of Node.js agents)
# ============================================================

def call_agent(agent_name, system_prompt, user_prompt):
    """Call OpenAI with structured JSON output."""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000,
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"[{agent_name}] Error: {e}")
        return None


def decompose_goals(goals):
    system_prompt = """You are the DECOMPOSER agent. Break down user goals into concrete, actionable tasks.
    Return JSON: { "tasks": [{ "id": 1, "name": "Task", "description": "context", "category": "work", "fromGoal": "goal" }], "summary": "brief summary" }"""
    return call_agent("DECOMPOSER", system_prompt,
        f"Break down these goals into specific tasks:\n\n{goals}\n\nReturn JSON.")


def prioritize_tasks(tasks, strategy):
    system_prompt = """You are the PRIORITIZER agent. Rank tasks by urgency and importance.
    Return JSON: { "tasks": [{ ...task, "urgency": 8, "importance": 9, "priority": "critical", "priorityScore": 17 }], "reasoning": "explanation" }"""
    return call_agent("PRIORITIZER", system_prompt,
        f"Prioritize these tasks using strategy '{strategy}':\n{json.dumps(tasks)}\nReturn JSON.")


def estimate_time(tasks, available_hours, energy_level):
    system_prompt = """You are the ESTIMATOR agent. Estimate time for each task in minutes (15-240).
    Return JSON: { "tasks": [{ ...task, "estimatedMinutes": 60, "energyRequired": "high" }], "totalMinutes": 180, "reasoning": "explanation" }"""
    return call_agent("ESTIMATOR", system_prompt,
        f"Estimate time. Available: {available_hours}h, energy: {energy_level}.\nTasks:\n{json.dumps(tasks)}\nReturn JSON.")


def build_schedule(tasks, available_hours, energy_level, strategy):
    system_prompt = """You are the SCHEDULER agent. Create time-blocked schedule (morning/afternoon/evening).
    Return JSON: { "schedule": [{ ...task, "timeBlock": "morning", "startTime": "09:00", "overflow": false }], "totalScheduledMinutes": 180, "reasoning": "explanation" }"""
    return call_agent("SCHEDULER", system_prompt,
        f"Build schedule. Hours: {available_hours}, energy: {energy_level}, strategy: {strategy}.\nTasks:\n{json.dumps(tasks)}\nReturn JSON.")


def run_full_pipeline(goals, available_hours, energy_level, strategy):
    """Run the full 5-agent pipeline and return all intermediate + final results."""
    # Agent 1: Decompose
    decomposed = decompose_goals(goals)
    if not decomposed or "tasks" not in decomposed:
        return {"error": "Decomposition failed"}

    # Agent 2: Prioritize
    prioritized = prioritize_tasks(decomposed["tasks"], strategy)
    if not prioritized or "tasks" not in prioritized:
        return {"error": "Prioritization failed", "decomposed": decomposed}

    # Agent 3: Estimate
    estimated = estimate_time(prioritized["tasks"], available_hours, energy_level)
    if not estimated or "tasks" not in estimated:
        return {"error": "Estimation failed", "decomposed": decomposed, "prioritized": prioritized}

    # Agent 4: Schedule
    scheduled = build_schedule(estimated["tasks"], available_hours, energy_level, strategy)
    if not scheduled or "schedule" not in scheduled:
        return {"error": "Scheduling failed", "decomposed": decomposed, "prioritized": prioritized, "estimated": estimated}

    return {
        "decomposed": decomposed,
        "prioritized": prioritized,
        "estimated": estimated,
        "scheduled": scheduled,
        "schedule": scheduled["schedule"],
        "totalMinutes": scheduled.get("totalScheduledMinutes", 0),
    }


# ============================================================
# EVALUATION METRICS (LLM-as-Judge via GEval)
# ============================================================

# Metric 1: Task Decomposition Quality
decomposition_quality = GEval(
    name="Decomposition Quality",
    criteria="""Evaluate whether the task decomposition is high quality:
    1. Are the tasks specific and actionable (not vague)?
    2. Do they logically follow from the original goals?
    3. Is each task completable in a single sitting?
    4. Are the categories assigned correctly?
    Score 1-5 where 5 = excellent decomposition.""",
    evaluation_steps=[
        "Check if each task is specific enough to start immediately",
        "Verify tasks map back to the original goals",
        "Confirm tasks are reasonably scoped (not too big or trivial)",
        "Check category assignments make sense",
    ],
    model="gpt-4o-mini",
)

# Metric 2: Priority Accuracy
priority_accuracy = GEval(
    name="Priority Accuracy",
    criteria="""Evaluate whether the priority ranking is logical and useful:
    1. Are urgent/important tasks ranked highest?
    2. Does the priority assignment (critical/high/medium/low) make sense?
    3. Is the ordering reasonable given the user's strategy?
    4. Would a human agree with this ranking?
    Score 1-5 where 5 = perfect prioritization.""",
    evaluation_steps=[
        "Check if critical tasks are truly critical",
        "Verify high-priority items should be done before low-priority ones",
        "Confirm the strategy (balanced vs deep_focus) is reflected in ranking",
        "Assess overall ordering quality",
    ],
    model="gpt-4o-mini",
)

# Metric 3: Schedule Feasibility
schedule_feasibility = GEval(
    name="Schedule Feasibility",
    criteria="""Evaluate whether the generated schedule is realistic and feasible:
    1. Does total scheduled time fit within available hours?
    2. Are high-energy tasks placed in morning when energy is highest?
    3. Are time estimates reasonable for each task?
    4. Is there a logical flow (no jarring context switches)?
    5. Are start times properly sequenced within each time block?
    Score 1-5 where 5 = perfectly feasible schedule.""",
    evaluation_steps=[
        "Check total minutes vs available hours",
        "Verify energy-matching (hard tasks in morning)",
        "Confirm time estimates are realistic",
        "Check for good task flow and transitions",
    ],
    model="gpt-4o-mini",
)


# ============================================================
# EVALUATION TASK FUNCTION
# ============================================================

def evaluation_task(dataset_item):
    """Run the pipeline for a single test case and return results for evaluation."""
    result = run_full_pipeline(
        goals=dataset_item["goals"],
        available_hours=dataset_item["availableHours"],
        energy_level=dataset_item["energyLevel"],
        strategy=dataset_item["strategy"],
    )

    # Format output for GEval
    decomposed_text = json.dumps(result.get("decomposed", {}), indent=2)
    prioritized_text = json.dumps(result.get("prioritized", {}), indent=2)
    scheduled_text = json.dumps(result.get("scheduled", {}), indent=2)

    return {
        "input": f"Goals: {dataset_item['goals']}\nAvailable Hours: {dataset_item['availableHours']}\nEnergy: {dataset_item['energyLevel']}\nStrategy: {dataset_item['strategy']}",
        "output": f"DECOMPOSITION:\n{decomposed_text}\n\nPRIORITIZATION:\n{prioritized_text}\n\nSCHEDULE:\n{scheduled_text}",
        "context": [f"Test scenario: {dataset_item.get('description', 'N/A')}"],
    }


# ============================================================
# MAIN: RUN EVALUATION
# ============================================================

def main():
    print("=" * 60)
    print("OrchestrAI Evaluation Pipeline")
    print("Using Opik + GEval (LLM-as-Judge)")
    print("=" * 60)

    # Load test dataset
    dataset_path = os.path.join(os.path.dirname(__file__), "dataset.json")
    with open(dataset_path) as f:
        test_cases = json.load(f)

    print(f"\nLoaded {len(test_cases)} test scenarios")

    # Create Opik dataset
    dataset_name = f"orchestrai-eval-{int(time.time())}"
    dataset = opik_client.get_or_create_dataset(name=dataset_name)

    # Insert test cases
    for tc in test_cases:
        dataset.insert([{
            "input": f"Goals: {tc['goals']}\nHours: {tc['availableHours']}\nEnergy: {tc['energyLevel']}\nStrategy: {tc['strategy']}",
            "expected_output": f"At least {tc['expected_task_count_min']} tasks with priorities",
            "metadata": {
                "test_id": tc["id"],
                "description": tc["description"],
            }
        }])

    print(f"Created Opik dataset: {dataset_name}")

    # Run evaluation
    print("\nRunning evaluation with 3 GEval metrics...")
    print("  - Decomposition Quality")
    print("  - Priority Accuracy")
    print("  - Schedule Feasibility")
    print()

    results = evaluate(
        experiment_name=f"orchestrai-pipeline-eval-{int(time.time())}",
        dataset=dataset,
        task=evaluation_task,
        scoring_metrics=[
            decomposition_quality,
            priority_accuracy,
            schedule_feasibility,
        ],
    )

    print("\n" + "=" * 60)
    print("EVALUATION COMPLETE")
    print("=" * 60)
    print(f"\nResults available in Opik dashboard.")
    print("Visit: https://www.comet.com/opik to view traces, metrics, and experiments.")
    print(f"\nDataset: {dataset_name}")


if __name__ == "__main__":
    main()
