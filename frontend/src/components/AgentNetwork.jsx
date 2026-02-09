import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ListChecks, Timer, CalendarClock, Sparkles } from 'lucide-react';

const agents = [
    { id: 'DECOMPOSER', name: 'DECOMPOSER', color: 'bg-cyber-cyan', icon: ListChecks },
    { id: 'PRIORITIZER', name: 'PRIORITIZER', color: 'bg-cyber-gold', icon: Brain },
    { id: 'ESTIMATOR', name: 'ESTIMATOR', color: 'bg-cyber-orange', icon: Timer },
    { id: 'SCHEDULER', name: 'SCHEDULER', color: 'bg-green-500', icon: CalendarClock },
    { id: 'COACH', name: 'COACH', color: 'bg-purple-500', icon: Sparkles },
];

export default function AgentNetwork({ activeAgent }) {
    return (
        <div className="relative w-full h-48 flex items-center justify-center mb-4">
            {/* Connecting Lines (Pentagon) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <polygon points="50,50 90,20 100,60 60,90 20,60" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Connection Lines (CSS) */}
            <div className="absolute inset-0 opacity-20 animate-pulse">
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-0"></div>
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-72"></div>
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-144"></div>
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-[216deg]"></div>
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-[288deg]"></div>
            </div>

            {/* Agents */}
            <div className="relative w-40 h-40">
                {agents.map((agent, index) => {
                    const angle = (index * 72 - 90) * (Math.PI / 180);
                    const radius = 70;
                    const x = Math.cos(angle) * radius + 80 - 20;
                    const y = Math.sin(angle) * radius + 80 - 20;

                    const isActive = activeAgent === agent.id;

                    return (
                        <motion.div
                            key={agent.id}
                            className={`absolute w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 ${isActive ? agent.color + ' border-white scale-125 shadow-[0_0_30px_currentColor] z-20' : 'bg-black/40 text-gray-500 z-10'}`}
                            style={{ left: x, top: y }}
                            animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
                        >
                            <agent.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-500'}`} />

                            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-[7px] font-mono uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${isActive ? 'opacity-100 text-white font-bold scale-110' : 'opacity-70 text-gray-400'}`}>
                                {agent.name}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Central Brain/Core */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <div className={`w-2 h-2 rounded-full ${activeAgent ? 'bg-white shadow-[0_0_10px_white] animate-ping' : 'bg-gray-800'}`}></div>
                </div>
            </div>
        </div>
    );
}
