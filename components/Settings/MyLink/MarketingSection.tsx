import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { Input, Textarea } from '@/components/Form';
import { SparklesIcon, PlusIcon, TrashIcon, TagIcon } from '@/components/Icons';
import { useToast } from '@/contexts/ToastContext';

export const MarketingSection = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [targetAudiences, setTargetAudiences] = useState<string[]>(currentUser?.targetAudiences || []);
    const [newAudience, setNewAudience] = useState('');
    const [approachTranslation, setApproachTranslation] = useState(currentUser?.approachTranslation || '');
    
    // FAQ State
    const [faqs, setFaqs] = useState<{ question: string, answer: string }[]>(currentUser?.faq || []);

    // Social Proof
    const [certifications, setCertifications] = useState<string[]>(currentUser?.certifications || []);
    const [newCertification, setNewCertification] = useState('');
    const [graduationYear, setGraduationYear] = useState<number | ''>(currentUser?.graduationYear || '');

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const updates = {
                targetAudiences,
                approachTranslation,
                faq: faqs,
                certifications,
                graduation_year: graduationYear === '' ? null : graduationYear
            };

            const { success, error } = await updateProfile(currentUser.id, updates);
            if (success) {
                await refreshUsers();
                addToast("Configurações de marketing salvas com sucesso!", "success");
            } else {
                addToast(error || "Erro ao salvar.", "error");
            }
        } catch (error) {
            addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Audiences ---
    const handleAddAudience = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ('key' in e && e.key !== 'Enter') return;
        e.preventDefault();
        
        const trimmed = newAudience.trim();
        if (trimmed && !targetAudiences.includes(trimmed)) {
            setTargetAudiences([...targetAudiences, trimmed]);
            setNewAudience('');
        }
    };

    const removeAudience = (indexToRemove: number) => {
        setTargetAudiences(targetAudiences.filter((_, idx) => idx !== indexToRemove));
    };

    // --- FAQ ---
    const addFaq = () => {
        setFaqs([...faqs, { question: '', answer: '' }]);
    };

    const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
        const newFaqs = [...faqs];
        newFaqs[index][field] = value;
        setFaqs(newFaqs);
    };

    const removeFaq = (index: number) => {
        setFaqs(faqs.filter((_, i) => i !== index));
    };

    // --- Certifications ---
    const handleAddCertification = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ('key' in e && e.key !== 'Enter') return;
        e.preventDefault();
        
        const trimmed = newCertification.trim();
        if (trimmed && !certifications.includes(trimmed)) {
            setCertifications([...certifications, trimmed]);
            setNewCertification('');
        }
    };

    const removeCertification = (indexToRemove: number) => {
        setCertifications(certifications.filter((_, idx) => idx !== indexToRemove));
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-4 flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-primary/60" />
                    Autoridade e Prova Social
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-bold text-foreground mb-1">
                            Ano de Formação
                        </label>
                        <p className="text-xs text-foreground-muted mb-3">
                            Em vez de contar os anos, mostramos "Atuação clínica desde 2023" para gerar mais credibilidade.
                        </p>
                        <Input
                            type="number"
                            placeholder="Ex: 2020"
                            value={graduationYear}
                            onChange={(e) => setGraduationYear(e.target.value ? parseInt(e.target.value) : '')}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-foreground mb-1">
                            Certificações e Pós-Graduações
                        </label>
                        <p className="text-xs text-foreground-muted mb-3">
                            Liste suas principais formações ("Especialista em TCC", "Pós em Neuropsicologia").
                        </p>
                        <div className="flex gap-2 mb-3">
                            <Input
                                placeholder="Digite uma certificação e aperte Enter"
                                value={newCertification}
                                onChange={(e) => setNewCertification(e.target.value)}
                                onKeyDown={handleAddCertification}
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={handleAddCertification}>Adicionar</Button>
                        </div>
                        {certifications.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {certifications.map((cert, idx) => (
                                    <div key={idx} className="flex items-center bg-surface/50 text-foreground border border-border/60 px-3 py-1.5 rounded-full text-sm font-medium">
                                        <TagIcon className="w-3 h-3 mr-1.5 opacity-70" />
                                        {cert}
                                        <button onClick={() => removeCertification(idx)} className="ml-2 hover:text-red-500 opacity-70 hover:opacity-100 transition-opacity">
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-4 flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2 text-primary/60" />
                    Proposta de Valor
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">
                            Como você ajuda? (Proposta de Valor)
                        </label>
                        <p className="text-xs text-foreground-muted mb-3">
                            Explique de forma clara, humanizada e sem jargões como o seu trabalho resolve o problema do paciente. O foco é clareza para a tomada de decisão.
                        </p>
                        <Textarea
                            placeholder="Ex: Atendimento psicológico para adultos com foco em ansiedade, autoconhecimento e neurodivergência."
                            value={approachTranslation}
                            onChange={(e) => setApproachTranslation(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="border-t border-border/40 pt-6">
                        <label className="block text-sm font-bold text-foreground mb-1">
                            Especialidades / Públicos Atendidos
                        </label>
                        <p className="text-xs text-foreground-muted mb-3">
                            Pacientes buscam soluções específicas (Match de Problema). Insira tags curtas como "Ansiedade", "TDAH", "Casais", etc.
                        </p>
                        <div className="flex gap-2 mb-3">
                            <Input
                                placeholder="Digite uma especialidade e aperte Enter"
                                value={newAudience}
                                onChange={(e) => setNewAudience(e.target.value)}
                                onKeyDown={handleAddAudience}
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={handleAddAudience}>Adicionar</Button>
                        </div>
                        
                        {targetAudiences.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {targetAudiences.map((aud, idx) => (
                                    <div key={idx} className="flex items-center bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-sm font-medium">
                                        <TagIcon className="w-3 h-3 mr-1.5 opacity-70" />
                                        {aud}
                                        <button onClick={() => removeAudience(idx)} className="ml-2 hover:text-red-500 opacity-70 hover:opacity-100 transition-opacity">
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {targetAudiences.length === 0 && (
                            <p className="text-sm italic text-foreground-muted">Nenhuma especialidade adicionada ainda.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight flex items-center">
                            Dúvidas Frequentes (FAQ)
                        </h3>
                        <p className="text-xs text-foreground-muted mt-1">Quebre objeções respondendo perguntas comuns antecipadamente (ex: Aceita convênio?).</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={addFaq}>
                        <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Pergunta
                    </Button>
                </div>

                {faqs.length === 0 ? (
                    <p className="text-foreground-muted text-sm italic py-4">Nenhuma dúvida cadastrada.</p>
                ) : (
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="flex gap-4 items-start bg-surface/50 dark:bg-slate-700/20 p-5 rounded-3xl border border-border/40">
                                <div className="flex-1 space-y-3">
                                    <Input
                                        placeholder="Pergunta (ex: Como funciona a primeira sessão?)"
                                        value={faq.question}
                                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                                        className="font-medium text-sm"
                                    />
                                    <Textarea
                                        placeholder="Sua resposta..."
                                        value={faq.answer}
                                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                    />
                                </div>
                                <Button variant="danger" size="sm" onClick={() => removeFaq(index)}>
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading ? 'Salvando...' : 'Salvar Marketing'}
                </Button>
            </div>
        </div>
    );
};
