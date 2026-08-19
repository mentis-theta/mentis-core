import React, { useState, useEffect, useRef } from 'react';
import { BreathingPattern } from './BreathingTool';
import { XMarkIcon, PlayIcon, PauseIcon } from '@/components/Icons';

interface BreathingPlayerProps {
    pattern: BreathingPattern;
    onFinish: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdEmpty';

export const BreathingPlayer: React.FC<BreathingPlayerProps> = ({ pattern, onFinish }) => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState<Phase>('inhale');
    const [phaseTimeLeft, setPhaseTimeLeft] = useState(pattern.inhale);

    // Animation Ref
    const circleRef = useRef<HTMLDivElement>(null);

    // Initial Start
    useEffect(() => {
        setIsActive(true);
    }, []);

    // Main Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            onFinish();
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, onFinish]);

    // Phase Logic
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (isActive) {
            const nextPhaseMap: Record<Phase, Phase> = {
                'inhale': pattern.hold > 0 ? 'hold' : 'exhale',
                'hold': 'exhale',
                'exhale': pattern.holdEmpty > 0 ? 'holdEmpty' : 'inhale',
                'holdEmpty': 'inhale'
            };

            const durationMap: Record<Phase, number> = {
                'inhale': pattern.inhale,
                'hold': pattern.hold,
                'exhale': pattern.exhale,
                'holdEmpty': pattern.holdEmpty
            };

            // Set Animation — M3 standard easing (cubic-bezier(0.2, 0, 0, 1))
            if (circleRef.current) {
                circleRef.current.style.transitionDuration = `${durationMap[phase]}s`;
                circleRef.current.style.transitionTimingFunction = 'cubic-bezier(0.2, 0, 0, 1)';

                if (phase === 'inhale') {
                    circleRef.current.style.transform = 'scale(1.5)';
                    circleRef.current.style.opacity = '0.9';
                } else if (phase === 'exhale') {
                    circleRef.current.style.transform = 'scale(1)';
                    circleRef.current.style.opacity = '0.6';
                }
                // Holds keep the previous state
            }

            timeout = setTimeout(() => {
                const next = nextPhaseMap[phase];
                setPhase(next);
            }, durationMap[phase] * 1000);
        }

        return () => clearTimeout(timeout);
    }, [isActive, phase, pattern]);

    // Text Helpers
    const getPhaseText = () => {
        switch (phase) {
            case 'inhale': return 'Inspire...';
            case 'hold': return 'Segure...';
            case 'exhale': return 'Expire...';
            case 'holdEmpty': return 'Mantenha...';
        }
    };

    const getPhaseColor = () => {
        switch (phase) {
            case 'inhale': return 'from-indigo-300 to-violet-400';
            case 'hold': return 'from-violet-300 to-purple-400';
            case 'exhale': return 'from-sky-300 to-indigo-400';
            case 'holdEmpty': return 'from-slate-300 to-indigo-300';
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white animate-[fadeIn_800ms_ease-out]">

            {/* Header / Controls */}
            <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className="h-11 w-11 flex items-center justify-center rounded-full bg-surface/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-md"
                    >
                        {isActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                    <span className="font-mono text-lg text-white/60">{formatTime(timeLeft)}</span>
                </div>
                <button
                    onClick={onFinish}
                    className="flex items-center h-10 px-5 rounded-full bg-surface/10 hover:bg-red-100/10 text-white/70 hover:text-red-200 transition-all duration-300 backdrop-blur-md text-sm font-medium"
                >
                    <XMarkIcon className="w-4 h-4 mr-1.5" />
                    Encerrar
                </button>
            </div>

            {/* Main Visualizer */}
            <div className="relative flex items-center justify-center w-full h-full">

                {/* Background Glow — M3 standard easing */}
                <div className={`
                    absolute w-[28rem] h-[28rem] rounded-full blur-[120px]
                    transition-all ease-[cubic-bezier(0.2,0,0,1)]
                    ${phase === 'inhale' ? 'scale-125 opacity-25 bg-indigo-500/30 duration-[4s]' : 'scale-100 opacity-10 bg-indigo-500/20 duration-[4s]'}
                `}></div>

                {/* Outer Ring Glow */}
                <div className={`
                    absolute w-72 h-72 rounded-full border border-white/5
                    transition-all ease-[cubic-bezier(0.2,0,0,1)]
                    ${phase === 'inhale' ? 'scale-[1.6] opacity-100 duration-[4s]' : phase === 'exhale' ? 'scale-100 opacity-40 duration-[4s]' : 'opacity-60'}
                `}></div>

                {/* The Blob — with M3 easing */}
                <div
                    ref={circleRef}
                    className={`w-56 h-56 rounded-full bg-gradient-to-br ${getPhaseColor()} shadow-[0_0_80px_rgba(99,102,241,0.3)] transition-all`}
                    style={{ transitionProperty: 'transform, opacity' }}
                ></div>

                {/* Text Overlay */}
                <div className="absolute z-10 text-center pointer-events-none">
                    <h2 className="text-3xl md:text-5xl font-extralight tracking-[0.2em] text-white/90 transition-opacity duration-500">
                        {getPhaseText()}
                    </h2>
                </div>
            </div>

            {/* Pattern Info */}
            <div className="absolute bottom-8 text-center">
                <p className="text-sm text-white/30 font-medium">{pattern.label}</p>
                <p className="font-mono text-xs text-white/20 mt-1">{pattern.inhale} - {pattern.hold} - {pattern.exhale} - {pattern.holdEmpty}</p>
            </div>

        </div>
    );
};
