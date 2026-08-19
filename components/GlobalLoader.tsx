import React from 'react';

const GlobalLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
            <div className="relative flex flex-col items-center">
                {/* Glow effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/30 blur-[50px] rounded-full animate-pulse"></div>
                
                {/* Logo wrapper with subtle breathing animation */}
                <div className="relative animate-pulse-soft flex flex-col items-center gap-5">
                    {/* Mentis Logo (Same as login) */}
                    <div className="w-16 h-16 relative flex items-center justify-center transition-transform duration-300 hover:scale-105">
                        <img 
                            src="/icon-512.svg" 
                            alt="Mentis" 
                            className="w-full h-full drop-shadow-sm animate-cinematic-logo" 
                            draggable={false} 
                        />
                    </div>
                    
                    <span className="text-sm font-medium text-primary/80 tracking-[0.2em] uppercase">
                        Carregando
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GlobalLoader;
