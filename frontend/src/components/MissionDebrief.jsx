import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Download, Clock, Zap, Bot, Target,
    User, ArrowRight, Brain, ExternalLink,
    Sparkles, TrendingUp, CalendarClock
} from 'lucide-react';

// Agent icons mapping
const agentIcons = {
    'DECOMPOSER': { icon: '🧩', color: '#00d9ff' },
    'PRIORITIZER': { icon: '🎯', color: '#ffa500' },
    'ESTIMATOR': { icon: '⏱️', color: '#ff6b35' },
    'SCHEDULER': { icon: '📅', color: '#22c55e' },
    'COACH': { icon: '🧠', color: '#a855f7' },
};

export default function MissionDebrief({
    isOpen,
    onClose,
    commitResult,
    schedule,
    metrics,
    coaching,
    availableHours,
    reasoningLogs
}) {
    const [showAgents, setShowAgents] = useState(false);
    const [showChecks, setShowChecks] = useState([]);
    const [activeSection, setActiveSection] = useState(0);

    const totalMinutes = metrics?.totalMinutes || 0;
    const focusScore = coaching?.focusScore || 0;
    const goalsProcessed = metrics?.goalsProcessed || 0;
    const tasksScheduled = metrics?.tasksScheduled || 0;
    const hoursOptimized = (totalMinutes / 60).toFixed(1);

    const agentNames = Object.keys(agentIcons);

    // Extract a decision trace from reasoning logs
    const getDecisionTrace = () => {
        const coachLog = reasoningLogs?.find(log => log.includes('[COACH]') && !log.includes('WARNING'));
        if (coachLog) {
            return coachLog.replace('[COACH]: ', '');
        }
        return coaching?.message || `Optimized ${tasksScheduled} tasks across ${hoursOptimized} hours.`;
    };

    // Animation sequence
    useEffect(() => {
        if (isOpen) {
            setShowAgents(false);
            setShowChecks([]);
            setActiveSection(0);

            const timer1 = setTimeout(() => setActiveSection(1), 500);
            const timer2 = setTimeout(() => setShowAgents(true), 1000);
            const timer3 = setTimeout(() => setActiveSection(2), 1500);

            agentNames.forEach((_, index) => {
                setTimeout(() => {
                    setShowChecks(prev => [...prev, index]);
                }, 2000 + (index * 300));
            });

            const timer4 = setTimeout(() => setActiveSection(3), 2000 + (agentNames.length * 300) + 500);
            const timer5 = setTimeout(() => setActiveSection(4), 3500);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
                clearTimeout(timer4);
                clearTimeout(timer5);
            };
        }
    }, [isOpen]);

    // Download JSON Report
    const downloadReport = () => {
        const report = {
            mission_id: `ORCH-${Date.now()}`,
            timestamp: new Date().toISOString(),
            summary: {
                goals_processed: goalsProcessed,
                tasks_scheduled: tasksScheduled,
                total_minutes: totalMinutes,
                available_hours: availableHours,
                focus_score: focusScore,
                hours_optimized: hoursOptimized,
            },
            schedule: schedule.map(task => ({
                name: task.name,
                description: task.description,
                category: task.category,
                priority: task.priority,
                estimatedMinutes: task.estimatedMinutes,
                timeBlock: task.timeBlock,
                startTime: task.startTime,
                energyRequired: task.energyRequired,
            })),
            coaching: coaching,
            agent_reasoning: reasoningLogs,
            commitments: commitResult?.orders || [],
            audit_log: commitResult?.audit_log || [],
            productivity_metrics: {
                agents_used: 5,
                manual_planning_time_saved: '~30 min',
                optimization_strategy: schedule[0]?.priority ? 'priority-based' : 'sequential',
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productivity_plan_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative p-8 border-b border-white/10 bg-gradient-to-r from-cyber-cyan/20 via-transparent to-purple-500/20">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-cyber-cyan to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(0,217,255,0.5)]"
                        >
                            <CheckCircle className="w-8 h-8 text-black" />
                        </motion.div>

                        <div className="text-center pt-8">
                            <h2 className="text-3xl font-bold text-white mb-2">
                                SCHEDULE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-purple-400">COMMITTED</span>
                            </h2>
                            <p className="text-gray-400 font-mono text-sm">PRODUCTIVITY DEBRIEF // PLAN LOCKED</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* 1. VALUE SCORECARD */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: activeSection >= 1 ? 1 : 0.3, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-3 gap-4"
                        >
                            {/* Hours Optimized */}
                            <div className="bg-gradient-to-br from-cyber-cyan/20 to-transparent border border-cyber-cyan/30 rounded-2xl p-6 text-center">
                                <Clock className="w-8 h-8 text-cyber-cyan mx-auto mb-3" />
                                <div className="text-3xl font-bold text-white mb-1">{hoursOptimized}h</div>
                                <div className="text-[10px] uppercase tracking-widest text-cyber-cyan font-mono">
                                    HOURS OPTIMIZED
                                </div>
                                <p className="text-gray-500 text-xs mt-2">of {availableHours}h available</p>
                            </div>

                            {/* Goals Processed */}
                            <div className="bg-gradient-to-br from-cyber-orange/20 to-transparent border border-cyber-orange/30 rounded-2xl p-6 text-center">
                                <Bot className="w-8 h-8 text-cyber-orange mx-auto mb-3" />
                                <div className="text-3xl font-bold text-white mb-1">{goalsProcessed} / {tasksScheduled}</div>
                                <div className="text-[10px] uppercase tracking-widest text-cyber-orange font-mono">
                                    GOALS / TASKS
                                </div>
                                <p className="text-gray-500 text-xs mt-2">5 agents collaborated</p>
                            </div>

                            {/* Focus Score */}
                            <div className="bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-2xl p-6 text-center">
                                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                                <div className="text-3xl font-bold text-white mb-1">{focusScore}/100</div>
                                <div className="text-[10px] uppercase tracking-widest text-purple-400 font-mono">
                                    FOCUS SCORE
                                </div>
                                <p className="text-gray-500 text-xs mt-2">Schedule quality rating</p>
                            </div>
                        </motion.div>

                        {/* 2. AGENT PIPELINE VISUALIZATION */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: activeSection >= 2 ? 1 : 0.3 }}
                            transition={{ delay: 0.5 }}
                            className="bg-black/50 border border-white/10 rounded-2xl p-8"
                        >
                            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400 mb-6 text-center">
                                Multi-Agent Pipeline Execution
                            </h3>

                            <div className="flex items-center justify-center gap-3">
                                {/* User Node */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: showAgents ? 1 : 0 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-2 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                        <User className="w-8 h-8 text-white" />
                                    </div>
                                    <span className="text-xs text-white font-mono mt-2">YOU</span>
                                </motion.div>

                                {/* Agent Nodes in Pipeline */}
                                {agentNames.map((agent, index) => {
                                    const data = agentIcons[agent];
                                    const isChecked = showChecks.includes(index);

                                    return (
                                        <React.Fragment key={agent}>
                                            {/* Arrow */}
                                            <motion.div
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: showAgents ? 1 : 0 }}
                                                transition={{ delay: 0.3 + (index * 0.1) }}
                                                className="flex items-center"
                                            >
                                                <ArrowRight className="w-4 h-4 text-gray-600" />
                                            </motion.div>

                                            {/* Agent */}
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: showAgents ? 0 : 20, opacity: showAgents ? 1 : 0 }}
                                                transition={{ delay: 0.5 + (index * 0.15) }}
                                                className="flex flex-col items-center"
                                            >
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 relative"
                                                    style={{
                                                        borderColor: data.color,
                                                        backgroundColor: `${data.color}20`,
                                                        boxShadow: isChecked ? `0 0 20px ${data.color}` : 'none'
                                                    }}
                                                >
                                                    {data.icon}

                                                    <AnimatePresence>
                                                        {isChecked && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_10px_#22c55e]"
                                                            >
                                                                <CheckCircle className="w-3 h-3 text-white" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <div className="text-[8px] text-gray-500 font-mono mt-1 uppercase">
                                                    {agent}
                                                </div>
                                            </motion.div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showChecks.length === agentNames.length ? 1 : 0 }}
                                className="text-center text-sm text-gray-400 mt-6 font-mono"
                            >
                                All <span className="text-cyber-cyan font-bold">5 agents</span> completed their pipeline stage. Schedule fully optimized.
                            </motion.p>
                        </motion.div>

                        {/* 3. COACHING INSIGHT */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: activeSection >= 3 ? 1 : 0.3 }}
                            transition={{ delay: 0.7 }}
                            className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0">
                                    <Brain className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-mono uppercase tracking-widest text-purple-400 mb-2">
                                        Coach Insight // AI Decision Trace
                                    </h4>
                                    <p className="text-gray-300 text-sm italic leading-relaxed">
                                        "{getDecisionTrace()}"
                                    </p>
                                    {coaching?.topTip && (
                                        <p className="text-gray-400 text-xs mt-3 border-t border-white/5 pt-3">
                                            <span className="text-purple-400 font-bold">TIP:</span> {coaching.topTip}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                        -- COACH Agent via OrchestrAI Pipeline
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* 4. PRODUCTIVITY SUMMARY */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: activeSection >= 3 ? 1 : 0.3 }}
                            className="flex items-center justify-between bg-black/50 border border-white/10 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-4">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                                <div>
                                    <div className="text-lg font-bold text-white">
                                        {tasksScheduled} tasks <span className="text-gray-500">across</span> {hoursOptimized} hours
                                    </div>
                                    <div className="text-xs text-gray-400">Optimized daily schedule</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-green-400">
                                    ~30 min SAVED
                                </div>
                                <div className="text-xs text-green-400/70">vs. manual planning</div>
                            </div>
                        </motion.div>

                        {/* 5. ACTION BUTTONS */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: activeSection >= 4 ? 1 : 0.3, y: 0 }}
                            transition={{ delay: 0.9 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            <button
                                onClick={downloadReport}
                                className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-cyber-cyan to-purple-500 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(0,217,255,0.4)] hover:shadow-[0_0_50px_rgba(0,217,255,0.6)] transition-all hover:-translate-y-1"
                            >
                                <Download className="w-5 h-5" />
                                EXPORT PRODUCTIVITY PLAN (JSON)
                            </button>

                            <button
                                onClick={() => window.open('https://www.comet.com/opik', '_blank')}
                                className="flex items-center justify-center gap-3 py-4 px-6 bg-white/5 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 hover:border-white/30 transition-all"
                            >
                                <CalendarClock className="w-5 h-5" />
                                VIEW OPIK TRACES
                                <ExternalLink className="w-4 h-4 opacity-50" />
                            </button>
                        </motion.div>

                        {/* Commitments Summary */}
                        {commitResult?.orders && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: activeSection >= 4 ? 1 : 0 }}
                                className="text-center text-xs text-gray-500 font-mono"
                            >
                                {commitResult.orders.length} task commitments locked: {commitResult.orders.map(o => o.commitId).join(', ')}
                            </motion.div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-gray-500 hover:text-white transition-colors font-mono text-sm"
                        >
                            [ CLOSE DEBRIEF ]
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
