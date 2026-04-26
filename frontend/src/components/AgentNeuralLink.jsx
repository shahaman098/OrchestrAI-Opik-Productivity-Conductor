import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const agents = [
    { id: 'SCOPER', name: 'SCOPER', color: '#22d3ee', shortName: 'SCP' },
    { id: 'LIT_QC', name: 'LIT_QC', color: '#f59e0b', shortName: 'LQC' },
    { id: 'PROTOCOL', name: 'PROTOCOL', color: '#34d399', shortName: 'PTL' },
    { id: 'BUDGETER', name: 'BUDGETER', color: '#fb923c', shortName: 'BDG' },
    { id: 'REVIEWER', name: 'REVIEWER', color: '#a78bfa', shortName: 'REV' },
    { id: 'REFLECTOR', name: 'REFLECTOR', color: '#f472b6', shortName: 'RFX' },
];

export default function AgentNeuralLink({ activeAgent, latestMessage }) {
    const [transcript, setTranscript] = useState('');
    const [displayedTranscript, setDisplayedTranscript] = useState('');
    const [dataBeams, setDataBeams] = useState([]);

    const activeAgentData = agents.find(agent => agent.id === activeAgent);

    useEffect(() => {
        if (latestMessage && activeAgentData) {
            setTranscript(`>> ${activeAgentData.name} :: ${latestMessage.toUpperCase()}`);
        }
    }, [latestMessage, activeAgentData]);

    useEffect(() => {
        if (!transcript) return undefined;

        let index = 0;
        setDisplayedTranscript('');

        const interval = setInterval(() => {
            if (index < transcript.length) {
                setDisplayedTranscript(transcript.substring(0, index + 1));
                index += 1;
            } else {
                clearInterval(interval);
            }
        }, 14);

        return () => clearInterval(interval);
    }, [transcript]);

    useEffect(() => {
        if (!activeAgentData) return undefined;

        const sourceIndex = agents.findIndex(agent => agent.id === activeAgentData.id);
        const beams = agents
            .map((_, targetIndex) => targetIndex)
            .filter(index => index !== sourceIndex)
            .map(targetIndex => ({
                id: `${sourceIndex}-${targetIndex}-${Date.now()}`,
                source: sourceIndex,
                target: targetIndex,
            }));

        setDataBeams(beams);
        const timeout = setTimeout(() => setDataBeams([]), 1200);
        return () => clearTimeout(timeout);
    }, [activeAgentData]);

    return (
        <div className="w-full bg-black/75 backdrop-blur-xl border-b border-white/10">
            <div className="relative h-24 px-8 flex items-center justify-around">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {agents.map((agent, index) => {
                        const x1 = ((index + 1) / (agents.length + 1)) * 100;
                        return agents.slice(index + 1).map((_, offset) => {
                            const x2 = ((index + offset + 2) / (agents.length + 1)) * 100;
                            return (
                                <line
                                    key={`${agent.id}-${offset}`}
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
                                        transition={{ duration: 0.7 }}
                                    />
                                    <motion.circle
                                        r="4"
                                        fill={agents[beam.source].color}
                                        initial={{ cx: `${x1}%`, cy: '50%' }}
                                        animate={{ cx: `${x2}%`, cy: '50%' }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                                    />
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {agents.map(agent => {
                    const isActive = activeAgent === agent.id;
                    return (
                        <motion.div
                            key={agent.id}
                            animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative z-10 flex flex-col items-center gap-2"
                        >
                            <div
                                className="w-12 h-12 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold relative"
                                style={{
                                    backgroundColor: isActive ? agent.color : 'rgba(0,0,0,0.45)',
                                    borderColor: isActive ? agent.color : 'rgba(255,255,255,0.18)',
                                    color: isActive ? '#020617' : agent.color,
                                    boxShadow: isActive ? `0 0 28px ${agent.color}` : 'none',
                                }}
                            >
                                {agent.shortName}
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full border"
                                        style={{ borderColor: agent.color }}
                                        initial={{ scale: 1, opacity: 0.7 }}
                                        animate={{ scale: 1.65, opacity: 0 }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                )}
                            </div>
                            <div className="text-[8px] font-mono uppercase tracking-[0.25em]" style={{ color: isActive ? agent.color : 'rgba(255,255,255,0.45)' }}>
                                {agent.name}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="h-10 px-8 flex items-center border-t border-white/10 bg-black/50 font-mono text-xs tracking-wide" style={{ color: activeAgentData?.color || '#22d3ee' }}>
                {displayedTranscript || '>> SYSTEM STANDBY :: WAITING FOR HYPOTHESIS'}
                {displayedTranscript.length < transcript.length && (
                    <span className="inline-block w-2 h-3 bg-current ml-1 animate-pulse" />
                )}
            </div>
        </div>
    );
}
