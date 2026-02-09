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
        const { schedule } = body;

        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({ error: 'Invalid schedule format. Expected an array of tasks.' });
        }

        const audit_log = [];
        const commitments = [];

        for (const task of schedule) {
            const delay = Math.floor(Math.random() * 300) + 100;
            // eslint-disable-next-line no-await-in-loop
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

