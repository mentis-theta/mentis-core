import React, { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { LibraryItem, LibraryCategory } from '@/types';
import Button from '../Button';
import { PlusIcon, BookOpenIcon, FilmIcon, SparklesIcon, DocumentIcon, TrashIcon, NeuronIcon, ClipboardListIcon } from '../Icons';
import { PencilIcon } from 'lucide-react';
import LibraryItemModal from './LibraryItemModal';
import AssignMaterialModal from './AssignMaterialModal';
import { TrailLibrary } from '../Psychoeducation/TrailLibrary';
import { PracticeLibrary } from '../Psychoeducation/PracticeLibrary';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useConfirm } from '@/contexts/ConfirmContext';

const ResourceLibrary: React.FC = () => {
    const { libraryItems: items, deleteLibraryItem, loading } = useLibrary();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
    const [assigningItem, setAssigningItem] = useState<LibraryItem | null>(null);
    const [filter, setFilter] = useState<LibraryCategory | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const confirm = useConfirm();

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: "Excluir Material?",
            message: "Tem certeza que deseja remover este item da biblioteca?",
            confirmText: "Sim, remover"
        });
        if (isConfirmed) {
            await deleteLibraryItem(id);
        }
    };

    const getCategoryIcon = (category: LibraryCategory) => {
        switch (category) {
            case 'bibliotherapy': return <BookOpenIcon className="w-4 h-4" />;
            case 'cinema': return <FilmIcon className="w-4 h-4" />;
            case 'mindfulness': return <SparklesIcon className="w-4 h-4" />;
            default: return <DocumentIcon className="w-4 h-4" />;
        }
    };

    const getCategoryLabel = (category: LibraryCategory) => {
        switch (category) {
            case 'bibliotherapy': return 'Livro';
            case 'cinema': return 'Filme/Série';
            case 'mindfulness': return 'Mindfulness';
            case 'psychoeducation': return 'Psicoeducação';
            case 'task': return 'Tarefa';
            default: return 'Outro';
        }
    };

    const filteredItems = items.filter(i => {
        const matchesCategory = filter === 'all' || i.category === filter;
        const matchesSearch = searchTerm === '' || 
            (i.title?.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (i.description?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Virtualização de Grid Responsivo
    const parentRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(3);

    useEffect(() => {
        const updateColumns = () => {
            if (!parentRef.current) return;
            const width = parentRef.current.offsetWidth;
            if (width < 640) setColumns(1);
            else if (width < 1024) setColumns(2);
            else if (width < 1280) setColumns(3);
            else setColumns(4);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    const rowCount = Math.ceil(filteredItems.length / columns);

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 360, // Altura estimada do card + gap
        overscan: 3,
    });

    return (
        <div className="h-full flex flex-col bg-canvas overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-canvas px-8 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div>
                    <h1 className="text-[28px] font-bold text-on-surface font-sans m-0 tracking-tight flex items-center gap-3">
                        <DocumentIcon className="w-8 h-8 text-indigo-500" />
                        Biblioteca de Materiais
                    </h1>
                    <p className="text-foreground-muted mt-1">
                        Livros, filmes e arquivos para compartilhar com seus pacientes.
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} size="lg" className="!rounded-xl px-6 py-2.5 !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> <span className="font-bold text-sm tracking-tight">Novo Material</span>
                </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="px-8 py-6 flex flex-col md:flex-row gap-4 shrink-0 bg-canvas">
                <div className="relative flex-1 max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar por título ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface-container-lowest text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-foreground-muted/60"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                    {(['all', 'bibliotherapy', 'cinema', 'mindfulness', 'psychoeducation', 'task'] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`
                            px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border shadow-sm cursor-pointer outline-none
                            ${filter === cat
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                : 'bg-surface-container-lowest text-foreground-muted border-border/40 hover:bg-surface-container-low hover:text-on-surface'}
                        `}
                    >
                        {cat === 'all' ? 'Todos' : getCategoryLabel(cat)}
                    </button>
                ))}
                </div>
            </div>

            {/* Content Grid Virtualizado */}
            <div ref={parentRef} className="flex-1 overflow-y-auto px-8 pb-12 bg-canvas scrollbar-thin">
                {items.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-surface-container-lowest rounded-3xl border border-border/40">
                        <div className="bg-surface-container-low p-6 rounded-full mb-4">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary/30">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                <path d="M8 7h6" />
                                <path d="M8 11h8" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-on-surface font-sans mb-1">Sua biblioteca de recursos está vazia.</h3>
                        <p className="text-sm text-foreground-muted font-sans max-w-xs mb-6">Crie trilhas e materiais para enviar aos seus pacientes e enriquecer o processo terapêutico.</p>
                        <Button onClick={() => setIsModalOpen(true)} className="!rounded-xl px-6 py-2.5 !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 font-bold text-sm">
                            <PlusIcon className="w-5 h-5" />
                            Criar Material
                        </Button>
                    </div>
                ) : (
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const startIndex = virtualRow.index * columns;
                            const rowItems = filteredItems.slice(startIndex, startIndex + columns);

                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                        gap: '24px',
                                        paddingBottom: '24px'
                                    }}
                                >
                                    {rowItems.map(item => (
                                        <div key={item.id} className="bg-surface-container-lowest rounded-3xl shadow-sm border border-border/40 overflow-hidden flex flex-col hover:shadow-md transition-shadow group relative h-full">
                                            {/* Cover Image */}
                                            <div className="aspect-[3/2] bg-background relative overflow-hidden group-hover:opacity-90 transition-opacity flex-shrink-0">
                                                {item.coverUrl ? (
                                                    <img
                                                        src={item.coverUrl.replace('storage://', import.meta.env.VITE_SUPABASE_URL + '/storage/v1/object/public/patient-files/')}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Sem+Capa';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-300 ">
                                                        {getCategoryIcon(item.category)}
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                                    {!item.isPublic && (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-500/80 backdrop-blur-sm text-white text-[10px] font-semibold">
                                                            Rascunho
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="absolute top-2 left-2 flex gap-1">
                                                    <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1">
                                                        {getCategoryIcon(item.category)}
                                                        {getCategoryLabel(item.category)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="font-bold text-on-surface mb-1 line-clamp-1">{item.title}</h3>
                                                <p className="text-sm text-foreground-muted line-clamp-2 mb-4 flex-1">
                                                    {item.description}
                                                </p>

                                                <div className="flex justify-between items-center pt-4 border-t border-border/40">
                                                    {item.url ? (
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-medium text-indigo-500 hover:text-indigo-600 hover:underline"
                                                        >
                                                            Acessar Link
                                                        </a>
                                                    ) : <span></span>}

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingItem(item)}
                                                            className="p-1.5 rounded-lg text-foreground-muted hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setAssigningItem(item)}
                                                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                                            title="Enviar ao Paciente"
                                                        >
                                                            Enviar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 rounded-lg text-foreground-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                            title="Remover"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <LibraryItemModal
                isOpen={isModalOpen || !!editingItem}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                initialData={editingItem}
            />

            <AssignMaterialModal
                isOpen={!!assigningItem}
                onClose={() => setAssigningItem(null)}
                libraryItem={assigningItem}
            />
        </div>
    );
};

const LibraryPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'trails' | 'resources' | 'practices'>('trails');

    return (
        <div className="h-full flex flex-col bg-canvas overflow-hidden">
            {/* Main Tabs Container */}
            <div className="bg-canvas px-8 py-4 flex shrink-0">
                <div className="bg-surface-container-low rounded-full p-1.5 flex border border-border/20 shadow-sm mx-auto sm:mx-0">
                    <button
                        onClick={() => setActiveTab('trails')}
                        className={`
                            px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer outline-none
                            ${activeTab === 'trails'
                                ? 'bg-surface-container-lowest shadow-sm text-primary'
                                : 'text-foreground-muted hover:text-on-surface'}
                        `}
                    >
                        <NeuronIcon className="w-5 h-5" />
                        Trilhas
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`
                            px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer outline-none
                            ${activeTab === 'resources'
                                ? 'bg-surface-container-lowest shadow-sm text-primary'
                                : 'text-foreground-muted hover:text-on-surface'}
                        `}
                    >
                        <DocumentIcon className="w-5 h-5" />
                        Materiais
                    </button>
                    <button
                        onClick={() => setActiveTab('practices')}
                        className={`
                            px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all cursor-pointer outline-none
                            ${activeTab === 'practices'
                                ? 'bg-surface-container-lowest shadow-sm text-violet-600 dark:text-violet-400'
                                : 'text-foreground-muted hover:text-on-surface'}
                        `}
                    >
                        <ClipboardListIcon className="w-5 h-5" />
                        Tarefas
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'trails' && <TrailLibrary />}
                {activeTab === 'resources' && <ResourceLibrary />}
                {activeTab === 'practices' && <PracticeLibrary />}
            </div>
        </div>
    );
};

export default LibraryPage;
