import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Headphones, ShieldAlert, Loader2 } from 'lucide-react';
import { useCrisisRegulation } from '@/hooks/usePortalTools';
import { usePortalUser } from '@/hooks/usePortalUser';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { generateAllTracks, generateTrack, clearAudioCache } from '@/utils/safeSpaceAudioGenerator';

// Metadados das faixas (URLs geradas dinamicamente)
const AUDIO_TRACKS = [
    {
        id: 1,
        title: 'Bilateral Suave (Estimulação EMDR)',
        duration: '03:00',
        type: 'EMDR',
        color: 'cyan',
    },
    {
        id: 2,
        title: 'Frequência de Aterramento (432Hz)',
        duration: '02:16',
        type: 'Grounding',
        color: 'orange',
    },
    {
        id: 3,
        title: 'Chuva e Trovões Distantes',
        duration: '03:49',
        type: 'Ambience',
        color: 'indigo',
    },
];

// Formata segundos em mm:ss
const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Cache de URLs geradas
const generatedUrls = new Map<number, string>();

const SafeSpace: React.FC = () => {
    const [activeTrack, setActiveTrack] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const { logCrisisRegulation } = useCrisisRegulation();
    const { patient } = usePortalUser();
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const hasLoggedTelemetryRef = useRef(false);

    const activeTrackData = AUDIO_TRACKS.find(t => t.id === activeTrack);

    // Pré-gerar faixas no mount e limpar no unmount
    useEffect(() => {
        let isMounted = true;
        
        generateAllTracks().then((tracks) => {
            if (!isMounted) return;
            tracks.forEach((track, id) => {
                generatedUrls.set(id, track.url);
            });
        }).catch(console.error);

        return () => {
            isMounted = false;
            // IMPORTANTE: Cleanup de URLs para evitar Memory Leak (requisito do usuário)
            clearAudioCache();
            generatedUrls.clear();
        };
    }, []);

    // Telemetry: Log once per session when user starts playing
    useEffect(() => {
        if (isPlaying && !hasLoggedTelemetryRef.current && patient) {
            hasLoggedTelemetryRef.current = true;
            const authorId = currentUser?.id || patient.id;
            logCrisisRegulation(
                patient.id, 
                authorId, 
                'safe_space_audio', 
                `Áudio: ${activeTrackData?.title || 'Desconhecido'}`
            );
        }
    }, [isPlaying, patient, currentUser, activeTrackData, logCrisisRegulation]);

    // Sincronizar estado do player com <audio>
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, [activeTrack]);

    const handlePlay = useCallback(async (id: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (activeTrack === id) {
            // Toggle play/pause na mesma track
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play();
                setIsPlaying(true);
            }
        } else {
            // Trocar de track
            setActiveTrack(id);
            setCurrentTime(0);
            setDuration(0);
            setIsPlaying(false);

            // Hack para iOS: Tentar "acordar" o elemento de audio sincronicamente no evento de clique
            audio.play().catch(() => {});
            audio.pause();

            let trackUrl = generatedUrls.get(id);
            if (!trackUrl) {
                setIsGenerating(true);
                try {
                    const track = await generateTrack(id);
                    if (track) {
                        trackUrl = track.url;
                        generatedUrls.set(id, trackUrl);
                    }
                } catch (e) {
                    console.error("Falha ao gerar áudio", e);
                    addToast("Não foi possível gerar a faixa de áudio.", "error");
                } finally {
                    setIsGenerating(false);
                }
            }

            if (trackUrl) {
                audio.src = trackUrl;
                audio.load();
                audio.play()
                     .then(() => setIsPlaying(true))
                     .catch((e) => {
                         console.error("Erro ao tocar audio:", e, "URL:", trackUrl);
                         setIsPlaying(false);
                         addToast("O seu navegador bloqueou ou falhou na reprodução do áudio.", "error");
                     });
            }
        }
    }, [activeTrack, isPlaying]);

    const handleTogglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !activeTrack) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            if (audio.src && audio.src !== window.location.href) {
                audio.play();
                setIsPlaying(true);
            } else {
                handlePlay(activeTrack);
            }
        }
    }, [isPlaying, activeTrack, handlePlay]);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        const newTime = Number(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    }, []);

    const handleSkip = useCallback((direction: 'next' | 'prev') => {
        const currentIndex = AUDIO_TRACKS.findIndex(t => t.id === activeTrack);
        if (currentIndex === -1) return;
        const newIndex = direction === 'next'
            ? (currentIndex + 1) % AUDIO_TRACKS.length
            : (currentIndex - 1 + AUDIO_TRACKS.length) % AUDIO_TRACKS.length;
        handlePlay(AUDIO_TRACKS[newIndex].id);
    }, [activeTrack, handlePlay]);

    const getTrackColorClasses = (color: string) => {
        switch (color) {
            case 'cyan': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
            case 'orange': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
            case 'indigo': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
            default: return 'bg-slate-500/10 text-foreground-muted border-slate-500/30';
        }
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] animate-fadeIn relative overflow-hidden bg-slate-50 dark:bg-slate-950 -mx-4 -mt-6 md:-mx-8 md:-mt-8 p-4 md:p-8">

            {/* Elemento de áudio real (oculto) */}
            <audio ref={audioRef} preload="metadata" />

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-0 w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="mb-8 relative z-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                    <ShieldAlert className="text-indigo-400" size={32} />
                    Lugar Seguro
                </h2>
                <p className="text-foreground-muted mt-2 text-sm max-w-sm">
                    Um ambiente protegido para descompressão. Coloque seus fones de ouvido.
                </p>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-32 relative z-10 scrollbar-hide">
                {AUDIO_TRACKS.map(track => {
                    const isActive = activeTrack === track.id;
                    const colorClass = getTrackColorClasses(track.color);

                    return (
                        <div
                            key={track.id}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                isActive 
                                    ? 'border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-900/10' 
                                    : 'border-border bg-surface hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/80'
                            }`}
                            onClick={() => handlePlay(track.id)}
                        >
                            <div className="flex items-center gap-4">
                                <button className={`w-12 h-12 rounded-full flex justify-center items-center shrink-0 border ${colorClass} ${isActive && isPlaying ? 'scale-110 shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,0,0,0.5)]' : ''} transition-all`}>
                                    {isActive && isGenerating ? <Loader2 size={20} className="animate-spin" /> : (isActive && isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />)}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-sm ${isActive ? 'text-indigo-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{track.title}</h4>
                                    <p className="text-xs text-foreground-muted mt-0.5">{track.type} • {track.duration}</p>
                                </div>
                            </div>

                            {isActive && isPlaying && (
                                <div className="flex gap-1 items-end h-4 mr-2">
                                    <div className="w-1 bg-cyan-500 rounded-t shrink-0 animate-[bounce_1s_infinite]" />
                                    <div className="w-1 bg-cyan-500 rounded-t shrink-0 animate-[bounce_1.2s_infinite]" />
                                    <div className="w-1 bg-cyan-500 rounded-t shrink-0 animate-[bounce_0.8s_infinite]" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Sticky Player M3 Spotify-like */}
            <div className={`absolute bottom-4 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-96 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-4 rounded-3xl shadow-2xl z-50 transition-transform duration-500 flex flex-col gap-3 ${activeTrack ? 'translate-y-0' : 'translate-y-[150%]'}`}>
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex justify-center items-center text-foreground-muted shrink-0">
                            <Headphones size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-slate-900 dark:text-white font-bold text-sm truncate w-40 md:w-48">{activeTrackData?.title}</p>
                            <p className="text-foreground-muted text-xs">{activeTrackData?.type}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleSkip('prev'); }} className="p-2 text-foreground-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                        <button
                            className="bg-surface text-foreground w-12 h-12 rounded-full flex justify-center items-center hover:scale-105 transition-transform border border-border/40 shadow-sm"
                            onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
                        >
                            {isGenerating ? <Loader2 size={24} className="animate-spin" /> : (isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />)}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleSkip('next'); }} className="p-2 text-foreground-muted hover:text-slate-900 dark:hover:text-white transition-colors">
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar Funcional */}
                <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] text-foreground-muted w-8 text-right font-mono">{formatTime(currentTime)}</span>
                    <div className="flex-1 relative group">
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-400 rounded-full transition-[width] duration-200 ease-linear"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                            step={0.1}
                        />
                    </div>
                    <span className="text-[10px] text-foreground-muted w-8 font-mono">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default SafeSpace;
