import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
    Activity,
    AlertTriangle,
    Beaker,
    BookOpen,
    CheckCircle2,
    Clock3,
    Coins,
    FlaskConical,
    Microscope,
    Radar,
    SearchCode,
    ShieldCheck,
    Sparkles,
    Terminal,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import BackgroundGrid from './components/BackgroundGrid';
import AgentNetwork from './components/AgentNetwork';
import AgentNeuralLink from './components/AgentNeuralLink';
import GamifiedInput from './components/GamifiedInput';
import MissionDebrief from './components/MissionDebrief';
import { getLoadingQuip, getPersonalityComment } from './utils/personality';

const EXAMPLES = [
    {
        label: 'Diagnostics',
        hypothesis: 'Paper-based electrochemical biosensor with anti-CRP antibodies to detect C-reactive protein in whole blood under 0.5 mg/L within 10 minutes.',
    },
    {
        label: 'Gut Health',
        hypothesis: 'Lactobacillus rhamnosus GG supplementation in C57BL/6 mice for 4 weeks, reducing intestinal permeability by 30%, measured by FITC-dextran assay.',
    },
    {
        label: 'Cell Biology',
        hypothesis: 'Replace sucrose with trehalose as a cryoprotectant to improve post-thaw HeLa cell viability compared to DMSO.',
    },
];

const evidenceModes = [
    { value: 'balanced', label: 'Balanced', detail: 'Fast prototype with explicit gaps.' },
    { value: 'strict', label: 'Strict QC', detail: 'Stronger review posture and tighter warnings.' },
];

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function TypewriterLog({ logs }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="font-mono text-xs text-slate-300 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
            {logs.map((log, index) => (
                <TypewriterItem key={`${log}-${index}`} text={log} delay={index * 0.06} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}

function getAgentColor(text) {
    if (text.includes('[SCOPER]')) return 'text-cyan-300';
    if (text.includes('[LIT_QC]')) return 'text-amber-300';
    if (text.includes('[PROTOCOL]')) return 'text-emerald-300';
    if (text.includes('[BUDGETER]')) return 'text-orange-300';
    if (text.includes('[REVIEWER]')) return 'text-violet-300';
    if (text.includes('[REFLECTOR]')) return 'text-pink-300';
    if (text.includes('WARNING')) return 'text-amber-200';
    return 'text-slate-300';
}

function TypewriterItem({ text, delay }) {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let index = 0;
        const startTimeout = setTimeout(() => {
            const interval = setInterval(() => {
                setDisplayedText(text.substring(0, index));
                index += 1;
                if (index > text.length) clearInterval(interval);
            }, 4);
        }, delay * 100);

        return () => clearTimeout(startTimeout);
    }, [delay, text]);

    return (
        <div className={`${getAgentColor(text)} leading-6 break-words`}>
            {displayedText}
            {displayedText.length < text.length && <span className="inline-block w-1.5 h-3 bg-current ml-1 animate-pulse" />}
        </div>
    );
}

export default function App() {
    const generationRef = useRef(0);

    const [hypothesis, setHypothesis] = useState(EXAMPLES[0].hypothesis);
    const [budgetLimit, setBudgetLimit] = useState(2500);
    const [timelineWeeks, setTimelineWeeks] = useState(6);
    const [evidenceMode, setEvidenceMode] = useState('balanced');

    const [planLogs, setPlanLogs] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [studyProfile, setStudyProfile] = useState(null);
    const [objectives, setObjectives] = useState([]);
    const [literature, setLiterature] = useState(null);
    const [planPhases, setPlanPhases] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [budget, setBudget] = useState(null);
    const [timeline, setTimeline] = useState(null);
    const [validation, setValidation] = useState(null);
    const [feasibility, setFeasibility] = useState(null);
    const [coaching, setCoaching] = useState(null);
    const [reflection, setReflection] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [showDebrief, setShowDebrief] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [commitResult, setCommitResult] = useState(null);

    const [activeAgent, setActiveAgent] = useState(null);
    const [latestMessage, setLatestMessage] = useState('');
    const [personalityComment, setPersonalityComment] = useState(getLoadingQuip());
    const [systemStatus, setSystemStatus] = useState('FULCRUM TRACK READY');

    useEffect(() => {
        setPersonalityComment(getPersonalityComment(budgetLimit, timelineWeeks, evidenceMode, hypothesis));
    }, [budgetLimit, timelineWeeks, evidenceMode, hypothesis]);

    useEffect(() => {
        const statuses = ['FULCRUM TRACK READY', 'TRACE PIPELINE ONLINE', 'WAITING FOR HYPOTHESIS', 'REVIEW MODE ACTIVE'];
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % statuses.length;
            setSystemStatus(statuses[index]);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (planLogs.length === 0) return undefined;

        const lastLog = planLogs[planLogs.length - 1];
        const agentIds = ['SCOPER', 'LIT_QC', 'PROTOCOL', 'BUDGETER', 'REVIEWER', 'REFLECTOR'];
        const detected = agentIds.find(agent => lastLog.includes(`[${agent}]`)) || null;
        const message = lastLog.split(']:')[1]?.trim() || lastLog;

        setActiveAgent(detected);
        setLatestMessage(message);

        const timeout = setTimeout(() => {
            setActiveAgent(null);
            setLatestMessage('');
        }, 2400);

        return () => clearTimeout(timeout);
    }, [planLogs]);

    const totalEffortHours = useMemo(
        () => (planPhases.reduce((sum, phase) => sum + (phase.effortHours || 0), 0)).toFixed(1),
        [planPhases]
    );

    const generatePlan = async (mode) => {
        setEvidenceMode(mode);
        const currentGeneration = ++generationRef.current;

        setPlanLogs([]);
        setMetrics(null);
        setStudyProfile(null);
        setObjectives([]);
        setLiterature(null);
        setPlanPhases([]);
        setMaterials([]);
        setBudget(null);
        setTimeline(null);
        setValidation(null);
        setFeasibility(null);
        setCoaching(null);
        setReflection(null);

        setPlanLogs([
            '[SYSTEM]: Scientist planning pipeline online.',
            `[SYSTEM]: Evidence mode set to ${mode.toUpperCase()}.`,
        ]);

        try {
            const response = await axios.post('/api/orchestrate', {
                hypothesis,
                budgetLimit,
                timelineWeeks,
                evidenceMode: mode,
            });

            if (generationRef.current !== currentGeneration) return;

            const data = response.data;
            const logs = data.reasoning.split('\n').filter(Boolean);

            for (const log of logs) {
                if (generationRef.current !== currentGeneration) return;
                setPlanLogs(previous => [...previous, log]);
                // eslint-disable-next-line no-await-in-loop
                await new Promise(resolve => setTimeout(resolve, 340));
            }

            if (generationRef.current !== currentGeneration) return;

            setMetrics(data.metrics);
            setStudyProfile(data.studyProfile);
            setObjectives(data.objectives || []);
            setLiterature(data.literature);
            setPlanPhases(data.planPhases || []);
            setMaterials(data.materials || []);
            setBudget(data.budget);
            setTimeline(data.timeline);
            setValidation(data.validation);
            setFeasibility(data.feasibility);
            setCoaching(data.coaching);
            setReflection(data.reflection);
            setPlanLogs(previous => [...previous, `[SYSTEM]: Experiment package assembled. ${data.planPhases.length} phases ready for review.`]);
        } catch (error) {
            console.error('Scientist orchestration failed:', error);
            setPlanLogs(previous => [...previous, '[SYSTEM]: Pipeline failed. Check the API deployment and try again.']);
        }
    };

    const approvePackage = async () => {
        setShowModal(true);
        setIsApproving(true);
        setAuditLog([]);

        try {
            const response = await axios.post('/api/commit', {
                artifacts: planPhases,
                artifactType: 'scientist review',
            });

            setCommitResult(response.data);
            setAuditLog(response.data.audit_log || []);
        } catch (error) {
            console.error('Approval failed:', error);
            setAuditLog(['Failed to register review packet.']);
        } finally {
            setIsApproving(false);
            setTimeout(() => {
                setShowModal(false);
                setShowDebrief(true);
            }, 2200);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
            <BackgroundGrid />
            <div className="fixed inset-0 z-[-1]">
                <video src="/abstract-3d-animations-background-2026-01-28-03-29-26-utc.mp4" autoPlay loop muted className="w-full h-full object-cover opacity-30" />
            </div>
            <div className="fixed inset-0 bg-slate-950/70 z-[-1]" />

            <AgentNeuralLink activeAgent={activeAgent} latestMessage={latestMessage} />

            <div className="max-w-[1600px] mx-auto px-6 pb-16">
                <header className="pt-8 pb-6">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] font-mono text-cyan-200">
                                <Microscope className="w-3.5 h-3.5" />
                                Hack-Nation 2026 / Fulcrum Science
                            </div>
                            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
                                Orchestr<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300">AI</span> Scientist
                            </h1>
                            <p className="mt-4 max-w-3xl text-slate-300 leading-7">
                                Convert a scientific hypothesis into a literature QC packet, experiment phases, budget, and validation plan. This build is adapted for challenge 04: <span className="text-white">The AI Scientist</span>.
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="text-xs text-emerald-300 font-mono uppercase tracking-[0.28em] flex items-center justify-end gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                                {systemStatus}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500 font-mono uppercase tracking-[0.2em] flex items-center justify-end gap-2">
                                <Activity className="w-3.5 h-3.5 text-cyan-300" />
                                6 agents online // opik trace-ready
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <aside className="xl:col-span-4 space-y-6">
                        <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-400/15 to-violet-400/15">
                                <div className="text-sm text-white font-medium">{personalityComment}</div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-mono">Hypothesis Input</label>
                                    <textarea
                                        value={hypothesis}
                                        onChange={event => setHypothesis(event.target.value)}
                                        rows={7}
                                        className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-300/40 resize-none"
                                        placeholder="Enter a specific scientific question with intervention, outcome, and control condition."
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {EXAMPLES.map(example => (
                                            <button
                                                key={example.label}
                                                onClick={() => setHypothesis(example.hypothesis)}
                                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:border-cyan-300/30 hover:text-white transition-colors"
                                            >
                                                {example.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <GamifiedInput
                                    label="Pilot Budget"
                                    icon={<Coins className="w-4 h-4" />}
                                    value={budgetLimit}
                                    onChange={event => setBudgetLimit(Number(event.target.value))}
                                    min={500}
                                    max={5000}
                                    step={100}
                                    unit="$"
                                    presets={[
                                        { label: 'Lean', value: 1500, icon: 'I' },
                                        { label: 'Pilot', value: 2500, icon: 'II' },
                                        { label: 'Robust', value: 4000, icon: 'III' },
                                    ]}
                                />

                                <GamifiedInput
                                    label="Timeline"
                                    icon={<Clock3 className="w-4 h-4" />}
                                    value={timelineWeeks}
                                    onChange={event => setTimelineWeeks(Number(event.target.value))}
                                    min={2}
                                    max={12}
                                    step={1}
                                    unit="w"
                                    presets={[
                                        { label: 'Sprint', value: 4, icon: 'S' },
                                        { label: 'Default', value: 6, icon: 'M' },
                                        { label: 'Extended', value: 10, icon: 'L' },
                                    ]}
                                />

                                <div className="space-y-3">
                                    <label className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-mono">Evidence Mode</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {evidenceModes.map(mode => (
                                            <button
                                                key={mode.value}
                                                onClick={() => setEvidenceMode(mode.value)}
                                                className={cn(
                                                    'rounded-2xl border p-4 text-left transition-colors',
                                                    evidenceMode === mode.value
                                                        ? 'border-cyan-300/40 bg-cyan-300/10'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/8'
                                                )}
                                            >
                                                <div className="text-sm text-white">{mode.label}</div>
                                                <div className="mt-1 text-xs text-slate-400">{mode.detail}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden min-h-[360px] flex flex-col">
                            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-400 font-mono">
                                <Terminal className="w-3.5 h-3.5" />
                                Agent Trace
                            </div>
                            <div className="px-6 pt-4 pb-2">
                                <AgentNetwork activeAgent={activeAgent} />
                            </div>
                            <div className="px-6 pb-6 flex-1 min-h-[220px]">
                                <TypewriterLog logs={planLogs} />
                            </div>
                        </section>
                    </aside>

                    <main className="xl:col-span-8 space-y-6">
                        <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-mono">Challenge Alignment</div>
                                <div className="mt-2 text-lg text-white">Fulcrum Science / hypothesis to runnable experiment plan</div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {evidenceModes.map(mode => (
                                    <button
                                        key={mode.value}
                                        onClick={() => generatePlan(mode.value)}
                                        className={cn(
                                            'rounded-2xl border px-5 py-3 text-sm transition-colors',
                                            evidenceMode === mode.value
                                                ? 'border-cyan-300/40 bg-cyan-300/10 text-white'
                                                : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                                        )}
                                    >
                                        Run {mode.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <MetricCard label="Novelty Signal" value={literature?.noveltySignal || '--'} accent="text-amber-300" icon={SearchCode} />
                            <MetricCard label="Budget" value={budget ? `$${budget.totalUsd}` : '--'} accent="text-orange-300" icon={Coins} />
                            <MetricCard label="Timeline" value={timeline ? `${timeline.totalWeeks}w` : '--'} accent="text-emerald-300" icon={Clock3} />
                            <MetricCard label="Readiness" value={coaching ? `${coaching.focusScore}/100` : '--'} accent="text-violet-300" icon={ShieldCheck} />
                        </section>

                        <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-mono">Execution Plan</div>
                                    <h2 className="mt-2 text-2xl font-semibold text-white">Experiment phases and handoff milestones</h2>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">Total effort</div>
                                    <div className="text-2xl text-white">{totalEffortHours}h</div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {planPhases.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    planPhases.map(phase => (
                                        <div key={phase.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                <div>
                                                    <div className="text-[11px] uppercase tracking-[0.26em] text-emerald-300 font-mono">
                                                        Week {phase.weekStart}-{phase.weekEnd}
                                                    </div>
                                                    <h3 className="mt-2 text-xl text-white">{phase.name}</h3>
                                                    <p className="mt-2 text-sm text-slate-300 leading-6">{phase.description}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Pill>{phase.priority}</Pill>
                                                    <Pill>{phase.effortHours}h</Pill>
                                                </div>
                                            </div>
                                            <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-4">
                                                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500 font-mono">Deliverable</div>
                                                <div className="mt-2 text-sm text-slate-200">{phase.deliverable}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Panel title="Literature QC" icon={BookOpen}>
                                {literature ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-300 leading-6">{literature.summary}</p>
                                        <div className="space-y-3">
                                            {literature.references?.map(reference => (
                                                <div key={reference.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                                                    <div className="text-sm text-white">{reference.title}</div>
                                                    <div className="mt-1 text-xs text-cyan-200">{reference.source}</div>
                                                    <div className="mt-2 text-xs text-slate-400 leading-5">{reference.whyRelevant}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {literature.gaps?.length > 0 && (
                                            <div className="space-y-2">
                                                {literature.gaps.map(gap => (
                                                    <div key={gap} className="flex gap-2 text-xs text-amber-200">
                                                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                                        <span>{gap}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <PanelPlaceholder text="Run the agent pipeline to generate novelty screening and reference targets." />
                                )}
                            </Panel>

                            <Panel title="Study Profile" icon={Microscope}>
                                {studyProfile ? (
                                    <div className="space-y-3 text-sm text-slate-300">
                                        <ProfileRow label="Domain" value={studyProfile.domain} />
                                        <ProfileRow label="Model System" value={studyProfile.modelSystem} />
                                        <ProfileRow label="Intervention" value={studyProfile.intervention} />
                                        <ProfileRow label="Primary Readout" value={studyProfile.primaryReadout} />
                                        <ProfileRow label="Timeline Target" value={`${studyProfile.targetTimelineWeeks} weeks`} />
                                    </div>
                                ) : (
                                    <PanelPlaceholder text="The scoper agent will map the hypothesis into an operational study profile." />
                                )}
                            </Panel>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Panel title="Objectives and Materials" icon={FlaskConical}>
                                {objectives.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            {objectives.map(objective => (
                                                <div key={objective.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-sm text-white">{objective.name}</div>
                                                        <Pill>{objective.priority}</Pill>
                                                    </div>
                                                    <div className="mt-2 text-xs text-slate-400 leading-5">{objective.rationale}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-white/10 pt-4 space-y-3">
                                            {materials.map(material => (
                                                <div key={material.item} className="flex items-start justify-between gap-3 text-sm">
                                                    <div>
                                                        <div className="text-white">{material.item}</div>
                                                        <div className="text-xs text-slate-500">{material.supplierType} / {material.purpose}</div>
                                                    </div>
                                                    <div className="text-orange-300">${material.estimatedCostUsd}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <PanelPlaceholder text="Objectives, materials, and protocol stages will appear here." />
                                )}
                            </Panel>

                            <Panel title="Budget and Validation" icon={Beaker}>
                                {budget && validation ? (
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            {budget.lineItems?.map(item => (
                                                <div key={item.item} className="flex items-start justify-between gap-3 text-sm">
                                                    <div>
                                                        <div className="text-white">{item.item}</div>
                                                        <div className="text-xs text-slate-500">{item.rationale}</div>
                                                    </div>
                                                    <div className="text-orange-300">${item.costUsd}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-white/10 pt-4 space-y-3">
                                            <ProfileRow label="Primary Readout" value={validation.primaryReadout} />
                                            <ProfileRow label="Success Criteria" value={validation.successCriteria} />
                                            {validation.failureSignals?.map(signal => (
                                                <div key={signal} className="text-xs text-amber-200 leading-5">{signal}</div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <PanelPlaceholder text="The budget and validation gates will appear after protocol generation." />
                                )}
                            </Panel>
                        </div>

                        <Panel title="Scientist Review" icon={Sparkles}>
                            {coaching && reflection && feasibility ? (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <ReviewCard label="Go / Revise" value={coaching.goNoGo} />
                                        <ReviewCard label="Feasibility" value={`${feasibility.score}/100`} />
                                        <ReviewCard label="Reflection" value={`${reflection.overallConfidence}/100`} />
                                    </div>
                                    <p className="text-sm text-slate-300 leading-6">{coaching.message}</p>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                                            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 font-mono">Top Tip</div>
                                            <div className="mt-2 text-sm text-white">{coaching.topTip}</div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                                            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500 font-mono">Next Critical Task</div>
                                            <div className="mt-2 text-sm text-white">{coaching.keyTask}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {reflection.improvements?.map(improvement => (
                                            <div key={improvement} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                                                {improvement}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <PanelPlaceholder text="The reviewer and reflector outputs will appear after execution planning." />
                            )}
                        </Panel>

                        <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-5">
                            <button
                                onClick={approvePackage}
                                disabled={planPhases.length === 0}
                                className={cn(
                                    'w-full rounded-2xl border px-5 py-4 text-sm transition-colors flex items-center justify-center gap-3',
                                    planPhases.length > 0
                                        ? 'border-emerald-300/35 bg-emerald-300/10 text-white hover:bg-emerald-300/14'
                                        : 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'
                                )}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Approve Scientist Review Packet
                            </button>
                        </div>
                    </main>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 20 }}
                            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/95 overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Radar className="w-5 h-5 text-cyan-300" />
                                    <div className="text-white">{isApproving ? 'Registering review packet...' : 'Review packet approved'}</div>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                                    {auditLog.map((log, index) => (
                                        <div key={`${log}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <MissionDebrief
                isOpen={showDebrief}
                onClose={() => setShowDebrief(false)}
                commitResult={commitResult}
                hypothesis={hypothesis}
                metrics={metrics}
                coaching={coaching}
                literature={literature}
                budget={budget}
                timeline={timeline}
                reflection={reflection}
                planPhases={planPhases}
            />
        </div>
    );
}

function MetricCard({ label, value, accent, icon: Icon }) {
    return (
        <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-5">
            <Icon className={`w-5 h-5 ${accent}`} />
            <div className="mt-4 text-2xl text-white capitalize">{value}</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-slate-500 font-mono">{label}</div>
        </div>
    );
}

function Panel({ title, icon: Icon, children }) {
    return (
        <section className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
                <Icon className="w-4 h-4 text-cyan-300" />
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-mono">{title}</div>
            </div>
            <div className="p-6">{children}</div>
        </section>
    );
}

function ReviewCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-mono">{label}</div>
            <div className="mt-2 text-xl text-white capitalize">{value}</div>
        </div>
    );
}

function ProfileRow({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-mono">{label}</div>
            <div className="mt-2 text-sm text-white leading-6">{value}</div>
        </div>
    );
}

function Pill({ children }) {
    return (
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300 font-mono">
            {children}
        </div>
    );
}

function PanelPlaceholder({ text }) {
    return <div className="text-sm text-slate-500 leading-6">{text}</div>;
}

function EmptyState() {
    return (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-12 text-center">
            <div className="text-6xl mb-4">🧪</div>
            <div className="text-2xl text-white">Ready for hypothesis intake</div>
            <p className="mt-3 max-w-xl mx-auto text-sm text-slate-400 leading-6">
                Enter a measurable scientific question, set budget and timeline constraints, then run the scientist pipeline to generate literature QC and a first-pass experiment plan.
            </p>
        </div>
    );
}
