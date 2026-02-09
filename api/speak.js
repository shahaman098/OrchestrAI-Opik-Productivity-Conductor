const voiceService = require('../services/voiceService');

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
        const { focusScore, taskCount, totalMinutes } = body;

        if (taskCount === undefined || totalMinutes === undefined) {
            return res.status(400).json({ error: 'Missing required fields for voice report.' });
        }

        const audioResult = await voiceService.generateVoiceReport({
            focusScore,
            taskCount,
            totalMinutes,
        });

        if (audioResult.audio) {
            res.setHeader('Content-Type', 'audio/mpeg');
            return res.status(200).send(audioResult.audio);
        }

        return res.status(200).json({
            message: 'Voice generated (fallback)',
            text: audioResult.text,
            fallback: true,
        });
    } catch (error) {
        console.error('Voice generation error (Vercel API):', error);
        return res.status(500).json({ error: 'Internal server error during voice generation.' });
    }
};

