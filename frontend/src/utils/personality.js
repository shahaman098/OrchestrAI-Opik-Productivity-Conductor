export const getPersonalityComment = (budget, timelineWeeks, evidenceMode, hypothesis) => {
    const hypothesisLength = hypothesis?.trim().length || 0;

    const pools = {
        constrained: [
            'Tight budget. Keep the pilot narrow and the readout clean.',
            'Budget ceiling is low. Optimize for one decisive experiment, not a broad program.',
            'Resource-constrained mode. Prioritize the first falsifiable signal.',
        ],
        ambitious: [
            'Enough room for a real pilot package. Lock the controls before scope expands.',
            'You have budget for a credible prototype. Spend it on signal, not surface area.',
            'This can support a proper pilot if the novelty screen stays disciplined.',
        ],
        shortRun: [
            'Fast timeline. Treat this as a pilot with one decision gate.',
            'Few weeks available. Remove optional endpoints early.',
            'Compressed schedule detected. Fewer variables will help more than better copy.',
        ],
        evidenceHeavy: [
            'Evidence-first mode. Expect the literature gate to drive the whole plan.',
            'Strict QC selected. References and controls carry more weight than novelty language.',
            'Verification mode active. The plan should survive scientist scrutiny, not just demo day.',
        ],
        vague: [
            'The hypothesis still needs sharper boundaries. Controls and thresholds matter.',
            'Broad scientific intent detected. Narrow the claim before you narrow the budget.',
            'Good direction, loose framing. The scoper will need to tighten it.',
        ],
        balanced: [
            'Ready to convert the hypothesis into a runnable pilot package.',
            'Agent stack is primed for literature QC, protocol design, and budget review.',
            'This setup is tuned for challenge 04: hypothesis to experiment plan.',
        ],
    };

    if (budget <= 1500) return pools.constrained[Math.floor(Math.random() * pools.constrained.length)];
    if (timelineWeeks <= 4) return pools.shortRun[Math.floor(Math.random() * pools.shortRun.length)];
    if (evidenceMode === 'strict') return pools.evidenceHeavy[Math.floor(Math.random() * pools.evidenceHeavy.length)];
    if (hypothesisLength < 110) return pools.vague[Math.floor(Math.random() * pools.vague.length)];
    if (budget >= 3000) return pools.ambitious[Math.floor(Math.random() * pools.ambitious.length)];
    return pools.balanced[Math.floor(Math.random() * pools.balanced.length)];
};

export const getLoadingQuip = () => {
    const quips = [
        'Scientist-planning agents standing by...',
        'Ready to score novelty and draft protocol...',
        'Lab handoff pipeline initialized...',
        'Waiting for a testable hypothesis...',
    ];
    return quips[Math.floor(Math.random() * quips.length)];
};

export const getCheckoutQuip = (focusScore) => {
    if (focusScore >= 90) return 'Review-ready package. The next step is verified sourcing.';
    if (focusScore >= 80) return 'Strong pilot plan with manageable execution risk.';
    if (focusScore >= 65) return 'Useful prototype, but the evidence gate still needs work.';
    return 'Concept is viable, but a scientist should tighten scope before procurement.';
};
