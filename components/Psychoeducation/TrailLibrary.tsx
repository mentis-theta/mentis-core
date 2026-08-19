import React, { useState, useMemo } from 'react';
import { useTrails } from '@/hooks/useTrails';
import { Trail } from '@/types';
import {
    BookOpenIcon,
    PlusIcon,
    DocumentDuplicateIcon,
    PencilIcon,
    TrashIcon,
    PlayIcon
} from '@/components/Icons';
import { TrailBuilder } from './TrailBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Library, Users, FileBarChart } from 'lucide-react';

export const TrailLibrary: React.FC = () => {
    const { trails, loading, deleteTrail, duplicateTrail, refresh } = useTrails(undefined, 'psychoeducation');
    const { currentUser } = useAuth();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
    const confirm = useConfirm();

    // Filter trails
    const myTrails = trails.filter(t => t.author_id === currentUser?.id);
    const systemTrails = trails.filter(t => t.is_template === true && t.author_id !== currentUser?.id); // Assuming templates don't belong to current user for this view, or we just separate them.

    const handleCreateNew = () => {
        setSelectedTrail(null);
        setIsBuilderOpen(true);
    };

    const handleEdit = (trail: Trail) => {
        setSelectedTrail(trail);
        setIsBuilderOpen(true);
    };

    const handleDuplicate = async (trail: Trail) => {
        const isConfirmed = await confirm({
            title: "Duplicar Trilha",
            message: `Deseja duplicar a trilha "${trail.title}" para seus conteúdos?`,
            confirmText: "Duplicar"
        });
        if (isConfirmed) {
            await duplicateTrail(trail.id);
        }
    };

    const handleDelete = async (trailId: string) => {
        const isConfirmed = await confirm({
            title: "Excluir Trilha",
            message: "Tem certeza que deseja excluir esta trilha?",
            confirmText: "Excluir"
        });
        if (isConfirmed) {
            await deleteTrail(trailId);
        }
    };

    const handleCloseBuilder = () => {
        setIsBuilderOpen(false);
        setSelectedTrail(null);
        refresh(); // Refresh list after edit/create
    };

    if (isBuilderOpen) {
        return (
            <TrailBuilder
                initialTrail={selectedTrail}
                onClose={handleCloseBuilder}
                trailType="psychoeducation"
            />
        );
    }

    if (loading) return (
        <div className="h-full flex items-center justify-center bg-canvas">
            <div className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-foreground-muted">Carregando biblioteca...</span>
            </div>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto px-8 pb-12 bg-canvas space-y-12 animate-fadeIn scrollbar-thin">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
                <div>
                    <h1 className="text-[28px] font-bold text-on-surface font-sans m-0 tracking-tight flex items-center gap-3">
                        <BookOpenIcon className="h-8 w-8 text-blue-600" />
                        Trilhas & Cursos
                    </h1>
                    <p className="text-foreground-muted mt-1 text-lg">
                        Gerencie seus conteúdos psicoeducativos e explore modelos prontos para seus pacientes.
                    </p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer outline-none"
                >
                    <PlusIcon className="h-5 w-5" />
                    Nova Trilha
                </button>
            </header>

            {/* Section 1: My Content */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-foreground-muted ">
                        Meus Conteúdos
                    </h2>
                    <span className="bg-background text-foreground-muted px-3 py-1 rounded-full text-xs font-bold">
                        {myTrails.length}
                    </span>
                </div>

                {myTrails.length === 0 ? (
                    <div className="bg-surface-container-lowest rounded-3xl p-16 text-center border-2 border-dashed border-border/40">
                        <BookOpenIcon className="h-16 w-16 text-slate-300 mx-auto mb-4 opacity-50" />
                        <h3 className="text-on-surface font-bold text-lg mb-2">Você ainda não criou nenhuma trilha</h3>
                        <p className="text-foreground-muted mb-8 max-w-md mx-auto">Comece do zero ou duplique um modelo da biblioteca Mentis abaixo para seus conteúdos.</p>
                        <button onClick={handleCreateNew} className="text-primary font-bold hover:underline cursor-pointer outline-none">
                            Criar minha primeira trilha
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myTrails.map(trail => (
                            <TrailCard
                                key={trail.id}
                                trail={trail}
                                isOwner={true}
                                onEdit={() => handleEdit(trail)}
                                onDelete={() => handleDelete(trail.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 2: System Library */}
            <section className="space-y-6">
                <div className="flex items-center gap-4 border-b border-border pb-4">
                    <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <Library className="w-6 h-6" /> Biblioteca Mentis
                    </h2>
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">
                        {systemTrails.length}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {systemTrails.map(trail => (
                        <TrailCard
                            key={trail.id}
                            trail={trail}
                            isOwner={false} // System trails are not owned by user (usually)
                            onDuplicate={() => handleDuplicate(trail)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

// Sub-component for Cards
const TrailCard: React.FC<{
    trail: Trail;
    isOwner: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}> = ({ trail, isOwner, onEdit, onDelete, onDuplicate }) => {
    return (
        <div className="bg-surface-container-lowest rounded-3xl border border-border/40 shadow-sm hover:shadow-md transition-all group flex flex-col h-full overflow-hidden">
            <div className={`h-1.5 w-full ${isOwner ? 'bg-primary' : 'bg-indigo-500'}`}></div>
            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl ${isOwner ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'}`}>
                        {trail.icon_url && trail.icon_url.length < 5 ? trail.icon_url : <BookOpenIcon className="h-5 w-5" />}
                    </div>
                    {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                                className="p-2 text-foreground-muted hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar"
                            >
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                                className="p-2 text-foreground-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Excluir"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {!isOwner && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
                            className="p-2 text-foreground-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Duplicar para meus conteúdos"
                        >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <h3 className="font-bold text-lg text-on-surface mb-2 line-clamp-1">
                    {trail.title}
                </h3>
                <p className="text-sm text-foreground-muted line-clamp-3 mb-6 flex-1">
                    {trail.description || "Sem descrição definida."}
                </p>

                <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-bold text-foreground-muted mt-auto pt-4 border-t border-border/40 flex-wrap">
                    <span className="flex items-center gap-1">
                        <BookOpenIcon className="h-3 w-3" />
                        {(trail.modules || []).length} Módulos
                    </span>

                    {/* Clinical Badges */}
                    {(trail as any).assignment_count > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 ring-1 ring-indigo-100 dark:ring-indigo-800/50">
                            <Users className="w-3 h-3" /> {(trail as any).assignment_count} {(trail as any).assignment_count === 1 ? 'paciente' : 'pacientes'}
                        </span>
                    )}
                    {trail.is_template && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-100 dark:ring-amber-800/50">
                            <FileBarChart className="w-3 h-3" /> Template
                        </span>
                    )}

                    {isOwner && (
                        <span className="ml-auto">
                            {new Date(trail.created_at).toLocaleDateString()}
                        </span>
                    )}
                    {!isOwner && (
                        <span className="ml-auto text-indigo-500 font-medium">Modelo</span>
                    )}
                </div>
            </div>
            {isOwner && (
                <button
                    onClick={onEdit}
                    className="w-full py-4 bg-surface-container-lowest hover:bg-surface-container-low border-t border-border/40 text-sm font-bold text-foreground-muted hover:text-on-surface transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
                >
                    <PencilIcon className="h-4 w-4" />
                    Gerenciar Trilha
                </button>
            )}
            {!isOwner && (
                <button
                    onClick={onDuplicate}
                    className="w-full py-4 bg-primary/5 hover:bg-primary/10 border-t border-primary/10 text-sm font-bold text-primary transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
                >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    Usar este Modelo
                </button>
            )}
        </div>
    );
};

