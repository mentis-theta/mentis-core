
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Modal from '../Modal.tsx';
import Button from '../Button.tsx';
import type { Document } from '@/types.ts';
import { validateDocumentFile, getDocumentTypeFromMime, ALLOWED_EXTENSIONS } from '@/utils/validators.ts';
import DeleteConfirmationModal from '../DeleteConfirmationModal.tsx';
import { DocumentIcon } from '../Icons';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: Omit<Document, 'id' | 'uploadedAt' | 'url'>, file: File) => Promise<void> | void;
}

// Ícones inline para tipos de arquivo
const PdfIcon = () => (
  <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2h10l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <path d="M12 2v5h5" />
    <text x="7" y="18" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
  </svg>
);

const WordIcon = () => (
  <svg className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2h10l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <path d="M12 2v5h5" />
    <text x="5.5" y="18" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="bold">DOC</text>
  </svg>
);

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName('');
        setFile(null);
        setPreview(null);
        setError(null);
        setShowExitConfirmation(false);
        setIsSubmitting(false);
        setUploadProgress(0);
        setIsDragging(false);
        dragCountRef.current = 0;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cleanup preview object URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    return name.trim() !== '' || file !== null;
  }, [isOpen, name, file]);

  const handleCloseAttempt = () => {
    if (isDirty && !isSubmitting) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowExitConfirmation(false);
    onClose();
  };

  const processFile = useCallback((selectedFile: File) => {
    setError(null);

    const validation = validateDocumentFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.error || "Arquivo inválido");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);

    // Auto-name from file
    if (!name) {
      setName(selectedFile.name.split('.').slice(0, -1).join('.'));
    }

    // Generate preview for images
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
    e.target.value = '';
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome do documento é obrigatório.");
      return;
    }

    const fileValidation = validateDocumentFile(file);
    if (!fileValidation.isValid) {
      setError(fileValidation.error || "Erro no arquivo.");
      return;
    }

    const detectedType = getDocumentTypeFromMime(file!.type);

    try {
      setIsSubmitting(true);
      setUploadProgress(10);

      // Simulate progress stages while the real upload happens
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      await onSave({ name, type: detectedType }, file!);
      clearInterval(progressTimer);
      setUploadProgress(100);
    } catch (err) {
 console.error("Error saving document:", err);
      setError("Erro ao salvar documento. Tente novamente.");
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type === 'application/pdf') return <PdfIcon />;
    if (file.type.includes('word') || file.type.includes('msword')) return <WordIcon />;
    return <DocumentIcon className="w-10 h-10 text-foreground-muted" />;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseAttempt} title="Importar Arquivo">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Drop Zone */}
          {!file ? (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-8
                flex flex-col items-center justify-center text-center
                transition-all duration-300 ease-out min-h-[180px]
                ${isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-surface-container-low/50 bg-surface'
                }
                ${isSubmitting ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              {/* Upload Icon */}
              <div className={`mb-4 transition-transform duration-300 ${isDragging ? 'scale-110 -translate-y-1' : ''}`}>
                <svg className={`w-12 h-12 transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-foreground-muted/40'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>

              <p className="text-sm font-semibold text-foreground mb-1">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
              </p>
              <p className="text-xs text-foreground-muted">
                PNG, JPEG, WebP, PDF, DOC, DOCX — até 10MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept={ALLOWED_EXTENSIONS}
                className="hidden"
                disabled={isSubmitting}
              />
            </div>
          ) : (
            /* File Preview Card */
            <div className="relative rounded-2xl border border-border bg-surface-container-low/50 p-4 transition-all duration-300 animate-fadeIn">
              <div className="flex items-start gap-4">
                {/* Preview / Icon */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-surface-container flex items-center justify-center border border-border/50">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon()
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {formatFileSize(file.size)} •{' '}
                    {file.type === 'application/pdf' ? 'PDF' :
                      file.type.startsWith('image/') ? 'Imagem' : 'Documento'}
                  </p>
                </div>

                {/* Remove Button */}
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="flex-shrink-0 p-1.5 rounded-full text-foreground-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Remover arquivo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground-muted">Enviando...</span>
                    <span className="text-xs font-semibold text-primary">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 animate-fadeIn">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label htmlFor="doc-name" className="block text-sm font-medium text-foreground-muted mb-1.5">Nome do Documento</label>
            <input
              type="text"
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Laudo Psicológico, Exame de Sangue..."
              className={`block w-full rounded-xl border px-3.5 py-2.5 sm:text-sm transition-all duration-200 bg-surface text-foreground ${error && !name.trim() ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'}`}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseAttempt} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting ? 'Enviando...' : 'Importar Arquivo'}
            </Button>
          </div>
        </form>
      </Modal>

      {showExitConfirmation && (
        <DeleteConfirmationModal
          isOpen={showExitConfirmation}
          onClose={() => setShowExitConfirmation(false)}
          onConfirm={handleConfirmClose}
          title="Descartar Documento?"
          message="Você selecionou um arquivo ou preencheu o nome. Se sair agora, o documento não será salvo."
          confirmLabel="Sim, descartar"
          cancelLabel="Continuar Editando"
          variant="danger"
        />
      )}
    </>
  );
};

export default AddDocumentModal;
