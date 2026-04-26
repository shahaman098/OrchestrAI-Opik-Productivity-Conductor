import React from 'react';
import { motion } from 'framer-motion';
import { Microscope, SearchCode, FlaskConical, Coins, ShieldCheck, Radar } from 'lucide-react';

const agents = [
    { id: 'SCOPER', name: 'SCOPER', color: 'bg-cyan-400', icon: Microscope },
    { id: 'LIT_QC', name: 'LIT_QC', color: 'bg-amber-400', icon: SearchCode },
    { id: 'PROTOCOL', name: 'PROTOCOL', color: 'bg-emerald-400', icon: FlaskConical },
    { id: 'BUDGETER', name: 'BUDGETER', color: 'bg-orange-400', icon: Coins },
    { id: 'REVIEWER', name: 'REVIEWER', color: 'bg-violet-400', icon: ShieldCheck },
    { id: 'REFLECTOR', name: 'REFLECTOR', color: 'bg-pink-400', icon: Radar },
];

export default function AgentNetwork({ activeAgent }) {
    return (
        <div className="relative w-full h-52 flex items-center justify-center">
            <div className="absolute inset-0 opacity-15">
                <div className="absolute top-1/2 left-1/2 w-full h-px bg-white/20 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 w-full h-px bg-white/20 -translate-x-1/2 -translate-y-1/2 rotate-60" />
                <div className="absolute top-1/2 left-1/2 w-full h-px bg-white/20 -translate-x-1/2 -translate-y-1/2 rotate-120" />
            </div>

            <div className="relative w-44 h-44">
                {agents.map((agent, index) => {
                    const angle = (index * 60 - 90) * (Math.PI / 180);
                    const radius = 76;
                    const x = Math.cos(angle) * radius + 88 - 22;
                    const y = Math.sin(angle) * radius + 88 - 22;
                    const isActive = activeAgent === agent.id;

                    return (
                        <motion.div
                            key={agent.id}
                            className={`absolute w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                isActive
                                    ? `${agent.color} border-white scale-125 shadow-[0_0_24px_rgba(255,255,255,0.18)] z-20`
                                    : 'bg-black/45 border-white/15 text-gray-400 z-10'
                            }`}
                            style={{ left: x, top: y }}
                            animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                            transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
                        >
                            <agent.icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-gray-400'}`} />
                            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-mono uppercase tracking-[0.25em] whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                {agent.name}
                            </div>
                        </motion.div>
                    );
                })}

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur">
                    <div className={`w-2.5 h-2.5 rounded-full ${activeAgent ? 'bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-white/15'}`} />
                </div>
            </div>
        </div>
    );
}
