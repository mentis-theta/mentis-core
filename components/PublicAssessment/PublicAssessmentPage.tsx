import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAssessmentByToken, submitAssessment, AssessmentLink } from '@/services/assessmentService';
import { SCALES_MAP, getSeverity } from '@/utils/assessmentScales';
import type { ScaleDefinition } from '@/utils/assessmentScales';
import { ChevronLeft, ChevronRight, Send, CheckCircle, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'error';

const PublicAssessmentPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [pageState, setPageState] = useState<PageState>('loading');
    const [assessment, setAssessment] = useState<AssessmentLink | null>(null);
    const [scale, setScale] = useState<ScaleDefinition | null>(null);
    const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1..N = questions, N+1 = confirm
    const [responses, setResponses] = useState<(number | null)[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [resultScore, setResultScore] = useState<number | null>(null);
    const [resultSeverity, setResultSeverity] = useState<string | null>(null);

    // Carregar dados do assessment
    useEffect(() => {
        const loadAssessment = async () => {
            if (!token) {
                setErrorMessage('Link inválido.');
                setPageState('error');
                return;
            }

            const data = await getAssessmentByToken(token);

            if (!data) {
                setErrorMessage('Avaliação não encontrada. Verifique se o link está correto.');
                setPageState('error');
                return;
            }

            if (data.status === 'completed') {
                setErrorMessage('Esta avaliação já foi respondida.');
                setPageState('error');
                return;
            }

            if (new Date(data.expires_at) < new Date()) {
                setErrorMessage('Este link expirou. Solicite um novo ao seu terapeuta.');
                setPageState('error');
                return;
            }

            const scaleData = SCALES_MAP[data.scale_name];
            if (!scaleData) {
                setErrorMessage('Escala não reconhecida.');
                setPageState('error');
                return;
            }

            setAssessment(data);
            setScale(scaleData);
            setResponses(new Array(scaleData.questions.length).fill(null));
            setPageState('form');
        };

        loadAssessment();
    }, [token]);

    const totalQuestions = scale?.questions.length || 0;
    // Steps: 0=intro, 1..totalQuestions=questions, totalQuestions+1=confirm
    const totalSteps = totalQuestions + 2;
    const isIntro = currentStep === 0;
    const isConfirm = currentStep === totalQuestions + 1;
    const currentQuestionIndex = currentStep - 1;

    const requiredQuestions = scale?.questions.map(q => !q.showIf || q.showIf(responses)) || [];
    const answeredRequired = responses.filter((r, idx) => requiredQuestions[idx] && r !== null).length;
    const totalRequired = requiredQuestions.filter(Boolean).length;
    
    const progress = totalRequired > 0 ? Math.round((answeredRequired / totalRequired) * 100) : 0;
    const isComplete = requiredQuestions.every((isRequired, idx) => !isRequired || responses[idx] !== null);

    const handleAnswer = (questionIndex: number, value: number) => {
        const newResponses = [...responses];
        newResponses[questionIndex] = value;
        setResponses(newResponses);

        // Auto-advance to next valid step after a short delay
        setTimeout(() => {
            let nextStep = currentStep + 1;
            while (nextStep <= totalQuestions) {
                const nextQ = scale!.questions[nextStep - 1];
                if (!nextQ.showIf || nextQ.showIf(newResponses)) {
                    break;
                }
                nextStep++;
            }
            setCurrentStep(nextStep);
        }, 300);
    };

    const handlePrevious = () => {
        let prevStep = currentStep - 1;
        while (prevStep > 0) {
            const prevQ = scale!.questions[prevStep - 1];
            if (!prevQ.showIf || prevQ.showIf(responses)) {
                break;
            }
            prevStep--;
        }
        setCurrentStep(Math.max(0, prevStep));
    };

    const handleSubmit = async () => {
        if (!token || !isComplete) return;

        setPageState('submitting');
        
        // Assegurar que perguntas não exibidas enviem 'null' ou sejam zeroedas. O backend/SCALES lida com o array
        const finalResponses = responses.map((r, idx) => requiredQuestions[idx] ? r : null) as (number | null)[];
        
        const result = await submitAssessment(token, finalResponses);

        if (result.success) {
            setResultScore(result.score ?? null);
            setResultSeverity(result.severity ?? null);
            setPageState('success');
        } else {
            setErrorMessage(result.error || 'Erro ao enviar respostas.');
            setPageState('error');
        }
    };

    const canGoBack = currentStep > 0 && !isIntro;
    const canGoNext = currentStep < totalSteps - 1 && !isIntro;

    // ─── LOADING ──────────────────────────────────────────────────────
    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm">Carregando avaliação...</p>
                </div>
            </div>
        );
    }

    // ─── ERROR ─────────────────────────────────────────────────────────
    if (pageState === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Indisponível</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{errorMessage}</p>
                </div>
            </div>
        );
    }

    // ─── SUBMITTING ───────────────────────────────────────────────────
    if (pageState === 'submitting') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm font-medium">Enviando respostas...</p>
                </div>
            </div>
        );
    }

    // ─── SUCCESS ──────────────────────────────────────────────────────
    // Apenas PHQ-9 e GAD-7 mostram score ao paciente. Escalas sensíveis
    // (C-SSRS, MDQ, ASRS, etc.) ocultam para evitar ansiedade pré-sessão.
    const SHOW_SCORE_SCALES: string[] = ['PHQ-9', 'GAD-7'];

    if (pageState === 'success') {
        const canShowScore = scale && SHOW_SCORE_SCALES.includes(scale.id);
        const severityData = canShowScore && resultScore !== null
            ? getSeverity(scale.id, resultScore, responses)
            : null;

        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Respostas Enviadas!</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Obrigado por responder. Seu terapeuta receberá os resultados automaticamente.
                    </p>

                    {canShowScore && resultScore !== null && severityData ? (
                        <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Seu resultado</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl font-black text-slate-800">{resultScore}</span>
                                <span
                                    className="text-sm font-bold px-3 py-1.5 rounded-full text-white"
                                    style={{ backgroundColor: severityData.color }}
                                >
                                    {severityData.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-3">
                                {scale?.name} • Score máximo: {scale?.id === 'PHQ-9' ? '27' : '21'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Seu terapeuta analisará os resultados e conversará com você na próxima sessão.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Dados protegidos e confidenciais</span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── FORM (STEPPER) ───────────────────────────────────────────────
    if (!scale) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">

            {/* Progress Bar (Fixed Top) */}
            {!isIntro && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <div className="h-1 bg-slate-200">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
                        <button
                            onClick={handlePrevious}
                            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </button>

                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{scale.id}</p>
                            <p className="text-xs text-slate-500 font-medium">
                                {isConfirm ? 'Revisão' : `Pergunta ${currentQuestionIndex + 1} de ${totalQuestions}`}
                            </p>
                        </div>

                        <div className="w-8" /> {/* Spacer */}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 flex items-center justify-center px-5 ${!isIntro ? 'pt-20 pb-8' : 'py-8'}`}>
                <div className="w-full max-w-md">

                    {/* ─── INTRO STEP ─────────────────────────────────── */}
                    {isIntro && (
                        <div className="bg-white rounded-3xl shadow-xl p-8 text-center animate-fadeIn">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${scale.id === 'PHQ-9' ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                                <span className="text-2xl">{scale.id === 'PHQ-9' ? '💙' : '💛'}</span>
                            </div>

                            <h1 className="text-2xl font-bold text-slate-800 mb-2">{scale.name}</h1>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                {scale.instruction}
                            </p>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                                    <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                                    <span>{totalQuestions} perguntas • ~{scale.id === 'PHQ-9' ? '3' : '2'} minutos</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3 text-left">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span>
                                        Conforme a <strong>LGPD</strong>, suas respostas são anônimas nesta tela e enviadas sob criptografia diretamente ao seu profissional de saúde.
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setCurrentStep(1)}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-base transition-colors shadow-lg active:scale-[0.98]"
                            >
                                Começar
                            </button>
                        </div>
                    )}

                    {/* ─── QUESTION STEP ─────────────────────────────── */}
                    {!isIntro && !isConfirm && currentQuestionIndex >= 0 && currentQuestionIndex < totalQuestions && (
                        <div className="animate-fadeIn" key={currentQuestionIndex}>
                            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
                                <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug mb-8">
                                    {scale.questions[currentQuestionIndex].text}
                                </p>

                                <div className="space-y-3">
                                    {(scale.questions[currentQuestionIndex].answerOptions || scale.answerOptions).map((option) => {
                                        const isSelected = responses[currentQuestionIndex] === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleAnswer(currentQuestionIndex, option.value)}
                                                className={`
                                                    w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200
                                                    active:scale-[0.98]
                                                    ${isSelected
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                                                        : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-slate-100'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                                                        ${isSelected
                                                            ? 'bg-indigo-500 text-white'
                                                            : 'bg-white text-slate-400 border border-slate-200'
                                                        }
                                                    `}>
                                                        {option.value}
                                                    </div>
                                                    <span className="font-medium text-sm sm:text-base">{option.label}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Bottom Nav (for touched questions) */}
                            <div className="flex items-center justify-between mt-6 px-2">
                                <button
                                    onClick={handlePrevious}
                                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors py-2 px-3 rounded-xl hover:bg-white"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Anterior
                                </button>

                                {responses[currentQuestionIndex] !== null && currentStep < totalQuestions && (
                                    <button
                                        onClick={() => {
                                            let nextStep = currentStep + 1;
                                            while (nextStep <= totalQuestions) {
                                                const nextQ = scale!.questions[nextStep - 1];
                                                if (!nextQ.showIf || nextQ.showIf(responses)) break;
                                                nextStep++;
                                            }
                                            setCurrentStep(nextStep);
                                        }}
                                        className="flex items-center gap-1 text-sm text-indigo-600 font-medium py-2 px-3 rounded-xl hover:bg-white transition-colors"
                                    >
                                        Próxima
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}

                                {isComplete && currentStep === totalQuestions && (
                                    <button
                                        onClick={() => setCurrentStep(totalQuestions + 1)}
                                        className="flex items-center gap-1 text-sm text-indigo-600 font-bold py-2 px-3 rounded-xl hover:bg-white transition-colors"
                                    >
                                        Revisar
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                                {scale.questions.map((q, idx) => {
                                    if (q.showIf && !q.showIf(responses)) return null; // hide dot if skipped
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentStep(idx + 1)}
                                            className={`
                                                w-2 h-2 rounded-full transition-all duration-200
                                                ${idx === currentQuestionIndex
                                                    ? 'bg-indigo-500 w-6'
                                                    : responses[idx] !== null
                                                        ? 'bg-indigo-300'
                                                        : 'bg-slate-200'
                                                }
                                            `}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── CONFIRM STEP ──────────────────────────────── */}
                    {isConfirm && (
                        <div className="animate-fadeIn">
                            <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Confira suas respostas</h2>
                                <p className="text-sm text-slate-500 mb-6">Toque em qualquer resposta para alterar.</p>

                                <div className="space-y-2 mb-8 max-h-[45vh] overflow-y-auto pr-1">
                                    {scale.questions.map((q, idx) => {
                                        if (q.showIf && !q.showIf(responses)) return null;
                                        const options = q.answerOptions || scale.answerOptions;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentStep(idx + 1)}
                                                className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                                            >
                                                <span className="text-xs font-bold text-slate-400 mt-0.5 shrink-0 w-5">{idx + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700 leading-snug line-clamp-2">{q.text}</p>
                                                    <p className="text-xs text-indigo-600 font-semibold mt-1">
                                                        {responses[idx] !== null
                                                            ? `${responses[idx]} — ${options.find(o => o.value === responses[idx])?.label}`
                                                            : '⚠️ Não respondida'
                                                        }
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!isComplete}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-base transition-colors shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Send className="w-5 h-5" />
                                    Enviar Respostas
                                </button>
                            </div>

                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mt-4 mx-auto py-2 px-3 rounded-xl hover:bg-white"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Voltar para perguntas
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer branding */}
            <div className="text-center pb-6 pt-2">
                <p className="text-[10px] text-slate-300 font-medium tracking-wider uppercase">
                    Mentis • Plataforma Clínica
                </p>
            </div>
        </div>
    );
};

export default PublicAssessmentPage;
