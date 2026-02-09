import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, Calendar, Zap, Clock, Activity, CheckCircle, Target, Sun, Moon, Sunrise, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import BackgroundGrid from './components/BackgroundGrid';
import AgentNetwork from './components/AgentNetwork';
import AgentNeuralLink from './components/AgentNeuralLink';
import GamifiedInput from './components/GamifiedInput';
import MissionDebrief from './components/MissionDebrief';
import { getPersonalityComment, getLoadingQuip } from './utils/personality';

// Utility for classes
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Typewriter Component
function TypewriterLog({ logs }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="font-mono text-sm text-hack-green space-y-1 overflow-y-auto flex-1 h-full custom-scrollbar pb-2">
            {logs.map((log, i) => (
                <TypewriterItem key={i} text={log} delay={i * 0.1} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}

// Utility to get agent color
function getAgentColor(text) {
    if (text.includes("[DECOMPOSER]")) return "text-cyber-cyan";
    if (text.includes("[PRIORITIZER]")) return "text-cyber-gold";
    if (text.includes("[SCHEDULER]")) return "text-green-400";
    if (text.includes("[ESTIMATOR]")) return "text-cyber-orange";
    if (text.includes("[COACH]")) return "text-purple-400";
    if (text.includes("[ERROR]")) return "text-red-500";
    if (text.includes("[SYSTEM]")) return "text-gray-400";
    return "text-gray-300";
}

function TypewriterItem({ text, delay }) {
    const [displayedText, setDisplayedText] = useState('');
    const colorClass = getAgentColor(text);

    useEffect(() => {
        let index = 0;
        const startTimeout = setTimeout(() => {
            const interval = setInterval(() => {
                setDisplayedText(text.substring(0, index));
                index++;
                if (index > text.length) clearInterval(interval);
            }, 5);
            return () => clearInterval(interval);
        }, delay * 50);

        return () => clearTimeout(startTimeout);
    }, [text, delay]);

    return (
        <div className={`break-words leading-relaxed ${colorClass} text-xs font-mono`}>
            {displayedText}
            {displayedText.length < text.length && <span className="inline-block w-1.5 h-3 bg-current ml-1 animate-pulse" />}
        </div>
    );
}

// Time block icons
const blockIcons = {
    morning: <Sunrise className="w-4 h-4 text-amber-400" />,
    afternoon: <Sun className="w-4 h-4 text-orange-400" />,
    evening: <Moon className="w-4 h-4 text-indigo-400" />,
};

const blockLabels = {
    morning: 'MORNING BLOCK',
    afternoon: 'AFTERNOON BLOCK',
    evening: 'EVENING BLOCK',
};

const priorityColors = {
    critical: 'border-red-500/50 bg-red-500/10',
    high: 'border-cyber-orange/50 bg-cyber-orange/10',
    medium: 'border-cyber-cyan/50 bg-cyber-cyan/10',
    low: 'border-gray-500/50 bg-gray-500/10',
};

export default function App() {
    // Refs
    const generationRef = useRef(0);

    // Inputs
    const [goals, setGoals] = useState('Finish quarterly report, prepare team presentation, review pull requests, go to the gym, read 30 pages of my book');
    const [availableHours, setAvailableHours] = useState(8);
    const [energyLevel, setEnergyLevel] = useState('medium');
    const [strategy, setStrategy] = useState('balanced');

    // Data
    const [schedule, setSchedule] = useState([]);
    const [planLogs, setPlanLogs] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [coaching, setCoaching] = useState(null);

    // Simulation State
    const [isSimulating, setIsSimulating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDebrief, setShowDebrief] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [commitResult, setCommitResult] = useState(null);

    // Screen Shake State
    const [shake, setShake] = useState(false);

    // Active Agent State (for visualization)
    const [activeAgent, setActiveAgent] = useState(null);
    const [latestMessage, setLatestMessage] = useState('');
    const [personalityComment, setPersonalityComment] = useState(getLoadingQuip());

    // Track which agent is "speaking" based on the latest log
    useEffect(() => {
        if (planLogs.length > 0) {
            const lastLog = planLogs[planLogs.length - 1];

            let detectedAgent = null;
            let message = lastLog;

            if (lastLog.includes("[DECOMPOSER]")) {
                detectedAgent = "DECOMPOSER";
                message = lastLog.split("]:")[1]?.trim() || lastLog;
            } else if (lastLog.includes("[PRIORITIZER]")) {
                detectedAgent = "PRIORITIZER";
                message = lastLog.split("]:")[1]?.trim() || lastLog;
            } else if (lastLog.includes("[ESTIMATOR]")) {
                detectedAgent = "ESTIMATOR";
                message = lastLog.split("]:")[1]?.trim() || lastLog;
            } else if (lastLog.includes("[SCHEDULER]")) {
                detectedAgent = "SCHEDULER";
                message = lastLog.split("]:")[1]?.trim() || lastLog;
            } else if (lastLog.includes("[COACH]")) {
                detectedAgent = "COACH";
                message = lastLog.split("]:")[1]?.trim() || lastLog;
            }

            setActiveAgent(detectedAgent);
            setLatestMessage(message);

            const timer = setTimeout(() => {
                setActiveAgent(null);
                setLatestMessage('');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [planLogs]);

    // Update personality comment when inputs change
    useEffect(() => {
        setPersonalityComment(getPersonalityComment(availableHours, energyLevel, strategy, goals));
    }, [availableHours, energyLevel, strategy, goals]);

    // Status Ticker
    const [systemStatus, setSystemStatus] = useState("SYSTEM ONLINE");
    useEffect(() => {
        const statuses = ["SYSTEM ONLINE", "NEURAL LINK ACTIVE", "AWAITING GOALS", "AGENTS READY"];
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % statuses.length;
            setSystemStatus(statuses[i]);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const generatePlan = async (strategyType) => {
        setStrategy(strategyType);
        const currentGen = ++generationRef.current;

        setPlanLogs([]);
        setSchedule([]);
        setMetrics(null);
        setCoaching(null);

        try {
            if (generationRef.current === currentGen) {
                setPlanLogs([`Initializing Neural Link...`, `Strategy Selected: ${strategyType.toUpperCase()}`]);
            }

            const payload = {
                goals,
                availableHours,
                energyLevel,
                strategy: strategyType
            };

            const response = await axios.post('/api/orchestrate', payload);

            if (generationRef.current !== currentGen) return;

            const data = response.data;

            if (data.reasoning) {
                const logs = data.reasoning.split('\n').filter(l => l.trim());

                const streamLogs = async (logs) => {
                    for (const log of logs) {
                        if (generationRef.current !== currentGen) return;
                        setPlanLogs(prev => [...prev, log]);
                        await new Promise(r => setTimeout(r, 600));
                    }

                    if (generationRef.current === currentGen && data.schedule) {
                        setSchedule(data.schedule);
                        setMetrics(data.metrics);
                        setCoaching(data.coaching);
                        setPlanLogs(prev => [...prev, `[SYSTEM]: DAILY PLAN OPTIMIZED. ${data.schedule.length} tasks scheduled.`]);
                    }
                };

                streamLogs(logs);
            }

        } catch (error) {
            console.error("Orchestration Failed:", error);
            if (generationRef.current === currentGen) {
                setPlanLogs(prev => [...prev, `[ERROR]: CONNECTION LOST. CHECK BACKEND.`]);
            }
        }
    };

    const handleCommit = async () => {
        setShake(true);
        setTimeout(() => setShake(false), 200);

        setIsSimulating(true);
        setShowModal(true);
        setAuditLog([]);

        try {
            const response = await axios.post('/api/commit', { schedule });
            const result = response.data;
            setCommitResult(result);
            setAuditLog(result.audit_log);

            // Try voice report
            try {
                const voiceRes = await axios.post('/api/speak', {
                    focusScore: coaching?.focusScore || 85,
                    taskCount: schedule.length,
                    totalMinutes: metrics?.totalMinutes || 0
                }, { responseType: 'blob' });

                if (voiceRes.data.type === 'audio/mpeg') {
                    const audioUrl = URL.createObjectURL(new Blob([voiceRes.data]));
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            } catch (e) {
                console.log('Voice not available, continuing...');
            }

            setTimeout(() => {
                setShowModal(false);
                setShowDebrief(true);
            }, 3000);

        } catch (error) {
            console.error("Commit failed:", error);
            setAuditLog(prev => [...prev, "Error: Schedule Commit Failed."]);
        } finally {
            setIsSimulating(false);
        }
    };

    // Group schedule by time block
    const groupedSchedule = schedule.reduce((acc, task) => {
        const block = task.timeBlock || 'morning';
        if (!acc[block]) acc[block] = [];
        acc[block].push(task);
        return acc;
    }, {});

    const totalScheduledMinutes = schedule.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

    return (
        <motion.div
            animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.2 }}
            className="relative min-h-screen text-white font-sans overflow-hidden"
        >
            <BackgroundGrid />
            <div className="fixed inset-0 z-[-1]">
                <video
                    src="/cyberpunk.mp4"
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover opacity-100"
                />
            </div>
            <div className="fixed inset-0 z-[-1] cyberpunk-bg opacity-40 mix-blend-overlay pointer-events-none"></div>
            <div className="scanlines"></div>

            {/* Neural Link Header */}
            <AgentNeuralLink activeAgent={activeAgent} latestMessage={latestMessage} />

            <div className="p-6 relative z-10 min-h-screen flex flex-col max-w-[1600px] mx-auto pb-20">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8 flex justify-between items-end bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-2xl hover:bg-black/40 transition-all duration-300"
                >
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg font-sans">
                            ORCHESTR<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-cyber-orange to-cyber-gold">AI</span>
                        </h1>
                        <div className="text-xs text-cyber-cyan/50 tracking-[0.4em] mt-1 font-mono uppercase">
                            AI Productivity Orchestrator // Powered by Opik
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs text-cyber-orange font-mono animate-pulse mb-1 flex items-center justify-end gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyber-orange"></span>
                            {systemStatus}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <Activity className="w-3 h-3 text-cyber-cyan" />
                            5 AGENTS ONLINE // OPIK TRACING
                        </div>
                    </div>
                </motion.header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

                    {/* Left Panel: Inputs & Log */}
                    <div className="lg:col-span-4 flex flex-col gap-6 h-full">

                        {/* Mission Control Panel */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden hover:bg-black/40 hover:border-cyber-cyan/50 transition-all duration-300"
                        >
                            {/* Personality Comment Banner */}
                            <motion.div
                                key={personalityComment}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-cyber-cyan/20 to-cyber-orange/20 border-b border-white/10 px-6 py-3 text-center"
                            >
                                <div className="text-sm font-mono text-white font-bold animate-pulse">
                                    {personalityComment}
                                </div>
                            </motion.div>

                            {/* Inputs Container */}
                            <div className="p-6 space-y-5">
                                {/* Goals Textarea */}
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase tracking-[0.3em] text-gray-400 font-bold font-mono flex items-center gap-2">
                                        <Target className="w-3 h-3" />
                                        MISSION OBJECTIVES
                                    </label>
                                    <textarea
                                        value={goals}
                                        onChange={e => setGoals(e.target.value)}
                                        rows={3}
                                        placeholder="Enter your goals for today..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyber-cyan/50 focus:border-cyber-cyan/50 transition-all resize-none custom-scrollbar"
                                    />
                                </div>

                                {/* Available Hours */}
                                <GamifiedInput
                                    label="AVAILABLE HOURS"
                                    icon={<Clock className="w-4 h-4" />}
                                    value={availableHours}
                                    onChange={e => setAvailableHours(Number(e.target.value))}
                                    min={1}
                                    max={16}
                                    step={1}
                                    unit="h"
                                    presets={[
                                        { label: 'Short', value: 4, icon: '⚡' },
                                        { label: 'Full Day', value: 8, icon: '☀️' },
                                        { label: 'Marathon', value: 12, icon: '🔥' },
                                    ]}
                                />

                                {/* Energy Level */}
                                <div className="space-y-2">
                                    <label className="text-[9px] uppercase tracking-[0.3em] text-gray-400 font-bold font-mono flex items-center gap-2">
                                        <Zap className="w-3 h-3" />
                                        ENERGY LEVEL
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'low', label: 'LOW', icon: '🔋', color: 'border-red-500/50 bg-red-500/20' },
                                            { value: 'medium', label: 'MEDIUM', icon: '⚡', color: 'border-cyber-orange/50 bg-cyber-orange/20' },
                                            { value: 'high', label: 'HIGH', icon: '🔥', color: 'border-green-500/50 bg-green-500/20' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setEnergyLevel(opt.value)}
                                                className={cn(
                                                    "flex-1 py-2.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 border",
                                                    energyLevel === opt.value
                                                        ? `${opt.color} text-white shadow-lg`
                                                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                                                )}
                                            >
                                                {opt.icon} {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Strategy Log */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex-1 min-h-[300px]"
                        >
                            <div className="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl h-full flex flex-col overflow-hidden relative group hover:border-cyber-orange/50 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-b from-cyber-cyan/5 to-transparent pointer-events-none"></div>
                                <div className="flex items-center gap-2 p-4 text-cyber-cyan text-[10px] font-mono uppercase tracking-widest border-b border-white/10 bg-black/40">
                                    <Terminal className="w-3 h-3" />
                                    AGENT_PIPELINE.LOG
                                </div>

                                {/* Agent Network Viz */}
                                <div className="p-4 border-b border-white/5 bg-black/10">
                                    <AgentNetwork activeAgent={activeAgent} />
                                </div>

                                <div className="flex-1 p-4 overflow-hidden relative">
                                    <TypewriterLog logs={planLogs} />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Panel: Schedule & Controls */}
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full">

                        {/* Controls */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center justify-between bg-black/30 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl hover:bg-black/40 transition-all duration-300"
                        >
                            <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-mono ml-2">Optimization Strategy</span>
                            <div className="flex gap-4">
                                <ToggleButton
                                    active={strategy === 'balanced'}
                                    onClick={() => generatePlan('balanced')}
                                    icon={<Target className="w-3 h-3" />}
                                    label="BALANCED"
                                    color="blue"
                                />
                                <ToggleButton
                                    active={strategy === 'deep_focus'}
                                    onClick={() => generatePlan('deep_focus')}
                                    icon={<Brain className="w-3 h-3" />}
                                    label="DEEP FOCUS"
                                    color="purple"
                                />
                            </div>
                        </motion.div>

                        {/* Schedule View */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex-1"
                        >
                            <div className="relative group rounded-xl p-[1px] overflow-hidden h-full">
                                <span className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#00ffc8_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-[spin_4s_linear_infinite]"></span>
                                <div className="relative h-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col hover:border-cyber-gold/50 transition-all duration-300">

                                    <div className="flex justify-between items-center p-6 border-b border-white/5">
                                        <h2 className="text-xl font-bold flex items-center gap-3 text-white tracking-wide font-sans">
                                            <Calendar className="w-5 h-5 text-cyber-cyan" />
                                            OPTIMIZED SCHEDULE
                                        </h2>
                                        <div className="flex items-center gap-4">
                                            {metrics && (
                                                <div className="text-xs font-mono text-gray-400">
                                                    Focus Score: <span className="text-cyber-gold font-bold text-lg">{coaching?.focusScore || '--'}</span>/100
                                                </div>
                                            )}
                                            <div className="text-2xl font-mono text-cyber-gold font-bold tracking-tighter">
                                                {(totalScheduledMinutes / 60).toFixed(1)}h / {availableHours}h
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar relative">
                                        <AnimatePresence>
                                            {schedule.length === 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-12"
                                                >
                                                    <motion.div
                                                        animate={{
                                                            scale: [1, 1.1, 1],
                                                            rotate: [0, 5, -5, 0]
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut"
                                                        }}
                                                        className="text-7xl mb-6"
                                                    >
                                                        🧠
                                                    </motion.div>
                                                    <h3 className="text-2xl font-bold text-white mb-3 font-sans">
                                                        Ready to Optimize Your Day
                                                    </h3>
                                                    <p className="text-gray-400 font-mono text-sm max-w-md leading-relaxed">
                                                        Enter your goals and click <span className="text-cyber-cyan font-bold">BALANCED</span> or <span className="text-cyber-orange font-bold">DEEP FOCUS</span> to let 5 AI agents build your perfect schedule.
                                                    </p>
                                                    <motion.div
                                                        animate={{ y: [0, -10, 0] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="mt-6 text-4xl"
                                                    >
                                                        ⬆️
                                                    </motion.div>
                                                </motion.div>
                                            )}

                                            {/* Time-blocked schedule */}
                                            {['morning', 'afternoon', 'evening'].map(block => {
                                                const tasks = groupedSchedule[block];
                                                if (!tasks || tasks.length === 0) return null;

                                                return (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        key={block}
                                                        className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-cyber-orange/50 hover:bg-black/40 transition-all duration-300"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                            {blockIcons[block]}
                                                            {blockLabels[block]}
                                                        </div>
                                                        <div className="space-y-2">
                                                            {tasks.map((task, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={cn(
                                                                        "flex justify-between items-center p-3 rounded text-sm transition-colors border-l-2",
                                                                        priorityColors[task.priority] || 'border-gray-500/50 bg-black/30',
                                                                        task.overflow ? 'opacity-50' : ''
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan shadow-[0_0_8px_#00d9ff]"></div>
                                                                        <div className="flex-1">
                                                                            <span className="font-medium text-gray-200">{task.name}</span>
                                                                            {task.description && (
                                                                                <span className="text-[10px] text-gray-500 ml-2">{task.description}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className={cn(
                                                                            "text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold",
                                                                            task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                                            task.priority === 'high' ? 'bg-cyber-orange/20 text-cyber-orange' :
                                                                            task.priority === 'medium' ? 'bg-cyber-cyan/20 text-cyber-cyan' :
                                                                            'bg-gray-500/20 text-gray-400'
                                                                        )}>
                                                                            {task.priority}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 ml-4">
                                                                        <span className="text-[10px] text-gray-500 font-mono">{task.startTime}</span>
                                                                        <span className="font-mono text-white/90 text-xs">{task.estimatedMinutes}m</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}

                                            {/* Coaching tip */}
                                            {coaching && schedule.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4"
                                                >
                                                    <div className="flex items-center gap-2 mb-2 text-[10px] text-purple-400 font-mono uppercase tracking-widest">
                                                        <Brain className="w-3 h-3" />
                                                        COACH TIP
                                                    </div>
                                                    <p className="text-gray-300 text-sm">{coaching.topTip}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="p-6 border-t border-white/10 bg-black/30 backdrop-blur-md">
                                        <button
                                            onClick={handleCommit}
                                            disabled={schedule.length === 0}
                                            className={cn(
                                                "w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-3 border-2 relative overflow-hidden group",
                                                schedule.length > 0
                                                    ? "backdrop-blur-md bg-gradient-to-r from-cyber-cyan/20 via-cyber-orange/20 to-cyber-gold/20 border-cyber-orange text-white shadow-[0_0_30px_rgba(255,107,53,0.4)] hover:shadow-[0_0_50px_rgba(255,107,53,0.7)] hover:-translate-y-1"
                                                    : "bg-gray-800/20 border-white/10 text-gray-600 cursor-not-allowed"
                                            )}
                                        >
                                            {schedule.length > 0 && (
                                                <span className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/30 to-cyber-gold/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out"></span>
                                            )}
                                            <CheckCircle className="w-5 h-5 relative z-10" />
                                            <span className="relative z-10">
                                                {schedule.length > 0 ? (
                                                    "COMMIT TO SCHEDULE"
                                                ) : (
                                                    "AWAITING OPTIMIZATION..."
                                                )}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Commit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-black border border-white/10 w-full max-w-2xl rounded-2xl shadow-[0_0_100px_rgba(0,255,200,0.1)] overflow-hidden relative"
                        >
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-hack-green to-transparent opacity-50"></div>
                            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

                            <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-3 text-white tracking-widest uppercase font-sans">
                                    {isSimulating ? <Activity className="w-5 h-5 animate-pulse text-hack-green" /> : <CheckCircle className="w-5 h-5 text-hack-green" />}
                                    {isSimulating ? "SCHEDULING TASKS..." : "SCHEDULE COMMITTED"}
                                </h3>
                                {!isSimulating && (
                                    <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors font-mono text-xs uppercase tracking-widest">[CLOSE]</button>
                                )}
                            </div>

                            <div className="p-8 space-y-8">
                                {(isSimulating || commitResult) && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-gray-400 font-mono">
                                                <span>Calendar Sync</span>
                                                <span>{isSimulating ? "Syncing..." : "Complete"}</span>
                                            </div>
                                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 1.5, repeat: isSimulating ? Infinity : 0 }}
                                                    className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-gray-400 font-mono">
                                                <span>Task Commitments</span>
                                                <span>{isSimulating ? "Locking..." : "Locked"}</span>
                                            </div>
                                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 2.2, delay: 0.5, repeat: isSimulating ? Infinity : 0 }}
                                                    className="h-full bg-purple-500 shadow-[0_0_10px_#a855f7]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-black/50 p-6 rounded-xl font-mono text-xs h-64 overflow-y-auto border border-white/5 shadow-inner relative custom-scrollbar">
                                    <div className="space-y-3 relative z-10">
                                        {auditLog.map((log, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className={cn(
                                                    "flex gap-3 border-l-2 pl-3",
                                                    log.includes("Success") ? "border-hack-green text-white" : "border-gray-700 text-gray-500"
                                                )}
                                            >
                                                <span className="opacity-30 text-[10px] w-16">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                                <span>{log}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mission Debrief Modal */}
            <MissionDebrief
                isOpen={showDebrief}
                onClose={() => setShowDebrief(false)}
                commitResult={commitResult}
                schedule={schedule}
                metrics={metrics}
                coaching={coaching}
                availableHours={availableHours}
                reasoningLogs={planLogs}
            />
        </motion.div>
    );
}

// Styled Sub-components
function ToggleButton({ active, onClick, icon, label, color }) {
    const activeClass = color === 'blue'
        ? 'backdrop-blur-md bg-cyber-cyan/30 text-white shadow-[0_0_30px_rgba(0,217,255,0.5)] border-cyber-cyan'
        : 'backdrop-blur-md bg-purple-500/30 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] border-purple-500';

    const inactiveClass = 'backdrop-blur-md bg-white/5 border-white/20 text-gray-400 hover:border-cyber-gold/50 hover:text-white hover:bg-white/10';

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl border transition-all duration-300 text-[10px] font-bold uppercase tracking-[0.15em] hover:scale-105 active:scale-95",
                active ? activeClass : inactiveClass
            )}
        >
            {icon}
            {label}
        </button>
    );
}
