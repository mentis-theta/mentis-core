import React, { useState } from 'react';
import ToolGuideButton from '../ToolGuideButton';
import LightBar from './LightBar';
import { useEMDR } from '@/hooks/useEMDR';
import Button from '@/components/Button';
import { useToast } from '@/contexts/ToastContext';
import { Play, Pause, Save, Activity, BrainCircuit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/utils/formatters';

const EMDRTab: React.FC<{ patientId: string }> = ({ patientId }) => {
    const { currentUser } = useAuth();
 const { addToast } = useToast();
    const { createEMDRLog, records, loading } = useEMDR(patientId);

    // Lightbar State
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
    const [color, setColor] = useState('#22d3ee'); // Default Cyan

    // Clinical Logic Form State
    const [suds, setSuds] = useState<number>(5);
    const [voc, setVoc] = useState<number>(4);
    const [targetMemory, setTargetMemory] = useState('');
    const [negativeCognition, setNegativeCognition] = useState('');
    const [positiveCognition, setPositiveCognition] = useState('');
    const [safePlace, setSafePlace] = useState('');
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const handleSaveLog = async () => {
        if (!currentUser) return;
        const success = await createEMDRLog(patientId, currentUser.id, {
            suds,
            voc,
            targetMemory,
            positiveCognition,
            negativeCognition,
            speed,
            color
        });

        if (success) {
            // Pode resetar o formulário se desejar, mas manter os targets costuma ser bom para o set contínuo.
            setSuds(0); // Reseta o SUDS para induzir a reavaliação
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <BrainCircuit className="h-6 w-6 text-cyan-500" />
                        Workspace EMDR
                        <ToolGuideButton toolId="emdr" />
                    </h3>
                    <p className="text-sm text-foreground-muted mt-1">
                        Estimulação Bilateral e Dessensibilização e Reprocessamento de Traumas.
                    </p>
                </div>
            </div>

            {/* Painel de Estimulação Visual Escuro */}
            <div className="bg-slate-950 p-6 md:p-10 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center">
                <LightBar speed={speed} color={color} isPlaying={isPlaying} />

                {/* Controles M3 Acrílicos abaixo da barra */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg text-white ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105'}`}
                    >
                        {isPlaying ? <><Pause size={20} /> Pausar Set</> : <><Play size={20} /> Iniciar Set</>}
                    </button>

                    <div className="h-8 w-px bg-slate-700 hidden sm:block mx-2" />

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted font-medium uppercase tracking-wider hidden md:block">Velocidade:</span>
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(e.target.value as any)}
                            className="bg-slate-800 text-slate-200 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="slow">Lenta (Instalação)</option>
                            <option value="medium">Média</option>
                            <option value="fast">Rápida (Dessensibilização)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-muted font-medium uppercase tracking-wider hidden md:block">Cor:</span>
                        <div className="flex gap-2 p-1.5 bg-slate-800 rounded-xl">
                            {['#22d3ee', '#34d399', '#a78bfa', '#f472b6', '#fbbf24'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 shadow-lg border-2 border-white' : 'hover:scale-110 opacity-70'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Painel de Estabilização e Lugar Seguro (Escondido se focado no Reprocessamento) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm mb-8 w-full">
                <h4 className="font-bold text-slate-200 flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <span className="bg-emerald-500/20 text-emerald-400 p-1 rounded-md text-xs">Apoio</span>
                    Lugar Seguro e Estabilização
                </h4>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <textarea
                            className="w-full bg-slate-950/50 border border-slate-800 text-slate-300 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-cyan-500 h-24 placeholder-slate-700 resize-none transition-shadow"
                            placeholder="Descreva aqui os detalhes sensoriais do Lugar Seguro do paciente (ex: 'Praia deserta da infância, cheiro de brisa salgada, som das ondas quebrando'). Leia isso durante a estabilização."
                            value={safePlace}
                            onChange={(e) => setSafePlace(e.target.value)}
                        />
                    </div>

                    {/* Mock Audio Player */}
                    <div className="w-full md:w-64 bg-slate-800 rounded-2xl p-4 flex flex-col justify-center items-center gap-3 border border-slate-700 shadow-inner">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted ">Áudio Relaxamento (Hz)</p>
                        <button
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className={`w-12 h-12 rounded-full flex justify-center items-center shrink-0 transition-transform ${isPlayingAudio ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            {isPlayingAudio ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                        </button>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full bg-cyan-500 transition-all duration-[20s] ease-linear ${isPlayingAudio ? 'w-full' : 'w-0'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Split: Escalas Clínicas (Esquerda) e Histórico (Direita) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Registro Clínico */}
                <div className="md:col-span-1 bg-surface rounded-2xl p-6 shadow-sm border border-border ">
                    <h4 className="font-bold text-on-surface flex items-center gap-2 mb-4 border-b border-border pb-2">
                        <Activity className="text-cyan-600" size={18} /> Registrar Aferição
                    </h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-foreground-muted mb-1">SUDS (Escala de Estresse 0-10)</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="0" max="10" value={suds} onChange={e => setSuds(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                <span className="font-bold text-red-500 w-6 text-center">{suds}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-foreground-muted mb-1">VoC (Crença Positiva 1-7)</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="1" max="7" value={voc} onChange={e => setVoc(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                <span className="font-bold text-emerald-500 w-6 text-center">{voc}</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border ">
                            <input type="text" placeholder="Memória Alvo (Target)" value={targetMemory} onChange={e => setTargetMemory(e.target.value)} className="w-full text-sm mb-2 px-3 py-2 rounded-xl border border-border dark:bg-slate-700/50" />
                            <input type="text" placeholder="Crença Negativa (NC)" value={negativeCognition} onChange={e => setNegativeCognition(e.target.value)} className="w-full text-sm mb-2 px-3 py-2 rounded-xl border border-border dark:bg-slate-700/50" />
                            <input type="text" placeholder="Crença Positiva (PC)" value={positiveCognition} onChange={e => setPositiveCognition(e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl border border-border dark:bg-slate-700/50" />
                        </div>

                        <Button onClick={handleSaveLog} className="w-full !rounded-xl !mt-6 shadow-md" variant="primary">
                            <Save size={16} className="mr-2" /> Salvar Set Atual
                        </Button>
                    </div>
                </div>

                {/* Histórico do Reprocessamento */}
                <div className="md:col-span-2 bg-surface rounded-2xl p-6 shadow-sm border border-border ">
                    <h4 className="font-bold text-on-surface mb-4">Evolução do Reprocessamento</h4>

                    {loading ? (
                        <div className="p-4 text-center text-foreground-muted ">Carregando logs...</div>
                    ) : records.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-border rounded-2xl text-foreground-muted ">
                            Nenhum set de EMDR registrado ainda. Inicie o reprocessamento para acompanhar a queda do SUDS.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {records.map(record => (
                                <div key={record.id} className="p-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface ">
                                    <div>
                                        <p className="font-semibold text-on-surface text-sm">Target: {record.content.targetMemory || 'Não especificado'}</p>
                                        <p className="text-xs text-foreground-muted ">{formatDate(record.date)}</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-surface px-4 py-2 rounded-xl border border-border shadow-sm">
                                        <div className="text-center">
                                            <span className="block text-[10px] font-bold text-foreground-muted ">SUDS</span>
                                            <span className={`font-bold text-sm ${record.metadata.suds > 5 ? 'text-red-500' : 'text-emerald-500'}`}>{record.metadata.suds}</span>
                                        </div>
                                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                        <div className="text-center">
                                            <span className="block text-[10px] font-bold text-foreground-muted ">VoC</span>
                                            <span className="font-bold text-sm text-cyan-600">{record.metadata.voc}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EMDRTab;
