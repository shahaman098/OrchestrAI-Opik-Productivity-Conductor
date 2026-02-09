const express = require('express');
const llmService = require('./services/llmService');
const voiceService = require('./services/voiceService');

const app = express();
const port = 5000;

app.use(express.json());

// Enable CORS manually
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// POST /api/orchestrate
// Main endpoint: chains all 5 AI agents to build an optimized daily schedule
app.post('/api/orchestrate', async (req, res) => {
    const { goals, availableHours, energyLevel, strategy } = req.body;
    console.log(`Orchestration Request: ${availableHours}h, energy=${energyLevel}, strategy=${strategy}`);
    console.log(`Goals: ${goals?.substring(0, 100)}...`);

    if (!goals || !availableHours) {
        return res.status(400).json({ error: "Missing required fields: goals, availableHours" });
    }

    try {
        const result = await llmService.orchestrate({
            goals,
            availableHours: Number(availableHours),
            energyLevel: energyLevel || 'medium',
            strategy: strategy || 'balanced'
        });

        res.json(result);
    } catch (error) {
        console.error("Orchestration failed:", error);
        res.status(500).json({ error: "Orchestration failed internally." });
    }
});

// POST /api/commit
// Simulates "committing" to the schedule (calendar sync simulation)
app.post('/api/commit', async (req, res) => {
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
        return res.status(400).json({ error: "Invalid schedule format. Expected an array of tasks." });
    }

    const audit_log = [];
    const commitments = [];

    for (const task of schedule) {
        // Simulate a calendar API call
        const delay = Math.floor(Math.random() * 300) + 100;
        await new Promise(resolve => setTimeout(resolve, delay));

        const commitId = `TASK-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        audit_log.push(`Scheduling "${task.name}" at ${task.startTime || 'TBD'}... Success. Commitment #${commitId}.`);

        commitments.push({
            commitId,
            name: task.name,
            timeBlock: task.timeBlock,
            startTime: task.startTime,
            estimatedMinutes: task.estimatedMinutes,
            priority: task.priority,
        });
    }

    audit_log.push(`All ${schedule.length} tasks committed to your schedule.`);

    res.json({
        status: "complete",
        orders: commitments,
        audit_log
    });
});

// POST /api/speak
// Generate a voice report for schedule summary
app.post('/api/speak', async (req, res) => {
    const { focusScore, taskCount, totalMinutes } = req.body;
    console.log("Speak request:", { focusScore, taskCount, totalMinutes });

    if (taskCount === undefined || totalMinutes === undefined) {
        return res.status(400).json({ error: "Missing required fields for voice report." });
    }

    try {
        const audioResult = await voiceService.generateVoiceReport({ focusScore, taskCount, totalMinutes });

        if (audioResult.audio) {
            res.set('Content-Type', 'audio/mpeg');
            res.send(audioResult.audio);
        } else {
            res.status(200).json({ message: "Voice generated (fallback)", text: audioResult.text, fallback: true });
        }
    } catch (error) {
        console.error("Voice generation error:", error);
        res.status(500).json({ error: "Internal server error during voice generation." });
    }
});

app.listen(port, () => {
    console.log(`OrchestrAI Productivity Server listening at http://localhost:${port}`);
});
