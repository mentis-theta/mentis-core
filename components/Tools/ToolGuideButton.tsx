import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import Modal from '@/components/Modal';
import { toolGuides } from './toolGuides';

export interface ToolGuideButtonProps {
    toolId?: string;
}

const ToolGuideButton: React.FC<ToolGuideButtonProps> = ({ toolId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const guide = toolId ? toolGuides[toolId] : undefined;

    if (!guide) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                title="Como usar esta ferramenta"
                className="inline-flex items-center justify-center p-1.5 rounded-full text-foreground-muted/50 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
            >
                <HelpCircle className="w-5 h-5" />
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title=""
                size="xl"
            >
                <div className="space-y-8 pb-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-2xl">
                            <HelpCircle className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-tight">
                                {guide.title}
                            </h2>
                            <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-widest opacity-60">
                                {guide.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Sections */}
                    {guide.sections.map((section: { title: string; items: string[] }, sIdx: number) => {
                        const colors = ['indigo', 'emerald', 'amber', 'cyan'];
                        const color = colors[sIdx % colors.length];

                        return (
                            <section key={sIdx}>
                                <h3 className={`text-base font-black text-foreground mb-4 border-l-4 border-${color}-500 pl-3 uppercase tracking-tight`}>
                                    {section.title}
                                </h3>

                                <div className="bg-surface-container-low/50 p-6 rounded-[32px] border border-border/20">
                                    <ul className="text-sm text-foreground-muted space-y-3">
                                        {section.items.map((item: string, iIdx: number) => (
                                            <li key={iIdx} className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        );
                    })}

                    {/* CTA */}
                    <div className="pt-6 flex justify-center">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full sm:w-auto px-12 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-3xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95"
                        >
                            ENTENDI!
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ToolGuideButton;
