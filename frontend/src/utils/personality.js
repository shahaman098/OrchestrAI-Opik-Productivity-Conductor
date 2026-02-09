// Productivity-themed personality responses
export const getPersonalityComment = (hours, energy, strategy, goals) => {
    const comments = {
        marathon: [
            "12+ hours? That's a serious grind day! Let's make it count.",
            "Marathon mode activated. Pace yourself!",
            "Long day ahead - the agents will optimize every minute.",
        ],
        shortDay: [
            "Short window? Let's focus on what matters most.",
            "Limited time = ruthless prioritization.",
            "Quality over quantity today!",
        ],
        highEnergy: [
            "High energy detected! Let's tackle the hard stuff first.",
            "Peak performance mode - time to crush it!",
            "All systems at maximum capacity!",
        ],
        lowEnergy: [
            "Low energy day? We'll keep it manageable.",
            "Rest is productive too. Let's be strategic.",
            "Smart scheduling for a low-key day.",
        ],
        deepFocus: [
            "Deep focus mode: fewer tasks, deeper work.",
            "Eliminating distractions. Single-tasking activated.",
            "Deep work protocol engaged.",
        ],
        manyGoals: [
            "That's an ambitious list! Let's prioritize ruthlessly.",
            "Lots of goals - the agents will find the optimal path.",
            "Big agenda detected. Time to orchestrate!",
        ],
        balanced: [
            "Balanced day ahead. Let's optimize it!",
            "The agents are ready to build your perfect schedule.",
            "Enter your goals and let the AI orchestra play.",
            "5 agents, 1 mission: your most productive day.",
        ]
    };

    const goalCount = goals ? goals.split(/[,\n]+/).filter(g => g.trim()).length : 0;

    if (hours >= 12) return comments.marathon[Math.floor(Math.random() * comments.marathon.length)];
    if (hours <= 4) return comments.shortDay[Math.floor(Math.random() * comments.shortDay.length)];
    if (energy === 'high') return comments.highEnergy[Math.floor(Math.random() * comments.highEnergy.length)];
    if (energy === 'low') return comments.lowEnergy[Math.floor(Math.random() * comments.lowEnergy.length)];
    if (strategy === 'deep_focus') return comments.deepFocus[Math.floor(Math.random() * comments.deepFocus.length)];
    if (goalCount >= 5) return comments.manyGoals[Math.floor(Math.random() * comments.manyGoals.length)];

    return comments.balanced[Math.floor(Math.random() * comments.balanced.length)];
};

export const getAgentQuip = (agentName) => {
    const quips = {
        DECOMPOSER: [
            "Breaking goals into bite-sized tasks...",
            "Analyzing your objectives...",
            "Decomposition in progress...",
        ],
        PRIORITIZER: [
            "Ranking by urgency and importance...",
            "Applying Eisenhower matrix...",
            "Finding the critical path...",
        ],
        ESTIMATOR: [
            "Calculating time requirements...",
            "Estimating effort levels...",
            "Crunching the numbers...",
        ],
        SCHEDULER: [
            "Building time blocks...",
            "Optimizing your calendar...",
            "Arranging the perfect day...",
        ],
        COACH: [
            "Crafting your productivity brief...",
            "Analyzing schedule quality...",
            "Preparing motivational insights...",
        ]
    };

    return quips[agentName]?.[Math.floor(Math.random() * (quips[agentName]?.length || 1))] || "Processing...";
};

export const getLoadingQuip = () => {
    const quips = [
        "5 AI agents standing by...",
        "Ready to orchestrate your day...",
        "Neural link initialized...",
        "Productivity pipeline ready...",
        "Enter your goals to begin...",
        "Your AI productivity team awaits...",
    ];
    return quips[Math.floor(Math.random() * quips.length)];
};

export const getCheckoutQuip = (focusScore) => {
    if (focusScore >= 90) return "Peak productivity plan! You're going to crush it!";
    if (focusScore >= 75) return "Solid schedule! Well-optimized for your constraints.";
    if (focusScore >= 60) return "Good plan with room to breathe.";
    return "Conservative schedule - sometimes less is more!";
};
