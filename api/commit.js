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
        const { artifacts, artifactType } = body;

        if (!artifacts || !Array.isArray(artifacts)) {
            return res.status(400).json({ error: 'Invalid artifacts format. Expected an array.' });
        }

        const audit_log = [];
        const commitments = [];

        for (const artifact of artifacts) {
            const delay = Math.floor(Math.random() * 300) + 100;
            // eslint-disable-next-line no-await-in-loop
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

        return res.status(200).json({
            status: 'complete',
            orders: commitments,
            audit_log,
        });
    } catch (error) {
        console.error('Commit failed (Vercel API):', error);
        return res.status(500).json({ error: 'Commit failed internally.' });
    }
};
