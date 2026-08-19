import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Brain, Zap, Heart, Users, Building, HelpCircle } from 'lucide-react';

const SphereNode = ({ data }: { data: any }) => {
    const { label, type } = data;

    let bgClass = ' bg-surface border-border text-foreground-muted ';
    let Icon = HelpCircle;
    let sizeClass = 'w-24 h-24';
    let iconSize = 'w-6 h-6';

    switch (type) {
        case 'stressor':
            bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500 text-red-600 dark:text-red-400 shadow-sm';
            Icon = Zap;
            break;
        case 'resource':
            bgClass = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 shadow-sm';
            Icon = Heart;
            break;
        case 'family':
            bgClass = 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm';
            Icon = Users;
            break;
        case 'institution':
            bgClass = 'bg-sky-50 dark:bg-sky-900/20 border-sky-400 dark:border-sky-500 text-sky-600 dark:text-sky-400 shadow-sm';
            Icon = Building;
            break;
        case 'patient':
            bgClass = ' bg-surface  border-indigo-900 dark:border-indigo-400 border-4 border-double shadow-2xl z-10 text-indigo-900 dark:text-indigo-300';
            Icon = Brain;
            sizeClass = 'w-36 h-36';
            iconSize = 'w-10 h-10';
            break;
        default:
            break;
    }

    return (
        <div className={`rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg ${bgClass} ${sizeClass} relative`}>
            {/* Handles on all cardinal directions for flexible connections */}
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400/30 !border-0" />
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400/30 !border-0" />
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-400/30 !border-0" />
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400/30 !border-0" />

            <Icon className={`${iconSize} mb-1 opacity-90`} strokeWidth={1.5} />

            <span className="text-[10px] font-bold text-center px-2 leading-tight pointer-events-none select-none uppercase tracking-wide">
                {label}
            </span>
        </div>
    );
};

export default memo(SphereNode);
