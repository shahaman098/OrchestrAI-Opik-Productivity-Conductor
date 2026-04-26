const { Opik } = require('opik');
require('dotenv').config();

let geminiClientPromise = null;

async function getGeminiClient() {
    if (!geminiClientPromise) {
        geminiClientPromise = (async () => {
            if (!process.env.GEMINI_API_KEY) {
                console.warn('GEMINI_API_KEY is missing. LLM calls will use deterministic fallback mode.');
                return null;
            }

            try {
                const { GoogleGenAI } = await import('@google/genai');
                return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            } catch (error) {
                console.warn('Failed to initialize Gemini client:', error.message);
                return null;
            }
        })();
    }

    return geminiClientPromise;
}

let opikClient;
try {
    opikClient = new Opik({
        projectName: 'orchestrai-scientist',
    });
    console.log('Opik client initialized for project: orchestrai-scientist');
} catch (error) {
    console.warn('Failed to initialize Opik client:', error.message);
}

function safeParseJson(text) {
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] || text.match(/```([\s\S]*?)```/i)?.[1];
        if (fenced) {
            try {
                return JSON.parse(fenced.trim());
            } catch {
                return null;
            }
        }
        return null;
    }
}

function createTrace(name, input, parentTrace) {
    if (!opikClient) return null;

    try {
        return opikClient.trace({
            name,
            input,
            parent: parentTrace || undefined,
        });
    } catch (error) {
        console.warn(`Could not create Opik trace "${name}":`, error.message);
        return null;
    }
}

async function callAgent(agentName, systemPrompt, userPrompt, parentTrace) {
    const genAI = await getGeminiClient();
    if (!genAI) {
        return null;
    }

    const span = createTrace(`agent-${agentName.toLowerCase()}`, { systemPrompt, userPrompt }, parentTrace);

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `${systemPrompt}\n\n---\n\n${userPrompt}\n\nReturn only valid JSON.`,
                        },
                    ],
                },
            ],
            config: {
                temperature: 0.35,
                maxOutputTokens: 1800,
                responseMimeType: 'application/json',
            },
        });

        const text =
            (typeof response.text === 'function' ? response.text() : response.text) ||
            (typeof response.response?.text === 'function' ? response.response.text() : response.response?.text) ||
            '';
        const parsed = safeParseJson(text.trim());

        if (!parsed) {
            throw new Error('LLM returned invalid JSON.');
        }

        if (span) {
            span.update({ output: parsed, metadata: { agentName } });
            span.end();
        }

        return parsed;
    } catch (error) {
        console.error(`[${agentName}] LLM Error:`, error.message);
        if (span) {
            try {
                span.update({ error: error.message });
                span.end();
            } catch {
                // ignore trace cleanup failures
            }
        }
        return null;
    }
}

function inferDomain(hypothesis) {
    const text = hypothesis.toLowerCase();
    if (/(hela|cell|cryoprotect|dmso|microscope|culture)/.test(text)) return 'cell biology';
    if (/(mouse|mice|gut|lactobacillus|fitc|intestinal)/.test(text)) return 'gut health';
    if (/(biosensor|blood|antibody|crp|electrochemical|diagnostic)/.test(text)) return 'diagnostics';
    if (/(co2|cathode|bioelectrochemical|acetate|sporomusa)/.test(text)) return 'climate biotech';
    return 'experimental biology';
}

function dedupeStrings(items) {
    return Array.from(new Set((items || []).filter(Boolean).map(item => String(item).trim()))).filter(Boolean);
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeCurrency(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeWeeks(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function buildObjectives(hypothesis, domain) {
    const clauses = hypothesis
        .split(/[.;]/)
        .map(part => part.trim())
        .filter(Boolean);

    const primary = clauses[0] || hypothesis;
    const secondary = clauses[1] || 'Quantify the effect against an explicit control condition.';

    return [
        {
            id: 'OBJ-1',
            name: 'Novelty screen',
            rationale: `Check whether the ${domain} experiment has already been reported with the same endpoint and threshold.`,
            priority: 'critical',
            fromHypothesis: primary,
        },
        {
            id: 'OBJ-2',
            name: 'Protocol design',
            rationale: `Translate the hypothesis into an executable wet-lab workflow with controls and readouts.`,
            priority: 'critical',
            fromHypothesis: primary,
        },
        {
            id: 'OBJ-3',
            name: 'Materials and sourcing',
            rationale: 'List the minimum reagents, consumables, and instrumentation required to start.',
            priority: 'high',
            fromHypothesis: secondary,
        },
        {
            id: 'OBJ-4',
            name: 'Budget and validation gate',
            rationale: 'Estimate cost, timeline, and the success criteria required before spending lab budget.',
            priority: 'high',
            fromHypothesis: primary,
        },
    ];
}

function fallbackScope(hypothesis, timelineWeeks) {
    const domain = inferDomain(hypothesis);
    return {
        studyProfile: {
            domain,
            modelSystem: domain === 'gut health' ? 'murine model' : domain === 'cell biology' ? 'cell culture' : 'bench assay',
            intervention: hypothesis.split(' ').slice(0, 10).join(' '),
            primaryReadout: domain === 'gut health'
                ? 'intestinal permeability shift'
                : domain === 'cell biology'
                ? 'post-thaw viability'
                : 'primary assay signal versus control',
            targetTimelineWeeks: timelineWeeks,
        },
        objectives: buildObjectives(hypothesis, domain),
        summary: `Scoped a ${domain} experiment into novelty, protocol, sourcing, and validation workstreams.`,
    };
}

function fallbackLiterature(scopeResult, hypothesis) {
    const domain = scopeResult.studyProfile.domain;
    const baseReferences = {
        diagnostics: [
            { title: 'C-reactive protein point-of-care biosensor workflows', source: 'Nature Protocols search target', whyRelevant: 'Closest family of assays for antibody-coated electrochemical CRP detection.' },
            { title: 'Paper-based electrochemical sensor fabrication methods', source: 'Bio-protocol search target', whyRelevant: 'Useful for electrode prep and assay timing assumptions.' },
            { title: 'Whole blood matrix handling for rapid inflammatory markers', source: 'JOVE / protocols.io search target', whyRelevant: 'Helps validate sample prep and detection window assumptions.' },
        ],
        'gut health': [
            { title: 'FITC-dextran intestinal permeability assay in C57BL/6 mice', source: 'protocols.io search target', whyRelevant: 'Likely baseline protocol for the proposed readout.' },
            { title: 'Lactobacillus rhamnosus GG dosing studies in murine gut models', source: 'Nature Protocols search target', whyRelevant: 'Supports strain handling, dosing cadence, and control setup.' },
            { title: 'Barrier function validation using serum fluorescence endpoints', source: 'Bio-protocol search target', whyRelevant: 'Relevant for assay thresholds and validation criteria.' },
        ],
        'cell biology': [
            { title: 'Mammalian cryopreservation with DMSO control arms', source: 'ATCC / protocols.io search target', whyRelevant: 'Baseline comparator for post-thaw viability.' },
            { title: 'Trehalose-assisted cryoprotection in cultured cells', source: 'Nature Protocols search target', whyRelevant: 'Useful for formulation and equilibration conditions.' },
            { title: 'Post-thaw viability and recovery assay design', source: 'Thermo Fisher application note search target', whyRelevant: 'Supports viability measurement and acceptance thresholds.' },
        ],
        'climate biotech': [
            { title: 'Bioelectrochemical acetate production with Sporomusa ovata', source: 'Applied microbiology search target', whyRelevant: 'Closest benchmark family for cathode-driven acetate production.' },
            { title: 'Cathode potential calibration in microbial electrosynthesis', source: 'Nature Protocols search target', whyRelevant: 'Supports reactor setup and electrochemical control logic.' },
            { title: 'CO2 fixation yield measurement in MES systems', source: 'JOVE / Bio-protocol search target', whyRelevant: 'Useful for validation metrics and sampling intervals.' },
        ],
        'experimental biology': [
            { title: 'Closest protocol family for the proposed biological assay', source: 'protocols.io search target', whyRelevant: 'Starting point for literature QC and protocol drafting.' },
            { title: 'Comparable validation workflow in peer-reviewed experimental biology', source: 'Nature Protocols search target', whyRelevant: 'Provides control structure and measurement framing.' },
            { title: 'Vendor application note for the core readout instrumentation', source: 'Supplier documentation search target', whyRelevant: 'Useful for realistic materials and runtime assumptions.' },
        ],
    };

    return {
        noveltySignal: 'similar work exists',
        summary: `The hypothesis looks directionally explored in ${domain}, but the exact control threshold and operating constraints still need source verification.`,
        references: baseReferences[domain] || baseReferences['experimental biology'],
        gaps: dedupeStrings([
            'Exact benchmark threshold needs manual verification before ordering reagents.',
            'Control condition definition should be tightened for statistical power planning.',
            hypothesis.length > 160 ? 'Hypothesis includes multiple variables; isolate the primary claim for the first experiment.' : null,
        ]),
        verificationStatus: 'prototype-reference-targets',
    };
}

function fallbackProtocol(scopeResult, literatureResult, budgetLimit, timelineWeeks) {
    const objectives = scopeResult.objectives;
    const phases = [
        {
            id: 'PHASE-1',
            name: 'Literature QC and protocol lock',
            description: 'Validate the novelty signal, capture 1-3 source-backed methods, and freeze the baseline protocol.',
            deliverable: 'Annotated protocol draft with source links and open questions.',
            weekStart: 1,
            weekEnd: 1,
            effortHours: 8,
            priority: 'critical',
        },
        {
            id: 'PHASE-2',
            name: 'Materials sourcing and pilot setup',
            description: 'Order essential reagents, prepare controls, and configure measurement instrumentation.',
            deliverable: 'Bill of materials, vendor shortlist, and pilot-ready setup checklist.',
            weekStart: 1,
            weekEnd: Math.min(2, timelineWeeks),
            effortHours: 10,
            priority: 'critical',
        },
        {
            id: 'PHASE-3',
            name: 'Primary experiment run',
            description: 'Execute the intervention and control arms with the minimum viable sample plan.',
            deliverable: 'Run log with raw readouts and deviation notes.',
            weekStart: Math.min(2, timelineWeeks),
            weekEnd: Math.min(Math.max(3, timelineWeeks - 1), timelineWeeks),
            effortHours: 18,
            priority: 'high',
        },
        {
            id: 'PHASE-4',
            name: 'Validation and decision review',
            description: 'Compare outcomes against success thresholds and decide whether to iterate, scale, or stop.',
            deliverable: 'Go / revise / stop memo with validation summary.',
            weekStart: Math.max(1, timelineWeeks - 1),
            weekEnd: timelineWeeks,
            effortHours: 8,
            priority: 'high',
        },
    ];

    const materials = [
        { item: 'Core assay reagents', supplierType: 'primary supplier', purpose: objectives[1].name, estimatedCostUsd: Math.round(budgetLimit * 0.35) },
        { item: 'Control reagents and consumables', supplierType: 'backup supplier', purpose: 'Controls and repeatability', estimatedCostUsd: Math.round(budgetLimit * 0.2) },
        { item: 'Readout instrumentation time', supplierType: 'shared facility', purpose: scopeResult.studyProfile.primaryReadout, estimatedCostUsd: Math.round(budgetLimit * 0.25) },
        { item: 'Contingency and repeat runs', supplierType: 'reserve', purpose: 'Risk buffer', estimatedCostUsd: Math.round(budgetLimit * 0.1) },
    ];

    return {
        phases,
        materials,
        controls: [
            'Negative control with baseline media / vehicle only',
            'Positive or benchmark control using the current standard method',
            'Technical replicates for the primary readout',
        ],
        validation: {
            primaryReadout: scopeResult.studyProfile.primaryReadout,
            successCriteria: `Hit the stated hypothesis effect while staying within a ${timelineWeeks}-week execution window.`,
            failureSignals: [
                'Control arm variance obscures the effect size.',
                'Materials lead time pushes the experiment outside the target window.',
                'Pilot readout fails to separate intervention from control.',
            ],
            safetyNotes: [
                'Lab-specific biosafety review still required.',
                'Wet-lab SOP approval should happen before ordering restricted reagents.',
            ],
        },
        protocolNotes: literatureResult.gaps,
    };
}

function fallbackBudget(protocolResult, budgetLimit, timelineWeeks) {
    const lineItems = [
        { item: 'Reagents', costUsd: Math.round(budgetLimit * 0.4), rationale: 'Core consumables and assay chemistry.' },
        { item: 'Controls and standards', costUsd: Math.round(budgetLimit * 0.18), rationale: 'Control arms, reference materials, and calibration.' },
        { item: 'Facility / instrument usage', costUsd: Math.round(budgetLimit * 0.22), rationale: 'Shared equipment time for the primary readout.' },
        { item: 'Contingency', costUsd: Math.round(budgetLimit * 0.12), rationale: 'Repeat runs and shipping deltas.' },
    ];

    const totalUsd = lineItems.reduce((sum, item) => sum + item.costUsd, 0);
    const bottlenecks = [];

    if (timelineWeeks <= 4) bottlenecks.push('Tight timeline leaves limited room for reagent delays or failed pilot runs.');
    if (budgetLimit < 2000) bottlenecks.push('Budget ceiling is low for multiple repeats; prioritize one validated readout.');

    return {
        budget: {
            totalUsd,
            lineItems,
            assumptions: [
                'Assumes access to standard shared lab equipment.',
                'Excludes labor overhead and institution-specific indirect costs.',
                'Uses a single pilot cycle before scale-up.',
            ],
        },
        timeline: {
            totalWeeks: timelineWeeks,
            milestones: [
                { name: 'Protocol frozen', week: 1, dependency: 'Literature QC complete' },
                { name: 'Materials received', week: Math.min(2, timelineWeeks), dependency: 'Vendor selection approved' },
                { name: 'Pilot readout complete', week: Math.min(Math.max(3, timelineWeeks - 1), timelineWeeks), dependency: 'Controls prepared' },
                { name: 'Go / revise decision', week: timelineWeeks, dependency: 'Validation review' },
            ],
        },
        feasibility: {
            score: budgetLimit >= totalUsd ? 82 : 64,
            bottlenecks,
            salvagePlan: [
                'Reduce to one primary endpoint for the first pass.',
                'Stage secondary assays behind a successful pilot.',
                'Lock one vendor backup before placing orders.',
            ],
        },
    };
}

function fallbackReview(protocolResult, budgetResult, timelineWeeks) {
    const topPhase = protocolResult.phases[0]?.name || 'Protocol lock';
    const warnings = [];

    if (budgetResult.budget.totalUsd > 2500) {
        warnings.push('Budget is front-loaded. Validate novelty before placing all orders.');
    }
    if (timelineWeeks <= 4) {
        warnings.push('Timeline is aggressive. Keep one readout and one control hierarchy for the first run.');
    }

    return {
        message: `The plan is runnable as a prototype if the literature QC closes the remaining evidence gaps before procurement. Front-load protocol validation, then spend against a short pilot cycle.`,
        topTip: 'Freeze the success criteria before ordering reagents so the team does not expand scope mid-run.',
        focusScore: warnings.length > 0 ? 78 : 88,
        warnings,
        keyTask: topPhase,
        reviewNotes: [
            'The experiment plan is strongest when treated as one pilot and one decision gate.',
            'Budget realism is acceptable for a hackathon demo, but references still need scientist verification.',
            'A reviewer should confirm control selection and sample size assumptions.',
        ],
        goNoGo: warnings.length > 1 ? 'revise' : 'go',
    };
}

function fallbackReflection(scopeResult, literatureResult, protocolResult, budgetResult, reviewResult) {
    return {
        summary: `The agent pipeline produced a coherent experiment package across ${protocolResult.phases.length} phases. The main weakness is literature verification depth, not execution structure.`,
        agentCritiques: {
            SCOPER: `Mapped the hypothesis into ${scopeResult.objectives.length} concrete workstreams with a clear primary readout.`,
            LIT_QC: `Surfaced a defensible novelty signal, but source-backed references still need manual confirmation.`,
            PROTOCOL: `Converted the hypothesis into a workable pilot protocol with controls and deliverables.`,
            BUDGETER: `Built a realistic first-pass budget and milestone timeline for a hackathon prototype.`,
            REVIEWER: `Flagged the right spend and timeline risks before lab handoff.`,
        },
        improvements: [
            'Attach verified citations or DOI-level references before external demo review.',
            'Add sample size rationale and replicate counts per phase.',
            'Capture supplier lead times explicitly for critical reagents.',
        ],
        overallConfidence: Math.round((reviewResult.focusScore + budgetResult.feasibility.score) / 2),
        reflectionNote: literatureResult.verificationStatus === 'prototype-reference-targets'
            ? 'This prototype is presentation-ready, but not procurement-ready without human literature verification.'
            : 'The plan is close to lab-ready once a scientist signs off on the controls.',
    };
}

const SCOPER_PROMPT = `You are the SCOPER agent in a scientific planning system.

Your job is to transform a natural-language scientific hypothesis into a structured study profile.

Return JSON in this shape:
{
  "studyProfile": {
    "domain": "short domain",
    "modelSystem": "organism, cell type, assay, or system",
    "intervention": "main intervention",
    "primaryReadout": "primary measurement",
    "targetTimelineWeeks": 6
  },
  "objectives": [
    {
      "id": "OBJ-1",
      "name": "short objective",
      "rationale": "why this matters",
      "priority": "critical|high|medium",
      "fromHypothesis": "supporting clause"
    }
  ],
  "summary": "2 sentence summary"
}`;

const LITERATURE_PROMPT = `You are the LIT_QC agent.

Your job is to judge whether a scientific hypothesis appears novel, already done, or adjacent to prior work.

Be honest about uncertainty. If you are unsure, say so.

Return JSON in this shape:
{
  "noveltySignal": "not found|similar work exists|exact match found",
  "summary": "2 sentence QC summary",
  "references": [
    {
      "title": "reference or search target",
      "source": "publisher, repository, or search target",
      "whyRelevant": "why it matters"
    }
  ],
  "gaps": ["remaining question 1", "remaining question 2"],
  "verificationStatus": "verified|needs verification"
}`;

const PROTOCOL_PROMPT = `You are the PROTOCOL agent.

Draft a realistic first-pass experiment package for a lab team.

Return JSON in this shape:
{
  "phases": [
    {
      "id": "PHASE-1",
      "name": "phase name",
      "description": "what happens in this phase",
      "deliverable": "what the team should hand off",
      "weekStart": 1,
      "weekEnd": 1,
      "effortHours": 8,
      "priority": "critical|high|medium"
    }
  ],
  "materials": [
    {
      "item": "material name",
      "supplierType": "supplier class",
      "purpose": "why needed",
      "estimatedCostUsd": 120
    }
  ],
  "controls": ["control 1", "control 2"],
  "validation": {
    "primaryReadout": "main readout",
    "successCriteria": "success condition",
    "failureSignals": ["risk 1", "risk 2"],
    "safetyNotes": ["note 1", "note 2"]
  },
  "protocolNotes": ["extra note 1", "extra note 2"]
}`;

const BUDGET_PROMPT = `You are the BUDGETER agent.

Estimate a realistic pilot budget and milestone plan for the proposed experiment.

Return JSON in this shape:
{
  "budget": {
    "totalUsd": 2200,
    "lineItems": [
      { "item": "reagents", "costUsd": 800, "rationale": "why this cost exists" }
    ],
    "assumptions": ["assumption 1", "assumption 2"]
  },
  "timeline": {
    "totalWeeks": 6,
    "milestones": [
      { "name": "milestone", "week": 2, "dependency": "blocked by" }
    ]
  },
  "feasibility": {
    "score": 0,
    "bottlenecks": ["constraint 1"],
    "salvagePlan": ["fallback action 1"]
  }
}`;

const REVIEW_PROMPT = `You are the REVIEWER agent.

Produce an executive review of the experiment package. Focus on whether a real scientist could trust this enough to review, refine, and run.

Return JSON in this shape:
{
  "message": "2-3 sentence summary",
  "topTip": "single highest leverage improvement",
  "focusScore": 85,
  "warnings": ["warning 1", "warning 2"],
  "keyTask": "critical next action",
  "reviewNotes": ["note 1", "note 2"],
  "goNoGo": "go|revise|stop"
}`;

const REFLECTOR_PROMPT = `You are the REFLECTOR agent.

Audit the full scientist-planning pipeline. Be concise and concrete.

Return JSON in this shape:
{
  "summary": "2 sentence summary",
  "agentCritiques": {
    "SCOPER": "one sentence",
    "LIT_QC": "one sentence",
    "PROTOCOL": "one sentence",
    "BUDGETER": "one sentence",
    "REVIEWER": "one sentence"
  },
  "improvements": ["improvement 1", "improvement 2"],
  "overallConfidence": 82,
  "reflectionNote": "single key insight"
}`;

async function scopeHypothesis(hypothesis, timelineWeeks, parentTrace) {
    const prompt = `Hypothesis:\n${hypothesis}\n\nTarget execution window: ${timelineWeeks} weeks.`;
    const result = await callAgent('SCOPER', SCOPER_PROMPT, prompt, parentTrace);
    return result?.studyProfile && Array.isArray(result.objectives) ? result : fallbackScope(hypothesis, timelineWeeks);
}

async function literatureQc(hypothesis, scopeResult, parentTrace) {
    const prompt = `Hypothesis:\n${hypothesis}\n\nStudy profile:\n${JSON.stringify(scopeResult, null, 2)}`;
    const result = await callAgent('LIT_QC', LITERATURE_PROMPT, prompt, parentTrace);
    if (result?.noveltySignal && Array.isArray(result.references)) {
        return {
            ...result,
            references: ensureArray(result.references),
            gaps: ensureArray(result.gaps),
        };
    }
    return fallbackLiterature(scopeResult, hypothesis);
}

async function draftProtocol(hypothesis, scopeResult, literatureResult, budgetLimit, timelineWeeks, parentTrace) {
    const prompt = `Hypothesis:\n${hypothesis}\n\nStudy profile:\n${JSON.stringify(scopeResult, null, 2)}\n\nLiterature QC:\n${JSON.stringify(literatureResult, null, 2)}\n\nBudget ceiling: $${budgetLimit}\nTimeline ceiling: ${timelineWeeks} weeks`;
    const result = await callAgent('PROTOCOL', PROTOCOL_PROMPT, prompt, parentTrace);
    if (result?.phases && Array.isArray(result.materials)) {
        return {
            ...result,
            phases: ensureArray(result.phases),
            materials: ensureArray(result.materials),
            controls: ensureArray(result.controls),
            protocolNotes: ensureArray(result.protocolNotes),
            validation: {
                primaryReadout: result.validation?.primaryReadout || scopeResult.studyProfile.primaryReadout,
                successCriteria: result.validation?.successCriteria || 'Scientist review required before execution.',
                failureSignals: ensureArray(result.validation?.failureSignals),
                safetyNotes: ensureArray(result.validation?.safetyNotes),
            },
        };
    }
    return fallbackProtocol(scopeResult, literatureResult, budgetLimit, timelineWeeks);
}

async function pricePlan(scopeResult, protocolResult, budgetLimit, timelineWeeks, parentTrace) {
    const prompt = `Study profile:\n${JSON.stringify(scopeResult, null, 2)}\n\nProtocol package:\n${JSON.stringify(protocolResult, null, 2)}\n\nBudget ceiling: $${budgetLimit}\nTimeline ceiling: ${timelineWeeks} weeks`;
    const result = await callAgent('BUDGETER', BUDGET_PROMPT, prompt, parentTrace);
    if (result?.budget?.lineItems && result?.timeline?.milestones) {
        return {
            ...result,
            budget: {
                totalUsd: result.budget.totalUsd || budgetLimit,
                lineItems: ensureArray(result.budget.lineItems),
                assumptions: ensureArray(result.budget.assumptions),
            },
            timeline: {
                totalWeeks: result.timeline.totalWeeks || timelineWeeks,
                milestones: ensureArray(result.timeline.milestones),
            },
            feasibility: {
                score: result.feasibility?.score || 70,
                bottlenecks: ensureArray(result.feasibility?.bottlenecks),
                salvagePlan: ensureArray(result.feasibility?.salvagePlan),
            },
        };
    }
    return fallbackBudget(protocolResult, budgetLimit, timelineWeeks);
}

async function reviewPlan(hypothesis, literatureResult, protocolResult, budgetResult, parentTrace) {
    const prompt = `Hypothesis:\n${hypothesis}\n\nLiterature QC:\n${JSON.stringify(literatureResult, null, 2)}\n\nProtocol:\n${JSON.stringify(protocolResult, null, 2)}\n\nBudget and timeline:\n${JSON.stringify(budgetResult, null, 2)}`;
    const result = await callAgent('REVIEWER', REVIEW_PROMPT, prompt, parentTrace);
    if (result?.message) {
        return {
            ...result,
            warnings: ensureArray(result.warnings),
            reviewNotes: ensureArray(result.reviewNotes),
        };
    }
    return fallbackReview(protocolResult, budgetResult, budgetResult.timeline.totalWeeks);
}

async function reflectOnPipeline(scopeResult, literatureResult, protocolResult, budgetResult, reviewResult, parentTrace) {
    const prompt = `SCOPER:\n${JSON.stringify(scopeResult, null, 2)}\n\nLIT_QC:\n${JSON.stringify(literatureResult, null, 2)}\n\nPROTOCOL:\n${JSON.stringify(protocolResult, null, 2)}\n\nBUDGETER:\n${JSON.stringify(budgetResult, null, 2)}\n\nREVIEWER:\n${JSON.stringify(reviewResult, null, 2)}`;
    const result = await callAgent('REFLECTOR', REFLECTOR_PROMPT, prompt, parentTrace);
    if (result?.summary) {
        return {
            ...result,
            improvements: ensureArray(result.improvements),
        };
    }
    return fallbackReflection(scopeResult, literatureResult, protocolResult, budgetResult, reviewResult);
}

async function orchestrate({
    hypothesis,
    budgetLimit = 2500,
    timelineWeeks = 6,
    evidenceMode = 'balanced',
}) {
    const reasoningLogs = [];
    const normalizedBudget = normalizeCurrency(budgetLimit, 2500);
    const normalizedWeeks = normalizeWeeks(timelineWeeks, 6);

    const parentTrace = createTrace('orchestrate-scientist', {
        hypothesis,
        budgetLimit: normalizedBudget,
        timelineWeeks: normalizedWeeks,
        evidenceMode,
    });

    reasoningLogs.push('[SCOPER]: Translating the hypothesis into an operational study profile...');
    const scopeResult = await scopeHypothesis(hypothesis, normalizedWeeks, parentTrace);
    reasoningLogs.push(`[SCOPER]: ${scopeResult.summary}`);

    reasoningLogs.push('[LIT_QC]: Running novelty and protocol-family screening...');
    const literatureResult = await literatureQc(hypothesis, scopeResult, parentTrace);
    reasoningLogs.push(`[LIT_QC]: Novelty signal is "${literatureResult.noveltySignal}".`);
    reasoningLogs.push(`[LIT_QC]: ${literatureResult.summary}`);

    reasoningLogs.push('[PROTOCOL]: Building the first-pass experiment package...');
    const protocolResult = await draftProtocol(
        hypothesis,
        scopeResult,
        literatureResult,
        normalizedBudget,
        normalizedWeeks,
        parentTrace
    );
    reasoningLogs.push(`[PROTOCOL]: Drafted ${protocolResult.phases.length} execution phases and ${protocolResult.materials.length} material groups.`);

    reasoningLogs.push('[BUDGETER]: Pricing the pilot and mapping milestone dependencies...');
    const budgetResult = await pricePlan(scopeResult, protocolResult, normalizedBudget, normalizedWeeks, parentTrace);
    reasoningLogs.push(`[BUDGETER]: Estimated pilot budget is $${budgetResult.budget.totalUsd} across ${budgetResult.timeline.totalWeeks} weeks.`);

    reasoningLogs.push('[REVIEWER]: Scoring feasibility before lab handoff...');
    const reviewResult = await reviewPlan(hypothesis, literatureResult, protocolResult, budgetResult, parentTrace);
    reasoningLogs.push(`[REVIEWER]: ${reviewResult.message}`);
    reviewResult.warnings.forEach(warning => reasoningLogs.push(`[REVIEWER]: WARNING - ${warning}`));

    reasoningLogs.push('[REFLECTOR]: Auditing pipeline quality and residual risk...');
    const reflection = await reflectOnPipeline(scopeResult, literatureResult, protocolResult, budgetResult, reviewResult, parentTrace);
    reasoningLogs.push(`[REFLECTOR]: ${reflection.summary}`);
    reflection.improvements.forEach(improvement => reasoningLogs.push(`[REFLECTOR]: IMPROVEMENT - ${improvement}`));

    const totalMinutes = protocolResult.phases.reduce((sum, phase) => sum + ((phase.effortHours || 0) * 60), 0);

    if (parentTrace) {
        try {
            parentTrace.update({
                output: {
                    planPhases: protocolResult.phases.length,
                    budgetEstimateUsd: budgetResult.budget.totalUsd,
                    timelineWeeks: budgetResult.timeline.totalWeeks,
                    feasibilityScore: budgetResult.feasibility.score,
                    focusScore: reviewResult.focusScore,
                    confidence: reflection.overallConfidence,
                },
            });
            parentTrace.end();
        } catch (error) {
            console.warn('Could not end Opik trace:', error.message);
        }
    }

    if (opikClient) {
        try {
            await opikClient.flush();
        } catch (error) {
            console.warn('Opik flush error:', error.message);
        }
    }

    return {
        planPhases: protocolResult.phases,
        literature: literatureResult,
        studyProfile: scopeResult.studyProfile,
        objectives: scopeResult.objectives,
        materials: protocolResult.materials,
        controls: protocolResult.controls,
        validation: protocolResult.validation,
        protocolNotes: protocolResult.protocolNotes,
        budget: budgetResult.budget,
        timeline: budgetResult.timeline,
        feasibility: budgetResult.feasibility,
        coaching: reviewResult,
        reflection,
        totalMinutes,
        reasoning: reasoningLogs.join('\n'),
        metrics: {
            hypothesesProcessed: 1,
            objectivesMapped: scopeResult.objectives.length,
            phasesMapped: protocolResult.phases.length,
            budgetEstimateUsd: budgetResult.budget.totalUsd,
            timelineWeeks: budgetResult.timeline.totalWeeks,
            feasibilityScore: budgetResult.feasibility.score,
            focusScore: reviewResult.focusScore,
            reflectionConfidence: reflection.overallConfidence,
            totalMinutes,
        },
    };
}

module.exports = {
    orchestrate,
    opikClient,
};
