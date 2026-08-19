
import React from 'react';

interface MoodSliderProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    color: string; // Tailwind color class mostly for text, e.g. "text-blue-600"
    min?: number;
    max?: number;
}

export const MoodSlider: React.FC<MoodSliderProps> = ({ label, value, onChange, color, min = 0, max = 10 }) => {
    // Generate gradient background for the track based on value
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-foreground-muted ">{label}</span>
                <span className={`font-bold ${color} bg-background px-2 py-0.5 rounded text-xs`}>
                    {value}
                </span>
            </div>
            <div className="relative h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step="1"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    style={{
                        background: `linear-gradient(to right, currentColor 0%, currentColor ${percentage}%, rgba(226, 232, 240, 1) ${percentage}%, rgba(226, 232, 240, 1) 100%)`
                    }}
                />
            </div>
        </div>
    );
};
