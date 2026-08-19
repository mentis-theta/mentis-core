import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useLibrary } from '@/hooks/useLibrary';
import { LibraryCategory, LibraryItem } from '@/types';
import Button from '../Button';
import { XMarkIcon, DocumentIcon, PhotoIcon } from '../Icons';
import { useFileStorage } from '@/hooks/useFileStorage';

interface LibraryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: LibraryItem | null;
}

const LibraryItemModal: React.FC<LibraryItemModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const { createLibraryItem, updateLibraryItem, loading } = useLibrary();
    const { uploadFile, uploading } = useFileStorage();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<LibraryCategory>('bibliotherapy');
    const [url, setUrl] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            if (initialData) {
                setTitle(initialData.title);
                setDescription(initialData.description || '');
                setCategory(initialData.category as LibraryCategory || 'bibliotherapy');
                setUrl(initialData.url || '');
            } else {
                setTitle('');
                setDescription('');
                setCategory('bibliotherapy');
                setUrl('');
            }
            setCoverFile(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        let coverUrl = '';
        try {
            if (coverFile) {
                const result = await uploadFile('library-covers', coverFile);
                if (result) {
                    coverUrl = 'storage://' + result.path;
                }
            }

            let success = false;

            if (initialData) {
                success = await updateLibraryItem(initialData.id, {
                    title,
                    description,
                    category,
                    url,
                    ...(coverUrl ? { coverUrl } : {})
                });
            } else {
                success = await createLibraryItem({
                    title,
                    description,
                    category,
                    url,
                    coverUrl: coverUrl || undefined
                });
            }

            if (success) {
                if (onSuccess) onSuccess();
                onClose();
                // Reset form
                setTitle('');
                setDescription('');
                setCategory('bibliotherapy');
                setUrl('');
                setCoverFile(null);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Material" : "Novo Material"}
            size="xl"
        >
            <div className="flex flex-col max-h-[90vh]">


                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            placeholder="Ex: Divertida Mente"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as LibraryCategory)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        >
                            <option value="bibliotherapy">Biblioterapia (Livro)</option>
                            <option value="cinema">Cinematerapia (Filme/Série)</option>
                            <option value="mindfulness">Mindfulness (Áudio/Vídeo)</option>
                            <option value="psychoeducation">Psicoeducação (Artigo/Material)</option>
                            <option value="task">Tarefa Comportamental</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">Link / URL (Opcional)</label>
                        <input
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            placeholder="https://..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">Descrição</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface dark:bg-slate-700 text-on-surface focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            placeholder="Por que este item é recomendado..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">Capa (Imagem)</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-background dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <PhotoIcon className="w-5 h-5 text-foreground-muted " />
                                <span className="text-sm text-foreground-muted ">Escolher Imagem</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => setCoverFile(e.target.files?.[0] || null)}
                                />
                            </label>
                            {coverFile && <span className="text-sm text-green-600 dark:text-green-400">{coverFile.name}</span>}
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-border flex justify-end gap-3 mt-4">
                        <Button variant="secondary" onClick={onClose} disabled={isSubmitting || uploading}>
                            Cancelar
                        </Button>
                        <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || uploading || !title.trim()}>
                            {isSubmitting || uploading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Material'}
                        </Button>
                </div>
            </div>
        </Modal>
    );
};

export default LibraryItemModal;
