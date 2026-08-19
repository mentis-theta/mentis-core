import React, { useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import { useEditorEducation } from '@/contexts/EditorEducationContext';
import { Mic, FileEdit, FileText, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';

export const SessionOnboardingModal = () => {
    const { showOnboarding, completeOnboarding, setShowTour, trackEvent } = useEditorEducation();
    const [step, setStep] = useState(1);
    const [wantsLearnerMode, setWantsLearnerMode] = useState(true);

    if (!showOnboarding) return null;

    const handleNext = () => {
        if (step < 5) {
            setStep(step + 1);
        }
    };

    const handleFinish = (wantsTour: boolean) => {
        completeOnboarding(wantsLearnerMode);
        if (wantsTour) {
            setShowTour(true);
            trackEvent('tour_started');
        } else {
            trackEvent('tour_skipped');
        }
    };

    return (
        <Modal 
            isOpen={showOnboarding} 
            onClose={() => {}} // Não fecha clicando fora, força o opt-in
            title={step === 1 ? "O novo Prontuário Inteligente" : "Conhecendo o Novo Fluxo"}
            size="lg"
        >
            <div className="p-6">
                {/* Etapa 1: O Porquê */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
                                Antes vs Agora
                            </h3>
                            <p className="text-slate-700 dark:text-slate-300 mb-4">
                                <strong>Antes:</strong> Muitos profissionais usavam a transcrição diretamente como evolução clínica. Isso poluía o prontuário e dificultava as análises do Copilot.
                            </p>
                            <p className="text-slate-700 dark:text-slate-300">
                                <strong>Agora:</strong> O Mentis separa o material bruto do documento oficial. Seu prontuário fica mais organizado, seguro e preparado para a IA.
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleNext}>Continuar <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </div>
                    </div>
                )}

                {/* Etapa 2: As Três Áreas */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 text-center mb-6">
                            Cada informação em seu lugar
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-surface border border-border/60 p-4 rounded-xl text-center">
                                <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                    <Mic className="w-5 h-5 text-blue-500" />
                                </div>
                                <h4 className="font-semibold mb-2">1. Transcrição</h4>
                                <p className="text-sm text-foreground-muted">Registro bruto da conversa. Nunca é alterado.</p>
                            </div>
                            <div className="bg-surface border border-border/60 p-4 rounded-xl text-center">
                                <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                    <FileEdit className="w-5 h-5 text-orange-500" />
                                </div>
                                <h4 className="font-semibold mb-2">2. Rascunho</h4>
                                <p className="text-sm text-foreground-muted">Seu espaço de trabalho. Escreva, edite e organize livremente.</p>
                            </div>
                            <div className="bg-surface border border-border/60 p-4 rounded-xl text-center">
                                <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                    <FileText className="w-5 h-5 text-green-500" />
                                </div>
                                <h4 className="font-semibold mb-2">3. Evolução Final</h4>
                                <p className="text-sm text-foreground-muted">Documento clínico oficial. O que vai para o prontuário.</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${step === i ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                ))}
                            </div>
                            <Button onClick={handleNext}>Entendi <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </div>
                    </div>
                )}

                {/* Etapa 3: Publicar vs Finalizar */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 text-center mb-6">
                            Publicar Evolução vs. Finalizar Sessão
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/50 rounded-xl">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center mb-3">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publicar no Prontuário
                                </h4>
                                <ul className="text-sm space-y-2 text-green-800 dark:text-green-200">
                                    <li>• Cria um snapshot do Rascunho na Evolução Final.</li>
                                    <li>• Pode ser usado várias vezes.</li>
                                    <li>• O rascunho continua editável.</li>
                                </ul>
                            </div>
                            <div className="p-5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <h4 className="font-semibold flex items-center mb-3">
                                    <ShieldAlert className="w-4 h-4 mr-2" />
                                    Finalizar Sessão
                                </h4>
                                <ul className="text-sm space-y-2 text-foreground-muted">
                                    <li>• Ação administrativa final.</li>
                                    <li>• Geralmente usado uma vez.</li>
                                    <li>• Tranca a sessão e impede edição do prontuário.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${step === i ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                ))}
                            </div>
                            <Button onClick={handleNext}>Continuar <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </div>
                    </div>
                )}

                {/* Etapa 4: Modo Aprendiz */}
                {step === 4 && (
                    <div className="space-y-6 animate-fadeIn text-center py-6">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                            Modo Aprendiz
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                            O Mentis pode exibir pequenas dicas contextuais, alertas ao cometer erros comuns e checklist de progresso durante suas primeiras sessões no novo modelo.
                        </p>
                        
                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                            <Button 
                                variant={wantsLearnerMode ? 'primary' : 'secondary'} 
                                onClick={() => setWantsLearnerMode(true)}
                            >
                                Sim, desejo receber dicas
                            </Button>
                            <Button 
                                variant={!wantsLearnerMode ? 'primary' : 'secondary'} 
                                onClick={() => setWantsLearnerMode(false)}
                            >
                                Não, já domino o fluxo
                            </Button>
                        </div>

                        <div className="flex justify-between items-center mt-12">
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full ${step === i ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                ))}
                            </div>
                            <Button onClick={handleNext}>Continuar <ArrowRight className="w-4 h-4 ml-2" /></Button>
                        </div>
                    </div>
                )}

                {/* Etapa 5: Compromisso e Tour */}
                {step === 5 && (
                    <div className="space-y-8 animate-fadeIn text-center py-8">
                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                            Tudo pronto!
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                            Deseja fazer um tour rápido de 30 segundos no editor para ver onde cada botão fica?
                        </p>
                        
                        <div className="flex justify-center gap-4 pt-4">
                            <Button variant="secondary" onClick={() => handleFinish(false)}>
                                Agora não
                            </Button>
                            <Button onClick={() => handleFinish(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Entendi o fluxo — Fazer Tour
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
