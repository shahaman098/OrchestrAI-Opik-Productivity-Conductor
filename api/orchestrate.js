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
        const { goals, availableHours, energyLevel, strategy } = body;

        if (!goals || !availableHours) {
            return res.status(400).json({ error: 'Missing required fields: goals, availableHours' });
        }

        const result = await llmService.orchestrate({
            goals,
            availableHours: Number(availableHours),
            energyLevel: energyLevel || 'medium',
            strategy: strategy || 'balanced',
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Orchestration failed (Vercel API):', error);
        return res.status(500).json({ error: 'Orchestration failed internally.' });
    }
};

