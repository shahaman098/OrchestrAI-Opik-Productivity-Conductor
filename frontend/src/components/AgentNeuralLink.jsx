import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const agents = [
    { id: 'DECOMPOSER', name: 'DECOMPOSER', color: '#00d9ff', shortName: 'DEC' },
    { id: 'PRIORITIZER', name: 'PRIORITIZER', color: '#ffa500', shortName: 'PRI' },
    { id: 'ESTIMATOR', name: 'ESTIMATOR', color: '#ff6b35', shortName: 'EST' },
    { id: 'SCHEDULER', name: 'SCHEDULER', color: '#22c55e', shortName: 'SCH' },
    { id: 'COACH', name: 'COACH', color: '#a855f7', shortName: 'COA' },
];

export default function AgentNeuralLink({ activeAgent, latestMessage }) {
    const [dataBeams, setDataBeams] = useState([]);
    const [transcript, setTranscript] = useState('');
    const [displayedTranscript, setDisplayedTranscript] = useState('');

    const activeAgentData = agents.find(a => activeAgent === a.id);

    useEffect(() => {
        if (latestMessage && activeAgentData) {
            setTranscript(`>> INCOMING TRANSMISSION [${activeAgentData.name}]: ${latestMessage.toUpperCase()}`);
        }
    }, [latestMessage, activeAgentData]);

    useEffect(() => {
        if (!transcript) return;

        let index = 0;
        setDisplayedTranscript('');

        const interval = setInterval(() => {
            if (index < transcript.length) {
                setDisplayedTranscript(transcript.substring(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 20);

        return () => clearInterval(interval);
    }, [transcript]);

    useEffect(() => {
        if (activeAgentData) {
            const sourceIndex = agents.findIndex(a => a.id === activeAgentData.id);

            const newBeams = agents
                .map((_, targetIndex) => targetIndex)
                .filter(i => i !== sourceIndex)
                .map(targetIndex => ({
                    id: `${sourceIndex}-${targetIndex}-${Date.now()}`,
                    source: sourceIndex,
                    target: targetIndex,
                }));

            setDataBeams(newBeams);

            const timeout = setTimeout(() => setDataBeams([]), 1500);
            return () => clearTimeout(timeout);
        }
    }, [activeAgentData]);

    return (
        <div className="w-full bg-black/80 backdrop-blur-md border-b border-white/10 shadow-2xl">
            <div className="relative h-24 flex items-center justify-around px-8">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {agents.map((agent, i) => {
                        const x1 = ((i + 1) / (agents.length + 1)) * 100;
                        return agents.slice(i + 1).map((_, j) => {
                            const x2 = ((i + j + 2) / (agents.length + 1)) * 100;
                            return (
                                <line
                                    key={`line-${i}-${j}`}
                                    x1={`${x1}%`}
                                    y1="50%"
                                    x2={`${x2}%`}
                                    y2="50%"
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth="1"
                                />
                            );
                        });
                    })}

                    <AnimatePresence>
                        {dataBeams.map(beam => {
                            const x1 = ((beam.source + 1) / (agents.length + 1)) * 100;
                            const x2 = ((beam.target + 1) / (agents.length + 1)) * 100;

                            return (
                                <motion.g key={beam.id}>
                                    <motion.line
                                        x1={`${x1}%`}
                                        y1="50%"
                                        x2={`${x2}%`}
                                        y2="50%"
                                        stroke={agents[beam.source].color}
                                        strokeWidth="2"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.8 }}
                                    />
                                    <motion.circle
                                        r="4"
                                        fill={agents[beam.source].color}
                                        filter="url(#glow)"
                                        initial={{ cx: `${x1}%`, cy: "50%" }}
                                        animate={{ cx: `${x2}%`, cy: "50%" }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.8, ease: "easeInOut" }}
                                    />
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>

                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                </svg>

                {agents.map((agent) => {
                    const isActive = activeAgentData?.id === agent.id;

                    return (
                        <motion.div
                            key={agent.id}
                            className="relative z-10 flex flex-col items-center gap-2"
                            animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.div
                                className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold relative"
                                style={{
                                    backgroundColor: isActive ? agent.color : 'rgba(0,0,0,0.5)',
                                    borderColor: isActive ? agent.color : 'rgba(255,255,255,0.2)',
                                    color: isActive ? '#000' : agent.color,
                                    boxShadow: isActive ? `0 0 30px ${agent.color}, 0 0 60px ${agent.color}40` : 'none',
                                }}
                            >
                                {agent.shortName}

                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2"
                                        style={{ borderColor: agent.color }}
                                        initial={{ scale: 1, opacity: 0.8 }}
                                        animate={{ scale: 1.8, opacity: 0 }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </motion.div>

                            <div
                                className="text-[8px] font-mono uppercase tracking-widest font-bold"
                                style={{ color: isActive ? agent.color : 'rgba(255,255,255,0.4)' }}
                            >
                                {agent.name}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div
                className="h-10 px-8 flex items-center font-mono text-xs uppercase tracking-wide border-t border-white/10 bg-black/60"
                style={{ color: activeAgentData?.color || '#00d9ff' }}
            >
                {displayedTranscript || '>> SYSTEM STANDBY... AWAITING GOALS'}
                {displayedTranscript.length < transcript.length && (
                    <span className="inline-block w-2 h-3 bg-current ml-1 animate-pulse" />
                )}
            </div>
        </div>
    );
}
