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
// Main endpoint: chains the scientist-planning agents into an experiment package
app.post('/api/orchestrate', async (req, res) => {
    const { hypothesis, budgetLimit, timelineWeeks, evidenceMode } = req.body;
    console.log(`Scientist Request: budget=$${budgetLimit}, timeline=${timelineWeeks}w, evidence=${evidenceMode}`);
    console.log(`Hypothesis: ${hypothesis?.substring(0, 120)}...`);

    if (!hypothesis) {
        return res.status(400).json({ error: 'Missing required field: hypothesis' });
    }

    try {
        const result = await llmService.orchestrate({
            hypothesis,
            budgetLimit: Number(budgetLimit) || 2500,
            timelineWeeks: Number(timelineWeeks) || 6,
            evidenceMode: evidenceMode || 'balanced',
        });

        res.json(result);
    } catch (error) {
        console.error("Orchestration failed:", error);
        res.status(500).json({ error: "Orchestration failed internally." });
    }
});

// POST /api/commit
// Simulates approving the experiment package for lab review
app.post('/api/commit', async (req, res) => {
    const { artifacts, artifactType } = req.body;

    if (!artifacts || !Array.isArray(artifacts)) {
        return res.status(400).json({ error: 'Invalid artifacts format. Expected an array.' });
    }

    const audit_log = [];
    const commitments = [];

    for (const artifact of artifacts) {
        const delay = Math.floor(Math.random() * 300) + 100;
        await new Promise(resolve => setTimeout(resolve, delay));

        const commitId = `PLAN-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const itemName = artifact.name || artifact.item || 'Package item';
        audit_log.push(`Registering "${itemName}" for ${artifactType || 'lab review'}... Success. Handoff #${commitId}.`);

        commitments.push({
            commitId,
            name: itemName,
            phaseWindow: artifact.weekStart && artifact.weekEnd ? `Week ${artifact.weekStart}-${artifact.weekEnd}` : artifactType || 'review',
            estimatedMinutes: artifact.effortHours ? artifact.effortHours * 60 : artifact.estimatedMinutes,
            priority: artifact.priority || 'high',
        });
    }

    audit_log.push(`All ${artifacts.length} items approved for scientist review.`);

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
