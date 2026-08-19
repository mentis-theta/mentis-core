import React, { useState, useRef, useEffect } from 'react';
import Button from '../Button';
import { useToast } from '@/contexts/ToastContext';
import {
    transcribeAudioChunk,
    analyzeClinicalData,
    validateAudioFile,
    type AudioAnalysisResult
} from '@/services/audioService';
import { Mic, Upload, Circle, Pause, Square, Play, CheckCircle2, Music, Hourglass, AlertTriangle, Lock, Loader2, RefreshCw } from 'lucide-react';

interface SessionRecorderProps {
    onAnalysisComplete: (result: AudioAnalysisResult) => void;
    sessionContext?: string;
}

type RecorderMode = 'record' | 'upload';
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

const SessionRecorder: React.FC<SessionRecorderProps> = ({ onAnalysisComplete, sessionContext }) => {
    const { addToast } = useToast();

    // UI State
    const [mode, setMode] = useState<RecorderMode>('upload');
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [recordingTime, setRecordingTime] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');

    // Transcrição Acumulada
    const fullTranscriptRef = useRef<string>("");

    // Progress tracking for uploads
    const [progressMessage, setProgressMessage] = useState<string>('');

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            setRecordedMimeType(mimeType);

            mediaRecorderRef.current = mediaRecorder;
            fullTranscriptRef.current = ""; // Reset transcript

            // Dispara a cada 5 minutos (300.000 ms) ou ao parar
            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    processChunkAsync(event.data, mimeType);
                }
            };

            mediaRecorder.onstop = () => {
                setRecordingState('stopped');
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
            };

            // Inicia gravando em pedaços de 5 minutos
            mediaRecorder.start(300000); 
            
            setRecordingState('recording');
            setRecordingTime(0);

            // Start timer
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            addToast('Gravação iniciada', 'info');
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            addToast('Erro ao acessar microfone. Verifique as permissões.', 'error');
        }
    };

    // Assynchronous chunk processing (Non-blocking)
    const processChunkAsync = async (blobChunk: Blob, type: string) => {
        setIsSyncing(true);
        try {
            const chunkBlob = new Blob([blobChunk], { type });
            const text = await transcribeAudioChunk(chunkBlob);
            
            if (text && text.trim().length > 0) {
                // Adiciona espaço seguro antes de concatenar
                fullTranscriptRef.current = fullTranscriptRef.current 
                    ? fullTranscriptRef.current + " " + text.trim() 
                    : text.trim();
            }
        } catch (err) {
            console.error("Falha ao sincronizar chunk de áudio em background", err);
            // Non-blocking fail silently for chunks to avoid disrupting UX
        } finally {
            setIsSyncing(false);
        }
    };

    // Pause recording
    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordingState('paused');
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            addToast('Gravação pausada', 'info');
        }
    };

    // Resume recording
    const resumeRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingState('recording');
            timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
            addToast('Gravação retomada', 'info');
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && recordingState !== 'idle') {
            mediaRecorderRef.current.stop(); // This triggers final ondataavailable
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            addToast('Gravação finalizada', 'success');
        }
    };

    // Handle file upload
    const handleFileUpload = (file: File) => {
        const validation = validateAudioFile(file);

        if (!validation.valid) {
            addToast(validation.error || 'Arquivo inválido', 'error');
            return;
        }

        setUploadedFile(file);
        fullTranscriptRef.current = ""; // Limpa gravações se houver upload
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        addToast(`Arquivo carregado: ${file.name} (${fileSizeMB} MB)`, 'success');
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    // Process audio with AI
    const handleProcessAudio = async () => {
        if (!uploadedFile && !fullTranscriptRef.current && recordingState !== 'stopped') {
            addToast('Nenhum áudio disponível para processar', 'error');
            return;
        }

        setIsProcessing(true);
        abortControllerRef.current = new AbortController();

        try {
            let transcriptToAnalyze = fullTranscriptRef.current;

            // Se for arquivo de upload, transcreve tudo de uma vez
            if (uploadedFile) {
                setProgressMessage("Enviando arquivo para transcrição...");
                transcriptToAnalyze = await transcribeAudioChunk(uploadedFile);
            } else {
                setProgressMessage("Aguardando sincronização final de blocos...");
                // Aguarda 1s para garantir que o último ondataavailable terminou de rodar
                await new Promise(r => setTimeout(r, 1000));
                
                // Se a IA ainda estiver sincronizando o último pedaço, espera.
                let waitCycles = 0;
                while (isSyncing && waitCycles < 30) {
                    await new Promise(r => setTimeout(r, 500));
                    waitCycles++;
                }
                transcriptToAnalyze = fullTranscriptRef.current;
            }

            if (!transcriptToAnalyze) {
                throw new Error("Não foi possível gerar a transcrição do áudio.");
            }

            setProgressMessage("Gerando análise clínica com Inteligência Artificial...");
            const result = await analyzeClinicalData(transcriptToAnalyze, sessionContext);

            addToast('Análise concluída!', 'success');
            onAnalysisComplete(result);

            // Reset state
            setUploadedFile(null);
            fullTranscriptRef.current = "";
            setRecordingTime(0);
            setRecordingState('idle');
            setProgressMessage('');
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'AbortError') return;
            console.error('Erro ao processar áudio:', error);
            addToast(error instanceof Error ? error.message : 'Erro ao processar áudio', 'error');
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
            abortControllerRef.current = null;
        }
    };

    // Format time (seconds to MM:SS)
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const hasContent = recordingState === 'stopped' || uploadedFile;

    return (
        <div className="bg-surface rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Mic className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-on-surface ">
                        Inteligência de Áudio
                    </h3>
                </div>
                
                {/* Sutil indicador de sync */}
                {isSyncing && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full animate-pulse border border-emerald-100 dark:border-emerald-800">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sincronizando notas...
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border mb-4">
                <button
                    className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${mode === 'record'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    onClick={() => setMode('record')}
                >
                    <span className="flex items-center justify-center gap-2"><Mic className="w-4 h-4" /> Gravar Agora</span>
                </button>
                <button
                    className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${mode === 'upload'
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-foreground-muted hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    onClick={() => setMode('upload')}
                >
                    <span className="flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Upload Arquivo</span>
                </button>
            </div>

            {/* Recording Mode */}
            {mode === 'record' && (
                <div className="space-y-4">
                    <div className="bg-surface rounded-lg p-6 text-center border border-border/50 shadow-sm">
                        {/* Recording Controls */}
                        <div className="flex justify-center space-x-3 mb-4">
                            {recordingState === 'idle' && (
                                <Button
                                    onClick={startRecording}
                                    variant="primary"
                                    className="bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                                >
                                    <Circle className="w-4 h-4 fill-current" /> Gravar
                                </Button>
                            )}

                            {recordingState === 'recording' && (
                                <>
                                    <Button onClick={pauseRecording} variant="secondary" className="flex items-center justify-center gap-2">
                                        <Pause className="w-4 h-4" /> Pausar
                                    </Button>
                                    <Button onClick={stopRecording} variant="secondary" className="flex items-center justify-center gap-2">
                                        <Square className="w-4 h-4 fill-current" /> Parar
                                    </Button>
                                </>
                            )}

                            {recordingState === 'paused' && (
                                <>
                                    <Button onClick={resumeRecording} variant="primary" className="flex items-center justify-center gap-2">
                                        <Play className="w-4 h-4 fill-current" /> Continuar
                                    </Button>
                                    <Button onClick={stopRecording} variant="secondary" className="flex items-center justify-center gap-2">
                                        <Square className="w-4 h-4 fill-current" /> Parar
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Timer */}
                        {recordingState !== 'idle' && (
                            <div className="text-3xl font-mono text-foreground-muted mb-2">
                                {formatTime(recordingTime)}
                            </div>
                        )}

                        {/* Recording Indicator */}
                        {recordingState === 'recording' && (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                                <span className="text-sm text-foreground-muted">Gravando... (Fatiamento Inteligente Ativo)</span>
                            </div>
                        )}

                        {recordingState === 'stopped' && (
                            <div className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Gravação finalizada
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Mode */}
            {mode === 'upload' && (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border bg-surface'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        accept=".mp3,.wav,.m4a,.webm,.ogg"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                        className="hidden"
                        id="audio-upload"
                    />

                    {!uploadedFile ? (
                        <div className="flex flex-col items-center">
                            <Upload className="w-10 h-10 mb-3 text-slate-400" />
                            <label htmlFor="audio-upload" className="cursor-pointer">
                                <span className="text-blue-600 dark:text-blue-400 hover:underline">
                                    Clique para selecionar
                                </span>
                                <span className="text-foreground-muted"> ou arraste o arquivo</span>
                            </label>
                            <p className="text-sm text-foreground-muted mt-2">
                                Formatos: MP3, WAV, M4A, WEBM, OGG
                            </p>
                            <p className="text-xs text-foreground-muted mt-1">
                                Tamanho máximo: 50MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 flex flex-col items-center">
                            <Music className="w-8 h-8 text-indigo-500 mb-1" />
                            <p className="font-medium text-foreground-muted">
                                {uploadedFile.name}
                            </p>
                            <p className="text-sm text-foreground-muted">
                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button
                                onClick={() => setUploadedFile(null)}
                                variant="secondary"
                                className="mt-2"
                            >
                                Remover
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Processing Progress Bar */}
            {isProcessing && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {progressMessage || 'Processando...'}
                        </span>
                    </div>
                </div>
            )}

            {/* Process Button */}
            {hasContent && (
                <div className="mt-6 flex space-x-3">
                    <Button
                        onClick={handleProcessAudio}
                        disabled={isProcessing || isSyncing}
                        variant="primary"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                        {isProcessing ? (
                            <>Processando...</>
                        ) : (
                            <>🤖 Gerar Resumo Clínico</>
                        )}
                    </Button>
                    
                    {isProcessing && (
                        <Button
                            onClick={() => abortControllerRef.current?.abort()}
                            variant="secondary"
                            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                        >
                            Cancelar
                        </Button>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="mt-4 space-y-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-2">
                    <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Privacidade (E2EE):</strong> O áudio processado na sessão é fatiado em tempo real e não é retido. A transcrição final é protegida pela sua Master Key.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SessionRecorder;
