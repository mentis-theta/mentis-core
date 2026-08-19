import React from 'react';

interface IslandCardProps {
    title: string;
    description: string;
    icon: React.ReactNode; // Emoji or Icon component
    gradient: string; // e.g., 'from-purple-600 to-indigo-700'
    onClick?: () => void;
    badge?: string | number | null;
    locked?: boolean;
}

export const IslandCard: React.FC<IslandCardProps> = ({
    title,
    description,
    icon,
    gradient,
    onClick,
    badge,
    locked = false
}) => {
    return (
        <div
            onClick={!locked ? onClick : undefined}
            className={`
                relative overflow-hidden rounded-[2rem] p-6 text-white shadow-lg transition-all duration-300
                bg-gradient-to-br ${gradient}
                ${locked ? 'opacity-80 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02]'}
                group h-48 md:h-64 flex flex-col justify-between
            `}
        >
            {/* Background Icon / Watermark */}
            <div className={`absolute -right-4 -bottom-8 text-[8rem] md:text-[10rem] opacity-10 group-hover:opacity-20 transition-opacity duration-500 select-none pointer-events-none transform rotate-12 ${locked ? '' : 'group-hover:rotate-0 group-hover:scale-110'}`}>
                {icon}
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    {/* Badge - High Visibility */}
                    <div className="absolute top-0 right-0 animate-bounce-slow">
                        <span className="bg-red-100/90 backdrop-blur-sm border-2 border-white/80 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            {badge}
                        </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-md tracking-tight">
                        {title}
                        {locked && <span className="ml-2 text-xs opacity-70 bg-black/20 px-2 py-1 rounded-full align-middle">Em Breve</span>}
                    </h3>
                    <p className="text-white/90 text-sm md:text-base font-medium max-w-[80%] leading-relaxed drop-shadow-sm">
                        {description}
                    </p>
                </div>

                {/* Call to Action */}
                {!locked && (
                    <div className="self-start mt-4">
                        <span className="inline-flex items-center gap-2 bg-surface/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold transition-colors">
                            Entrar
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                    </div>
                )}
                {locked && (
                    <div className="self-start mt-4 opacity-50">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-white/20">
                            Bloqueado
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </span>
                    </div>
                )}
            </div>

            {/* Visual Shine Effect on Hover */}
            {!locked && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>
            )}
        </div>
    );
};
