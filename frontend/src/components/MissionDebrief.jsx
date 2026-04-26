import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Microscope, ShieldCheck, Coins, Clock3 } from 'lucide-react';

export default function MissionDebrief({
    isOpen,
    onClose,
    commitResult,
    hypothesis,
    metrics,
    coaching,
    literature,
    budget,
    timeline,
    reflection,
    planPhases,
}) {
    if (!isOpen) return null;

    const downloadReport = () => {
        const report = {
            hypothesis,
            metrics,
            coaching,
            literature,
            budget,
            timeline,
            reflection,
            planPhases,
            handoff: commitResult,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orchestrai-scientist-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95"
                    onClick={event => event.stopPropagation()}
                >
                    <div className="px-8 py-7 border-b border-white/10 bg-gradient-to-r from-cyan-500/12 via-transparent to-violet-500/12">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 text-emerald-300 text-[11px] uppercase tracking-[0.25em] font-mono">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Review Package Approved
                                </div>
                                <h2 className="mt-4 text-3xl font-semibold text-white">Scientist Review Packet</h2>
                                <p className="mt-2 text-sm text-slate-400 max-w-3xl">
                                    The experiment package is staged for lab review with novelty screening, protocol phases, budget framing, and validation gates.
                                </p>
                            </div>

                            <button
                                onClick={downloadReport}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export JSON
                            </button>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <ScoreCard icon={Microscope} label="Plan Phases" value={metrics?.phasesMapped || 0} detail="execution stages" accent="text-cyan-300" />
                            <ScoreCard icon={Coins} label="Budget" value={`$${budget?.totalUsd || 0}`} detail="pilot estimate" accent="text-orange-300" />
                            <ScoreCard icon={Clock3} label="Timeline" value={`${timeline?.totalWeeks || 0}w`} detail="first decision gate" accent="text-emerald-300" />
                            <ScoreCard icon={ShieldCheck} label="Readiness" value={`${coaching?.focusScore || 0}/100`} detail={coaching?.goNoGo || 'review'} accent="text-violet-300" />
                        </div>

                        <section className="space-y-3">
                            <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 font-mono">Hypothesis</h3>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 leading-7">
                                {hypothesis}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 font-mono mb-4">Literature QC</h3>
                                <div className="text-2xl text-white font-semibold mb-2">{literature?.noveltySignal || 'unknown'}</div>
                                <p className="text-sm text-slate-300 leading-6">{literature?.summary}</p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 font-mono mb-4">Reviewer Notes</h3>
                                <p className="text-sm text-slate-300 leading-6">{coaching?.message}</p>
                                {coaching?.warnings?.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {coaching.warnings.map(warning => (
                                            <div key={warning} className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                                                {warning}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 font-mono mb-4">Approved Handoff Queue</h3>
                            <div className="space-y-3">
                                {(commitResult?.orders || []).map(order => (
                                    <div key={order.commitId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-4 py-3">
                                        <div>
                                            <div className="text-sm text-white font-medium">{order.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{order.commitId}</div>
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono">{order.phaseWindow}</div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400 font-mono mb-4">Reflection</h3>
                            <p className="text-sm text-slate-300 leading-6">{reflection?.summary}</p>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(reflection?.improvements || []).map(improvement => (
                                    <div key={improvement} className="rounded-xl border border-white/8 bg-black/30 p-3 text-xs text-slate-300 leading-5">
                                        {improvement}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function ScoreCard({ icon: Icon, label, value, detail, accent }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Icon className={`w-5 h-5 ${accent}`} />
            <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-slate-500 font-mono">{label}</div>
            <div className="mt-3 text-xs text-slate-400">{detail}</div>
        </div>
    );
}
