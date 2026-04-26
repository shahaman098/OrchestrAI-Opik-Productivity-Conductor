const llmService = require('../services/llmService');

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

module.exports = async (req, res) => {
    setCors(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const { hypothesis, budgetLimit, timelineWeeks, evidenceMode } = body;

        if (!hypothesis) {
            return res.status(400).json({ error: 'Missing required field: hypothesis' });
        }

        const result = await llmService.orchestrate({
            hypothesis,
            budgetLimit: Number(budgetLimit) || 2500,
            timelineWeeks: Number(timelineWeeks) || 6,
            evidenceMode: evidenceMode || 'balanced',
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Orchestration failed (Vercel API):', error);
        return res.status(500).json({ error: 'Orchestration failed internally.' });
    }
};
