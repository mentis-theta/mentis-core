import React from 'react';
import type { DocumentTemplate } from '@/types';
import { TEMPLATES } from './documentTemplates';

interface TemplateSidebarProps {
    selectedTemplate: DocumentTemplate | null;
    onSelectTemplate: (template: DocumentTemplate) => void;
}

const TemplateSidebar: React.FC<TemplateSidebarProps> = React.memo(({ selectedTemplate, onSelectTemplate }) => {
    return (
        <aside data-tour="doc-sidebar" className="w-[340px] bg-white border-r border-slate-200/60 flex flex-col overflow-hidden shrink-0 z-20 shadow-sm relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    Modelos Disponíveis
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                    Selecione um formato para iniciar
                </p>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                {TEMPLATES.map((template) => {
                    const isSelected = selectedTemplate === template.id;

                    return (
                        <button
                            key={template.id}
                            onClick={() => onSelectTemplate(template.id)}
                            className={`
                                group w-full text-left p-4 rounded-xl transition-all duration-200 relative overflow-hidden
                                ${isSelected
                                    ? 'bg-indigo-50/50 border border-indigo-100/50 shadow-sm'
                                    : 'bg-transparent border border-transparent hover:bg-slate-50'
                                }
                            `}
                        >
                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>}
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${isSelected ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-sm'}`}>
                                    <span className="flex items-center justify-center">{template.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <h3 className={`font-semibold text-sm mb-1 transition-colors ${isSelected
                                        ? 'text-indigo-900'
                                        : 'text-slate-700 group-hover:text-slate-900'
                                        }`}>
                                        {template.name}
                                    </h3>
                                    <p className={`text-[13px] leading-snug line-clamp-2 transition-colors ${isSelected ? 'text-indigo-700/70' : 'text-slate-500'}`}>
                                        {template.description}
                                    </p>

                                    {/* Structure Badge */}
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className={`
                                            inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase
                                            ${template.structure === 'structured'
                                                ? 'bg-indigo-100/50 text-indigo-700'
                                                : 'bg-slate-100 text-slate-500'
                                            }
                                        `}>
                                            {template.structure === 'structured' ? 'Estruturado' : 'Texto Livre'}
                                        </span>

                                        {template.sections && (
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {template.sections.length} seções
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer Info */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-start gap-3 text-xs text-slate-500 leading-relaxed">
                    <div className="w-5 h-5 rounded-full bg-slate-200/50 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold mt-0.5">
                        i
                    </div>
                    <p>
                        Todos os modelos seguem rigorosamente as normativas vigentes do <strong className="font-semibold text-slate-700">CFP 06/2019</strong> para documentos psicoterapêuticos.
                    </p>
                </div>
            </div>
        </aside>
    );
});

export default TemplateSidebar;
