
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePortalLibrary } from '@/hooks/usePortalLibrary';
import { LibraryItem, LibraryCategory } from '@/types';
import Button from '@/components/Button';
import { BookOpenIcon, FilmIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { usePortalNavigation } from '@/hooks/usePortalNavigation';
import { BookOpen, Film, Waves, CheckCircle2, Brain, FileText, LibraryBig, X } from 'lucide-react';

const CategoryIcon = ({ category, className = "w-8 h-8" }: { category: LibraryCategory, className?: string }) => {
    switch (category) {
        case 'bibliotherapy': return <BookOpen className={className} />;
        case 'cinema': return <Film className={className} />;
        case 'mindfulness': return <Waves className={className} />;
        case 'task': return <CheckCircle2 className={className} />;
        case 'psychoeducation': return <Brain className={className} />;
        default: return <FileText className={className} />;
    }
};

const LibraryIsland: React.FC = () => {
    const { items, loading, error } = usePortalLibrary();
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
    const [mounted, setMounted] = useState(false);
    const { goBack } = usePortalNavigation();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Group items by category (optional, or just a grid)
    // For Netflix style: Rows by category?
    // Let's do a simple Grid first for simplicity.

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20 text-foreground-muted flex flex-col items-center">
                <LibraryBig className="w-8 h-8 mb-3 opacity-60 block" />
                <p>Nenhum conteúdo disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className="animate-[fadeIn_500ms_ease-out] pb-20">
            <div className="mb-8 flex items-center gap-3">
                <button onClick={() => goBack()} className="text-foreground-muted hover:text-slate-600 transition-colors">
                    ← Voltar
                </button>
                <h1 className="text-2xl font-bold text-on-surface ">Biblioteca</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {items.map(item => (
                    <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group relative aspect-[2/3] bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 block"
                    >
                        {item.coverUrl ? (
                            <img
                                src={item.coverUrl}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-foreground-muted ">
                                <div className="mb-3 text-slate-400"><CategoryIcon category={item.category} className="w-10 h-10" /></div>
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted ">{item.category}</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <span className="text-xs font-medium text-indigo-300 uppercase mb-1">{item.category}</span>
                            <h3 className="text-white font-bold leading-tight line-clamp-2">{item.title}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {mounted && selectedItem && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_500ms_ease-out]">
                    <div className=" bg-surface rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative flex flex-col md:flex-row overflow-hidden">

                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors flex items-center justify-center"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Left: Image */}
                        <div className="w-full md:w-1/3 h-64 md:h-auto relative bg-slate-200 shrink-0">
                            {selectedItem.coverUrl ? (
                                <img src={selectedItem.coverUrl} className="w-full h-full object-cover absolute inset-0" alt={selectedItem.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800">
                                    <CategoryIcon category={selectedItem.category} className="w-16 h-16" />
                                </div>
                            )}
                        </div>

                        {/* Right: Content */}
                        <div className="p-8 flex flex-col flex-1">
                            <div className="mb-auto">
                                <span className="inline-block px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
                                    {selectedItem.category}
                                </span>
                                <h2 className="text-3xl font-bold text-on-surface mb-4 leading-tight">
                                    {selectedItem.title}
                                </h2>
                                <p className=" text-foreground-muted leading-relaxed whitespace-pre-line mb-6">
                                    {selectedItem.description || "Sem descrição."}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-border ">
                                {selectedItem.url ? (
                                    <a
                                        href={selectedItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-lg hover:shadow-indigo-500/30"
                                    >
                                        Acessar Conteúdo ↗
                                    </a>
                                ) : (
                                    <p className="text-sm text-foreground-muted italic">Este item é apenas informativo.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LibraryIsland;
