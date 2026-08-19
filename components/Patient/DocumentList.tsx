
import React, { useState, useEffect } from 'react';
import type { Document, Patient } from '@/types.ts';
import { DocumentIcon, DownloadIcon, PlusIcon, PrinterIcon, TrashIcon, PencilIcon } from '../Icons';
import Button from '../Button.tsx';
import { formatDate } from '@/utils/formatters.ts';
import { usePatientContext } from '@/contexts/PatientContext.tsx';
import { useModals } from '@/contexts/ModalContext.tsx';
import Modal from '../Modal.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { useFileStorage } from '@/hooks/useFileStorage';
import DocStation from '../Documents/DocStation';
import { ArrowLeftIcon } from '../Icons';
import ToolGuideButton from '../Tools/ToolGuideButton';
interface DocumentListProps {
    documents: Document[];
    canEdit: boolean;
    onAddDocument: () => void;
    patient?: Patient;
}

// Sub-component to handle individual document logic (esp. async Storage URLs)
const DocumentItem = ({ doc, canEdit, onDelete, onEdit }: { doc: Document; canEdit: boolean; onDelete: (d: Document) => void; onEdit?: (d: Document) => void }) => {
    const { getFileUrl } = useFileStorage();
    const [downloadUrl, setDownloadUrl] = useState<string>(doc.url);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const resolveUrl = async () => {
            if (doc.storagePath) {
                // It's a Storage file, we need a fresh Signed URL
                setIsResolving(true);
                const url = await getFileUrl(doc.storagePath);
                if (isMounted && url) {
                    setDownloadUrl(url);
                }
                if (isMounted) setIsResolving(false);
            } else {
                // It's a legacy Base64 file, use url directly
                setDownloadUrl(doc.url);
            }
        };

        resolveUrl();

        return () => { isMounted = false; };
    }, [doc.storagePath, doc.url, getFileUrl]);

    return (
        <li className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center space-x-4 min-w-0">
                <DocumentIcon className="h-6 w-6 text-foreground-muted flex-shrink-0" />
                <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">{doc.name}</p>
                    <p className="text-sm text-foreground-muted ">
                        {formatDate(doc.uploadedAt)}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                {isResolving ? (
                    <span className="text-xs text-foreground-muted ">Carregando...</span>
                ) : (
                    <a
                        href={downloadUrl}
                        download={doc.name} // Helper for download attribute
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-full text-foreground-muted hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                        aria-label={`Baixar ${doc.name}`}
                        title={`Baixar ${doc.name}`}
                    >
                        <DownloadIcon className="h-5 w-5" />
                    </a>
                )}

                {/* Edit button logic removed to centralize in DocStation. Future iterations can wire this back to DocStation. */}

                {canEdit && (
                    <button
                        onClick={() => onDelete(doc)}
                        className="inline-flex items-center justify-center p-2 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                        aria-label={`Excluir ${doc.name}`}
                        title={`Excluir ${doc.name}`}
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
        </li>
    );
};

const DocumentList: React.FC<DocumentListProps> = ({ documents, canEdit, onAddDocument, patient }) => {
    const { deleteDocument } = usePatientContext();
    const { openModal } = useModals();
    const { deleteFile } = useFileStorage(); // We need this to delete from Bucket too
 const { addToast } = useToast();

    // Deletion State
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
    const [viewDocStation, setViewDocStation] = useState(false);

    const handleDeleteClick = (doc: Document) => {
        setDocumentToDelete(doc);
    };

    const confirmDelete = async () => {
        if (!patient || !documentToDelete) return;

        try {
            // 1. If it has a storagePath, delete from Bucket first
            if (documentToDelete.storagePath) {
                const success = await deleteFile(documentToDelete.storagePath);
                if (!success) {
 addToast('Aviso: Arquivo não encontrado no armazenamento, removendo referência.', 'info');
                }
            }

            // 2. Delete reference from DB (Patient JSON)
            await deleteDocument(patient.id, documentToDelete.id);
 addToast('Documento excluído com sucesso.', 'success');
            setDocumentToDelete(null);
        } catch (error) {
 console.error(error);
 addToast('Erro ao excluir documento.', 'error');
        }
    };

    const generatedDocs = documents?.filter(d => d.category === 'generated') || [];
    const uploadedDocs = documents?.filter(d => d.category !== 'generated') || [];

    return (
        <div>
            {viewDocStation && (
                <DocStation
                    isOpen={viewDocStation}
                    onClose={() => setViewDocStation(false)}
                    preSelectedPatientId={patient?.id}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">Central de Documentos <ToolGuideButton toolId="documents" /></h3>
                {canEdit && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={() => setViewDocStation(true)} className="flex-1 sm:flex-none justify-center text-white">
                            <PrinterIcon className="h-4 w-4 mr-2" /> Criar Documento
                        </Button>
                        <Button onClick={() => openModal('addDocument')} className="flex-1 sm:flex-none justify-center">
                            <PlusIcon className="h-4 w-4 mr-2" /> Importar Arquivo
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-8">
                {/* Section: Generated Documents */}
                <section>
                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3 pl-1">
                        Documentos Emitidos
                    </h4>
                    {generatedDocs.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
                            {generatedDocs.map(doc => (
                                <DocumentItem key={doc.id} doc={doc} canEdit={canEdit} onDelete={handleDeleteClick} />
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-surface ">
                            <p className="text-sm text-foreground-muted ">Nenhum documento emitido pelo sistema ainda.</p>
                        </div>
                    )}
                </section>

                {/* Section: Uploads */}
                <section>
                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3 pl-1">
                        Arquivos & Uploads
                    </h4>
                    {uploadedDocs.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
                            {uploadedDocs.map(doc => (
                                <DocumentItem key={doc.id} doc={doc} canEdit={canEdit} onDelete={handleDeleteClick} />
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-surface ">
                            <p className="text-sm text-foreground-muted ">Nenhum arquivo importado.</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Delete Confirmation Modal */}
            {documentToDelete && (
                <Modal
                    isOpen={!!documentToDelete}
                    onClose={() => setDocumentToDelete(null)}
                    title="Excluir Documento"
                >
                    <div className="p-1">
                        <p className=" text-foreground-muted mb-6">
                            Tem certeza que deseja excluir o documento <strong>{documentToDelete.name}</strong>?
                            <br /><span className="text-sm text-red-500 mt-2 block">Essa ação não pode ser desfeita.</span>
                        </p>
                        <div className="flex justify-end space-x-3">
                            <Button variant="secondary" onClick={() => setDocumentToDelete(null)}>
                                Cancelar
                            </Button>
                            <Button variant="danger" onClick={confirmDelete}>
                                Excluir Permanentemente
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DocumentList;
