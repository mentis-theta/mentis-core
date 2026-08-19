import React from 'react';

const BackgroundRingsNode = () => {
    return (
        <div className="w-[1500px] h-[1500px] flex items-center justify-center relative pointer-events-none select-none z-[-1]">
            {/* SVG Overlay for Rings */}
            <svg className="w-full h-full absolute inset-0 overflow-visible">
                <g transform="translate(750, 750)">
                    {/* Ring 1: Microssistema (0 - 300px) */}
                    <circle r="300" fill="hsl(var(--surface) / 0.4)" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="8,8" />
                    <text y="-280" textAnchor="middle" className="text-[11px] uppercase font-bold tracking-[0.2em] opacity-70" fill="hsl(var(--foreground-muted))">Microssistema</text>

                    {/* Ring 2: Exossistema (300 - 500px) */}
                    <circle r="500" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="8,8" />
                    <text y="-480" textAnchor="middle" className="text-[11px] uppercase font-bold tracking-[0.2em] opacity-70" fill="hsl(var(--foreground-muted))">Exossistema</text>

                    {/* Ring 3: Macrossistema (500 - 700px) */}
                    <circle r="700" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="8,8" />
                    <text y="-680" textAnchor="middle" className="text-[11px] uppercase font-bold tracking-[0.2em] opacity-70" fill="hsl(var(--foreground-muted))">Macrossistema</text>

                    {/* Center Bio Zone */}
                    <text y="-120" textAnchor="middle" className="text-[10px] uppercase font-bold tracking-widest opacity-60" fill="hsl(var(--primary))">Indivíduo (Bio)</text>
                </g>
            </svg>
        </div>
    );
};

export default BackgroundRingsNode;
