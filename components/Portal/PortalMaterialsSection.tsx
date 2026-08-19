import React from 'react';
import { PatientMaterial } from '@/types';
import { usePatientMaterials } from '@/hooks/usePatientMaterials';
import { BookOpenIcon, ExternalLinkIcon, CheckCircleIcon } from 'lucide-react';

interface PortalMaterialsSectionProps {
    patientId: string;
}

export const PortalMaterialsSection: React.FC<PortalMaterialsSectionProps> = ({ patientId }) => {
    // The patient reads their own materials (the hook uses currentUser under the hood, patientId is just for semantic matching or we can rely on hook's internal logic)
    const { myMaterials, loadingMyMaterials, markAsRead } = usePatientMaterials();

    if (loadingMyMaterials) {
        return <div className="animate-pulse h-32 bg-surface/20 rounded-2xl mb-8"></div>;
    }

    if (!myMaterials || myMaterials.length === 0) {
        return null; // Don't render anything if there are no materials
    }

    return (
        <section className="mb-10 animate-[fadeIn_600ms_ease-out_400ms_both]">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-on-surface flex items-center">
                    <BookOpenIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    Biblioteca de Apoio
                </h2>
                <span className="text-xs text-foreground-muted font-medium">{myMaterials.length} material(s)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myMaterials.map(material => (
                    <div 
                        key={material.id} 
                        className={`
                            bg-surface rounded-2xl border transition-all duration-300 relative overflow-hidden group
                            ${material.read_at ? 'border-border/40 opacity-75' : 'border-indigo-500/30 shadow-md shadow-indigo-500/5'}
                        `}
                    >
                        {/* Status Indicator */}
                        {!material.read_at && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full flex items-start justify-end p-2 z-10">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                </span>
                            </div>
                        )}

                        {/* Image/Cover (Optional) */}
                        {material.cover_url && (
                            <div className="h-32 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden">
                                <img 
                                    src={material.cover_url} 
                                    alt={material.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                        )}

                        <div className="p-5">
                            <div className="flex gap-2 mb-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                    {material.category}
                                </span>
                            </div>
                            
                            <h3 className="font-bold text-on-surface text-base mb-1 line-clamp-1">{material.title}</h3>
                            <p className="text-sm text-foreground-muted line-clamp-2 mb-4 h-10">
                                {material.description || 'Nenhuma descrição fornecida.'}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-border/40">
                                {material.url ? (
                                    <a 
                                        href={material.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                        onClick={() => {
                                            if (!material.read_at) markAsRead(material.id);
                                        }}
                                    >
                                        Acessar Material <ExternalLinkIcon className="w-3.5 h-3.5" />
                                    </a>
                                ) : (
                                    <button 
                                        className={`text-sm font-semibold flex items-center gap-1 ${material.read_at ? 'text-green-600' : 'text-indigo-600'}`}
                                        onClick={() => {
                                            if (!material.read_at) markAsRead(material.id);
                                        }}
                                    >
                                        {material.read_at ? (
                                            <><CheckCircleIcon className="w-4 h-4" /> Visto</>
                                        ) : 'Marcar como visto'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
