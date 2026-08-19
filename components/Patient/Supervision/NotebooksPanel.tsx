import React, { useState, useEffect, useCallback } from 'react';
import type { Patient, User, SupervisionNotebook, SupervisionNotebookPage, JSONContent } from '@/types.ts';
import { RichTextEditor } from '@/components/Clinical/RichTextEditor';
import { Folder, FolderOpen, FileText, Plus, Trash2, Pencil, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { generateUUID } from '@/utils/uuid.ts';
import { supabase } from '@/services/supabaseClient.ts';
import { useToast } from '@/contexts/ToastContext';

interface NotebooksPanelProps {
    patient: Patient;
    currentUser: User | null;
}

const NotebooksPanel: React.FC<NotebooksPanelProps> = ({ patient, currentUser }) => {
    const { addToast } = useToast();
    const [notebooks, setNotebooks] = useState<SupervisionNotebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fetchNotebooks = useCallback(async () => {
        if (!currentUser?.id || !patient.id) return;
        setIsLoading(true);
        try {
            const { data: nbs, error: nbError } = await supabase
                .from('supervision_notebooks')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });
                
            if (nbError) throw nbError;

            const { data: pages, error: pgError } = await supabase
                .from('supervision_notebook_pages')
                .select('*')
                .in('notebook_id', nbs?.map(n => n.id) || [])
                .order('created_at', { ascending: true });

            if (pgError) throw pgError;

            const structuredData = (nbs || []).map(nb => ({
                ...nb,
                pages: (pages || []).filter(p => p.notebook_id === nb.id)
            }));

            setNotebooks(structuredData);
            if (structuredData.length > 0 && !activePageId) {
                setExpandedNotebooks(new Set([structuredData[0].id]));
                if (structuredData[0].pages && structuredData[0].pages.length > 0) {
                    setActivePageId(structuredData[0].pages[0].id);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar cadernos:", error);
            addToast("Falha ao carregar os cadernos de supervisão.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.id, patient.id]);

    useEffect(() => {
        fetchNotebooks();
    }, [fetchNotebooks]);

    const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set(['n1']));
    const [activePageId, setActivePageId] = useState<string | null>('p1');
    const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);

    // Helpers para achar a página ativa
    const activeNotebook = notebooks.find(n => n.pages?.some(p => p.id === activePageId));
    const activePage = activeNotebook?.pages?.find(p => p.id === activePageId);

    const toggleNotebook = (notebookId: string) => {
        setExpandedNotebooks(prev => {
            const next = new Set(prev);
            if (next.has(notebookId)) next.delete(notebookId);
            else next.add(notebookId);
            return next;
        });
    };

    const handleCreateNotebook = async () => {
        if (!currentUser) return;
        const newNb: SupervisionNotebook = {
            id: generateUUID(),
            patient_id: patient.id,
            therapist_id: currentUser.id,
            title: 'Novo Caderno',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        
        // Optimistic UI
        setNotebooks(prev => [newNb, ...prev]);
        setEditingNotebookId(newNb.id);

        const { error } = await supabase.from('supervision_notebooks').insert({
            id: newNb.id,
            patient_id: newNb.patient_id,
            therapist_id: newNb.therapist_id,
            title: newNb.title
        });

        if (error) {
            console.error("Erro ao criar caderno:", error);
            addToast("Erro ao criar caderno.", "error");
            fetchNotebooks(); // Revert
        }
    };

    const handleCreatePage = async (notebookId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newPage: SupervisionNotebookPage = {
            id: generateUUID(),
            notebook_id: notebookId,
            title: 'Nova Anotação',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Optimistic UI
        setNotebooks(prev => prev.map(nb => nb.id === notebookId ? { ...nb, pages: [...(nb.pages || []), newPage] } : nb));
        setExpandedNotebooks(prev => new Set(prev).add(notebookId));
        setActivePageId(newPage.id);

        const { error } = await supabase.from('supervision_notebook_pages').insert({
            id: newPage.id,
            notebook_id: newPage.notebook_id,
            title: newPage.title,
            content: newPage.content
        });

        if (error) {
            console.error("Erro ao criar anotação:", error);
            addToast("Erro ao criar anotação.", "error");
            fetchNotebooks();
        }
    };

    const handleDeleteNotebook = async (notebookId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja apagar este Caderno INTEIRO e todas as suas anotações? Esta ação não pode ser desfeita.')) {
            // Optimistic UI
            setNotebooks(prev => prev.filter(nb => nb.id !== notebookId));
            if (activeNotebook?.id === notebookId) setActivePageId(null);

            const { error } = await supabase.from('supervision_notebooks').delete().eq('id', notebookId);
            if (error) {
                console.error("Erro ao apagar caderno:", error);
                addToast("Erro ao apagar caderno.", "error");
                fetchNotebooks();
            }
        }
    };

    const handleDeletePage = async (notebookId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Apagar esta anotação definitivamente?')) {
            // Optimistic UI
            setNotebooks(prev => prev.map(nb => nb.id === notebookId ? { ...nb, pages: (nb.pages || []).filter(p => p.id !== pageId) } : nb));
            if (activePageId === pageId) setActivePageId(null);

            const { error } = await supabase.from('supervision_notebook_pages').delete().eq('id', pageId);
            if (error) {
                console.error("Erro ao apagar anotação:", error);
                addToast("Erro ao apagar anotação.", "error");
                fetchNotebooks();
            }
        }
    };

    const updateNotebookTitle = async (notebookId: string, newTitle: string) => {
        // Optimistic UI
        setNotebooks(prev => prev.map(nb => nb.id === notebookId ? { ...nb, title: newTitle } : nb));
        
        const { error } = await supabase.from('supervision_notebooks').update({ title: newTitle, updated_at: new Date().toISOString() }).eq('id', notebookId);
        if (error) {
            console.error("Erro ao renomear caderno:", error);
            addToast("Erro ao renomear caderno.", "error");
        }
    };

    const updatePageContent = async (newContent: JSONContent) => {
        if (!activePageId || !activeNotebook) return;
        const contentStr = JSON.stringify(newContent);
        
        // Optimistic UI
        setNotebooks(prev => prev.map(nb => nb.id === activeNotebook.id ? {
            ...nb,
            pages: (nb.pages || []).map(p => p.id === activePageId ? { ...p, content: contentStr, updated_at: new Date().toISOString() } : p)
        } : nb));

        const { error } = await supabase.from('supervision_notebook_pages').update({ content: contentStr, updated_at: new Date().toISOString() }).eq('id', activePageId);
        if (error) console.error("Erro ao salvar anotação:", error);
    };

    const updatePageTitle = async (newTitle: string) => {
        if (!activePageId || !activeNotebook) return;
        // Optimistic UI
        setNotebooks(prev => prev.map(nb => nb.id === activeNotebook.id ? {
            ...nb,
            pages: (nb.pages || []).map(p => p.id === activePageId ? { ...p, title: newTitle, updated_at: new Date().toISOString() } : p)
        } : nb));

        const { error } = await supabase.from('supervision_notebook_pages').update({ title: newTitle, updated_at: new Date().toISOString() }).eq('id', activePageId);
        if (error) console.error("Erro ao renomear anotação:", error);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn h-[600px]">
            {/* Sidebar (Acordeão) */}
            <div className="lg:col-span-1 bg-surface-container-lowest border border-border/40 rounded-3xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <Folder className="w-4 h-4 text-primary" /> Explorador
                    </h3>
                    <button 
                        onClick={handleCreateNotebook}
                        className="p-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Novo Caderno"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center mt-10">
                            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : notebooks.length === 0 ? (
                        <div className="text-center mt-10">
                            <p className="text-xs text-foreground-muted italic">Nenhum caderno criado.</p>
                        </div>
                    ) : (
                        notebooks.map(notebook => {
                            const isExpanded = expandedNotebooks.has(notebook.id);
                            return (
                                <div key={notebook.id} className="select-none">
                                    {/* Header do Caderno */}
                                    <div 
                                        className="group flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                                        onClick={() => toggleNotebook(notebook.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {isExpanded ? <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" /> : <Folder className="w-4 h-4 text-foreground-muted flex-shrink-0" />}
                                            
                                            {editingNotebookId === notebook.id ? (
                                                <input 
                                                    autoFocus
                                                    className="bg-transparent border-b border-primary outline-none text-sm font-bold text-on-surface w-full"
                                                    value={notebook.title}
                                                    onChange={(e) => updateNotebookTitle(notebook.id, e.target.value)}
                                                    onBlur={() => setEditingNotebookId(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingNotebookId(null)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className="text-sm font-bold text-on-surface truncate">{notebook.title}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingNotebookId(notebook.id); }}
                                                className="p-1 text-foreground-muted hover:text-primary rounded-md"
                                                title="Renomear Caderno"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleCreatePage(notebook.id, e)}
                                                className="p-1 text-foreground-muted hover:text-primary rounded-md"
                                                title="Nova Anotação"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                                                className="p-1 text-foreground-muted hover:text-red-500 rounded-md"
                                                title="Excluir Caderno"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de Páginas do Caderno (Acordeão Aberto) */}
                                    {isExpanded && (
                                        <div className="ml-5 mt-1 border-l-2 border-border/40 pl-2 space-y-1">
                                            {(!notebook.pages || notebook.pages.length === 0) ? (
                                                <p className="text-[11px] text-foreground-muted/60 italic py-1 pl-2">Pasta vazia</p>
                                            ) : (
                                                notebook.pages.map(page => (
                                                    <div 
                                                        key={page.id}
                                                        onClick={() => setActivePageId(page.id)}
                                                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                            activePageId === page.id 
                                                                ? 'bg-primary/10 text-primary font-semibold' 
                                                                : 'text-foreground-muted hover:bg-surface-container-low hover:text-on-surface'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${activePageId === page.id ? 'text-primary' : ''}`} />
                                                            <span className="text-xs truncate">{page.title}</span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => handleDeletePage(notebook.id, page.id, e)}
                                                            className="p-1 opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-red-500 transition-opacity rounded-md flex-shrink-0"
                                                            title="Excluir Anotação"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Editor */}
            <div className="lg:col-span-3 bg-surface-container-lowest border border-border/40 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
                {activePage && activeNotebook ? (
                    <div className="flex flex-col h-full p-6">
                        {/* Breadcrumbs e Título da Anotação */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">
                                <Folder className="w-3 h-3" /> {activeNotebook.title}
                                <ChevronRight className="w-3 h-3" />
                                <FileText className="w-3 h-3" /> Anotação
                            </div>
                            <input
                                type="text"
                                value={activePage.title}
                                onChange={(e) => updatePageTitle(e.target.value)}
                                className="text-2xl font-black text-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0 placeholder:text-foreground-muted/50"
                                placeholder="Título da Anotação..."
                            />
                        </div>
                        
                        {/* RichTextEditor com scroll interno isolado */}
                        <div className="flex-1 overflow-hidden bg-surface-container-low border border-border/60 rounded-2xl flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                                <RichTextEditor 
                                    content={(() => {
                                        if (!activePage.content) return '';
                                        try {
                                            return JSON.parse(activePage.content);
                                        } catch {
                                            return activePage.content; // Fallback se já for plain text
                                        }
                                    })()}
                                    onChange={updatePageContent}
                                    placeholder="Escreva seus pensamentos clínicos aqui..."
                                    className="min-h-full border-0 focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container-lowest">
                        <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-foreground-muted/50" />
                        </div>
                        <h3 className="text-xl font-black text-foreground-muted">Nenhuma Anotação Selecionada</h3>
                        <p className="text-sm text-foreground-muted mt-2 max-w-sm">
                            Abra um caderno no explorador ao lado e selecione uma anotação, ou crie uma nova para começar a escrever.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotebooksPanel;
