const { Opik } = require('opik');
require('dotenv').config();

let geminiClientPromise = null;

async function getGeminiClient() {
    if (!geminiClientPromise) {
        geminiClientPromise = (async () => {
            if (!process.env.GEMINI_API_KEY) {
                console.warn('GEMINI_API_KEY is missing. LLM calls will use fallback simulation.');
                return null;
            }
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const genAI = new GoogleGenAI({
                    apiKey: process.env.GEMINI_API_KEY,
                });
                console.log('Gemini client initialized.');
                return genAI;
            } catch (e) {
                console.warn('Failed to initialize Gemini client:', e.message);
                return null;
            }
        })();
    }
    return geminiClientPromise;
}

const { GoogleGenAI } = {};

// --- Opik Setup ---
let opikClient;
try {
    opikClient = new Opik({
        projectName: 'orchestrai-productivity',
    });
    console.log('Opik client initialized for project: orchestrai-productivity');
} catch (e) {
    console.warn('Failed to initialize Opik client:', e.message);
}

// Helper to call LLM with structured JSON output (Gemini)
async function callAgent(agentName, systemPrompt, userPrompt, parentTrace) {
    const genAI = await getGeminiClient();
    if (!genAI) {
        return null;
    }

    let span = null;
    if (opikClient) {
        try {
            span = opikClient.trace({
                name: `agent-${agentName.toLowerCase()}`,
                input: { systemPrompt, userPrompt },
                parent: parentTrace || undefined,
            });
        } catch (e) {
            console.warn(`[${agentName}] Could not create Opik span:`, e.message);
        }
    }

    try {
        const model = await genAI.models.getGenerativeModel({
            model: 'gemini-2.0-flash-001',
        });

        const response = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text:
                                systemPrompt +
                                '\n\n---\n\n' +
                                userPrompt +
                                '\n\nReturn only valid JSON. Do not include any extra text.',
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
                responseMimeType: 'application/json',
            },
        });

        const text = response.response.text().trim();
        const parsed = JSON.parse(text);

        if (span) {
            try {
                span.update({ output: parsed, metadata: { agentName } });
                span.end();
            } catch (e) {
                console.warn(`[${agentName}] Could not finish Opik span:`, e.message);
            }
        }

        return parsed;
    } catch (error) {
        console.error(`[${agentName}] LLM Error:`, error.message);
        if (span) {
            try {
                span.update({ error: error.message });
                span.end();
            } catch {
                // ignore
            }
        }
        return null;
    }
}

// ============================================================
// AGENT 1: TASK DECOMPOSER
// Breaks down user goals into concrete actionable tasks
// ============================================================
const DECOMPOSER_PROMPT = `You are the DECOMPOSER agent in a productivity AI system. Your job is to break down user goals into concrete, actionable tasks.

Rules:
- Each task should be specific and completable in one sitting
- Include a short description for context
- Assign a category: "work", "health", "personal", "learning", "errands"
- Return valid JSON

Return format:
{
  "tasks": [
    { "id": 1, "name": "Task name", "description": "Brief context", "category": "work", "fromGoal": "Original goal text" }
  ],
  "summary": "Brief summary of decomposition"
}`;

async function decomposeGoals(goals, parentTrace) {
    const userPrompt = `Break down these goals into specific actionable tasks:\n\n${goals}\n\nReturn a JSON object with a "tasks" array and a "summary" string.`;

    const result = await callAgent('DECOMPOSER', DECOMPOSER_PROMPT, userPrompt, parentTrace);

    if (result && result.tasks) return result;

    // Fallback: simple parsing
    const lines = goals.split(/[,\n]+/).map(g => g.trim()).filter(Boolean);
    return {
        tasks: lines.map((goal, i) => ({
            id: i + 1,
            name: goal,
            description: `Complete: ${goal}`,
            category: 'work',
            fromGoal: goal
        })),
        summary: `Decomposed ${lines.length} goals into ${lines.length} tasks.`
    };
}

// ============================================================
// AGENT 2: PRIORITY RANKER
// Scores and ranks tasks by urgency and importance
// ============================================================
const PRIORITIZER_PROMPT = `You are the PRIORITIZER agent. Rank tasks by importance and urgency using the Eisenhower Matrix approach.

Rules:
- Score each task 1-10 for urgency and 1-10 for importance
- Assign priority: "critical", "high", "medium", "low"
- Sort by combined score (urgency + importance) descending
- Return valid JSON

Return format:
{
  "tasks": [
    { "id": 1, "name": "Task name", "description": "Brief context", "category": "work", "fromGoal": "goal", "urgency": 8, "importance": 9, "priority": "critical", "priorityScore": 17 }
  ],
  "reasoning": "Brief explanation of priority logic"
}`;

async function prioritizeTasks(tasks, strategy, parentTrace) {
    const userPrompt = `Prioritize these tasks using strategy: "${strategy}".\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n\nReturn JSON with scored and sorted tasks plus reasoning.`;

    const result = await callAgent('PRIORITIZER', PRIORITIZER_PROMPT, userPrompt, parentTrace);

    if (result && result.tasks) return result;

    // Fallback: assign scores deterministically
    const scored = tasks.map((task, i) => ({
        ...task,
        urgency: Math.max(1, 10 - i),
        importance: Math.max(1, 10 - i),
        priority: i === 0 ? 'critical' : i < 3 ? 'high' : 'medium',
        priorityScore: Math.max(2, 20 - i * 2)
    }));
    scored.sort((a, b) => b.priorityScore - a.priorityScore);
    return { tasks: scored, reasoning: 'Prioritized by input order (fallback mode).' };
}

// ============================================================
// AGENT 3: TIME ESTIMATOR
// Estimates time needed for each task
// ============================================================
const ESTIMATOR_PROMPT = `You are the ESTIMATOR agent. Estimate how long each task will take to complete.

Rules:
- Estimate in minutes (minimum 15, maximum 240)
- Consider task complexity and category
- Be realistic - most tasks take 30-90 minutes
- Add an "energyRequired" field: "low", "medium", "high"
- Return valid JSON

Return format:
{
  "tasks": [
    { "id": 1, "name": "Task", "description": "desc", "category": "work", "fromGoal": "goal", "urgency": 8, "importance": 9, "priority": "critical", "priorityScore": 17, "estimatedMinutes": 60, "energyRequired": "high" }
  ],
  "totalMinutes": 180,
  "reasoning": "Brief explanation"
}`;

async function estimateTime(tasks, availableHours, energyLevel, parentTrace) {
    const userPrompt = `Estimate time for these tasks. User has ${availableHours} hours available and energy level is "${energyLevel}".\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n\nReturn JSON with time estimates.`;

    const result = await callAgent('ESTIMATOR', ESTIMATOR_PROMPT, userPrompt, parentTrace);

    if (result && result.tasks) return result;

    // Fallback
    let totalMinutes = 0;
    const estimated = tasks.map(task => {
        const mins = task.priority === 'critical' ? 90 : task.priority === 'high' ? 60 : 45;
        totalMinutes += mins;
        return {
            ...task,
            estimatedMinutes: mins,
            energyRequired: task.priority === 'critical' ? 'high' : task.priority === 'high' ? 'medium' : 'low'
        };
    });
    return { tasks: estimated, totalMinutes, reasoning: 'Estimated based on priority levels (fallback mode).' };
}

// ============================================================
// AGENT 4: SCHEDULE BUILDER
// Creates an optimized time-blocked schedule
// ============================================================
const SCHEDULER_PROMPT = `You are the SCHEDULER agent. Create an optimized daily schedule from prioritized tasks.

Rules:
- Assign each task to a time block: "morning" (8am-12pm), "afternoon" (12pm-5pm), "evening" (5pm-9pm)
- High-energy tasks go in the morning when energy is highest
- Include short breaks between intensive tasks
- Add a "startTime" in HH:MM format
- Respect the available hours constraint
- If tasks exceed available time, mark overflow tasks with "overflow": true
- Return valid JSON

Return format:
{
  "schedule": [
    { "id": 1, "name": "Task", "description": "desc", "category": "work", "priority": "critical", "estimatedMinutes": 60, "energyRequired": "high", "timeBlock": "morning", "startTime": "09:00", "overflow": false }
  ],
  "totalScheduledMinutes": 180,
  "overflowMinutes": 0,
  "reasoning": "Brief explanation of scheduling logic"
}`;

async function buildSchedule(tasks, availableHours, energyLevel, strategy, parentTrace) {
    const userPrompt = `Build an optimized daily schedule. Available hours: ${availableHours}. Energy level: "${energyLevel}". Strategy: "${strategy}".\n\nTasks:\n${JSON.stringify(tasks, null, 2)}\n\nReturn JSON with scheduled tasks.`;

    const result = await callAgent('SCHEDULER', SCHEDULER_PROMPT, userPrompt, parentTrace);

    if (result && result.schedule) return result;

    // Fallback: assign time blocks sequentially
    const blocks = ['morning', 'afternoon', 'evening'];
    const blockStartTimes = { morning: 9, afternoon: 13, evening: 17 };
    let currentBlock = 0;
    let minutesInBlock = 0;
    let totalScheduled = 0;
    const maxMinutes = availableHours * 60;

    const schedule = tasks.map((task, i) => {
        const mins = task.estimatedMinutes || 45;
        if (minutesInBlock + mins > 180 && currentBlock < 2) {
            currentBlock++;
            minutesInBlock = 0;
        }
        const block = blocks[Math.min(currentBlock, 2)];
        const hour = blockStartTimes[block] + Math.floor(minutesInBlock / 60);
        const min = minutesInBlock % 60;
        const isOverflow = totalScheduled + mins > maxMinutes;
        minutesInBlock += mins;
        totalScheduled += mins;

        return {
            ...task,
            timeBlock: block,
            startTime: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
            overflow: isOverflow
        };
    });

    return {
        schedule,
        totalScheduledMinutes: totalScheduled,
        overflowMinutes: Math.max(0, totalScheduled - maxMinutes),
        reasoning: 'Schedule built sequentially by priority (fallback mode).'
    };
}

// ============================================================
// AGENT 5: ACCOUNTABILITY COACH
// Provides motivational insights and strategy tips
// ============================================================
const COACH_PROMPT = `You are the COACH agent - an encouraging but honest productivity coach. Provide a brief motivational summary and practical tips.

Rules:
- Be concise but motivating
- Highlight the most impactful task
- Warn about overload if total time exceeds available time
- Suggest one specific productivity technique
- Return valid JSON

Return format:
{
  "message": "Your motivational briefing (2-3 sentences)",
  "topTip": "One specific productivity technique",
  "focusScore": 85,
  "warnings": ["Any schedule warnings"],
  "keyTask": "The single most important task today"
}`;

async function coachMessage(schedule, totalMinutes, availableHours, strategy, parentTrace) {
    const userPrompt = `Provide a coaching briefing for this schedule. Total tasks: ${schedule.length}. Total time: ${totalMinutes} minutes. Available: ${availableHours} hours. Strategy: "${strategy}".\n\nSchedule:\n${JSON.stringify(schedule, null, 2)}\n\nReturn JSON with coaching insights.`;

    const result = await callAgent('COACH', COACH_PROMPT, userPrompt, parentTrace);

    if (result && result.message) return result;

    // Fallback
    const overloaded = totalMinutes > availableHours * 60;
    const topTask = schedule[0]?.name || 'your top priority';
    return {
        message: overloaded
            ? `You have ${schedule.length} tasks but limited time. Focus on "${topTask}" first - that alone will make today a win.`
            : `Great plan! ${schedule.length} tasks across ${availableHours} hours is achievable. Start with "${topTask}" while your energy is fresh.`,
        topTip: strategy === 'deep_focus'
            ? 'Use the Pomodoro technique: 25 min focus + 5 min break.'
            : 'Batch similar tasks together to reduce context switching.',
        focusScore: overloaded ? 60 : 85,
        warnings: overloaded ? ['Schedule exceeds available hours. Consider deferring low-priority tasks.'] : [],
        keyTask: topTask
    };
}

// ============================================================
// MAIN ORCHESTRATION FUNCTION
// Chains all agents with Opik tracing
// ============================================================
async function orchestrate({ goals, availableHours, energyLevel, strategy }) {
    const reasoningLogs = [];
    let parentTrace = null;

    // Create parent Opik trace for the full orchestration
    if (opikClient) {
        try {
            parentTrace = opikClient.trace({
                name: 'orchestrate-productivity',
                input: { goals, availableHours, energyLevel, strategy },
            });
        } catch (e) {
            console.warn('Could not create Opik parent trace:', e.message);
        }
    }

    // --- Agent 1: Decompose ---
    reasoningLogs.push(`[DECOMPOSER]: Analyzing goals and breaking them into actionable tasks...`);
    const decomposed = await decomposeGoals(goals, parentTrace);
    reasoningLogs.push(`[DECOMPOSER]: ${decomposed.summary}`);

    // --- Agent 2: Prioritize ---
    reasoningLogs.push(`[PRIORITIZER]: Scoring tasks by urgency and importance...`);
    const prioritized = await prioritizeTasks(decomposed.tasks, strategy, parentTrace);
    reasoningLogs.push(`[PRIORITIZER]: ${prioritized.reasoning}`);

    // --- Agent 3: Estimate ---
    reasoningLogs.push(`[ESTIMATOR]: Calculating time requirements for each task...`);
    const estimated = await estimateTime(prioritized.tasks, availableHours, energyLevel, parentTrace);
    reasoningLogs.push(`[ESTIMATOR]: ${estimated.reasoning}`);
    reasoningLogs.push(`[ESTIMATOR]: Total estimated time: ${estimated.totalMinutes} minutes (${(estimated.totalMinutes / 60).toFixed(1)} hours)`);

    // --- Agent 4: Schedule ---
    reasoningLogs.push(`[SCHEDULER]: Building optimized time-blocked schedule...`);
    const scheduled = await buildSchedule(estimated.tasks, availableHours, energyLevel, strategy, parentTrace);
    reasoningLogs.push(`[SCHEDULER]: ${scheduled.reasoning}`);

    // --- Agent 5: Coach ---
    reasoningLogs.push(`[COACH]: Generating productivity briefing...`);
    const coaching = await coachMessage(
        scheduled.schedule,
        scheduled.totalScheduledMinutes,
        availableHours,
        strategy,
        parentTrace
    );
    reasoningLogs.push(`[COACH]: ${coaching.message}`);
    if (coaching.warnings.length > 0) {
        coaching.warnings.forEach(w => reasoningLogs.push(`[COACH]: WARNING - ${w}`));
    }

    // Close Opik trace
    if (parentTrace) {
        try {
            parentTrace.update({
                output: {
                    taskCount: scheduled.schedule.length,
                    totalMinutes: scheduled.totalScheduledMinutes,
                    focusScore: coaching.focusScore,
                    strategy
                }
            });
            parentTrace.end();
        } catch (e) {
            console.warn('Could not end Opik trace:', e.message);
        }
    }

    // Flush Opik data
    if (opikClient) {
        try {
            await opikClient.flush();
        } catch (e) {
            console.warn('Opik flush error:', e.message);
        }
    }

    return {
        schedule: scheduled.schedule,
        reasoning: reasoningLogs.join('\n'),
        totalMinutes: scheduled.totalScheduledMinutes,
        overflowMinutes: scheduled.overflowMinutes || 0,
        coaching,
        metrics: {
            goalsProcessed: decomposed.tasks.length,
            tasksScheduled: scheduled.schedule.length,
            focusScore: coaching.focusScore,
            totalMinutes: scheduled.totalScheduledMinutes,
            availableMinutes: availableHours * 60,
        }
    };
}

module.exports = {
    orchestrate,
    decomposeGoals,
    prioritizeTasks,
    estimateTime,
    buildSchedule,
    coachMessage,
    opikClient,
};
