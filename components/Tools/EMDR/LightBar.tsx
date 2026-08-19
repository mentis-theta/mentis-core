import React from 'react';
import { Play, Pause } from 'lucide-react';

export interface LightBarProps {
    speed: 'slow' | 'medium' | 'fast';
    color: string;
    isPlaying: boolean;
}

const LightBar: React.FC<LightBarProps> = ({ speed, color, isPlaying }) => {
    // Duração do ciclo de ida e volta baseado na velocidade
    const duration = speed === 'slow' ? '3s' : speed === 'medium' ? '1.5s' : '0.8s';

    return (
        <div className="w-full flex flex-col items-center gap-6">
            <div className="w-full max-w-4xl relative flex items-center justify-center py-12 px-8 bg-slate-900 rounded-3xl shadow-inner border border-slate-800">
                {/* Trilho da barra */}
                <div className="w-full h-8 bg-black/50 rounded-full relative shadow-inner overflow-hidden border border-white/5">
                    {/* Ponto Luminoso (O Dot) */}
                    <div
                        className="absolute top-0 bottom-0 w-8 h-8 rounded-full"
                        style={{
                            backgroundColor: color,
                            boxShadow: `0 0 25px 5px ${color}`,
                            animationName: 'shuttle',
                            animationDuration: duration,
                            animationIterationCount: 'infinite',
                            animationDirection: 'alternate',
                            animationTimingFunction: 'ease-in-out',
                            animationPlayState: isPlaying ? 'running' : 'paused',
                            willChange: 'transform' // Otimização de GPU
                        }}
                    />
                </div>

                {/* CSS Inline para a animação do ponto. A performance é ótima focando apenas no transform X */}
                <style>{`
                    @keyframes shuttle {
                        0% { left: 0%; transform: translateX(0); }
                        100% { left: 100%; transform: translateX(-100%); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default LightBar;
