import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Form';
import { BriefcaseIcon, PlusIcon, TrashIcon, CurrencyDollarIcon, ClockIcon } from '@/components/Icons';
import { ServiceType } from '@/types';
import { useToast } from '@/contexts/ToastContext';

export const ServicesSection = () => {
    const { currentUser, refreshUsers } = useAuth();
 const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [services, setServices] = useState<ServiceType[]>(currentUser?.services || []);
    const isVerified = true;

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, { services });
            if (success) {
                await refreshUsers();
 addToast("Serviços atualizados com sucesso!", "success");
            } else {
 addToast(error || "Erro ao salvar.", "error");
            }
        } catch (error) {
 addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const addService = () => {
        const newService: ServiceType = {
            id: crypto.randomUUID(),
            name: '',
            modality: 'online',
            duration: 50,
            price: 0,
            showPrice: true,
            requirePrepayment: false,
            active: true
        };
        setServices([...services, newService]);
    };

    const updateService = (id: string, field: keyof ServiceType, value: any) => {
        setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeService = (id: string) => {
        setServices(prev => prev.filter(s => s.id !== id));
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
            <div>
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-2 flex items-center">
                    <BriefcaseIcon className="w-4 h-4 mr-2 text-primary/60" />
                    Serviços Oferecidos
                </h3>
                <p className="text-xs text-foreground-muted italic max-w-2xl">
                    ⚠️ Atenção: Os serviços cadastrados aqui funcionam como uma <strong>vitrine/catálogo</strong> na sua página. A duração da sessão configurada aqui não altera o tamanho dos blocos na sua agenda pública (a grade do calendário obedece o "Tempo de sessão padrão" definido em Políticas).
                </p>
            </div>

            <div className="space-y-4">
                {services.length === 0 && (
                    <p className=" text-foreground-muted text-sm italic">Nenhum serviço cadastrado.</p>
                )}

                {services.map((service) => (
                    <div key={service.id} className="border border-border/40 rounded-3xl p-5 bg-surface/50 dark:bg-slate-700/20">
                        <div className="flex justify-between items-start mb-4">
                            <Input
                                placeholder="Nome do Serviço (ex: Psicoterapia Individual)"
                                value={service.name}
                                onChange={e => updateService(service.id, 'name', e.target.value)}
                                className="font-medium text-lg w-full md:w-1/2"
                            />
                            <div className="flex items-center gap-3">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={service.active}
                                        onChange={e => updateService(service.id, 'active', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    <span className="ml-2 text-sm text-foreground-muted ">{service.active ? 'Ativo' : 'Inativo'}</span>
                                </label>
                                <Button variant="danger" size="sm" onClick={() => removeService(service.id)}>
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <Textarea
                            placeholder="Descrição do serviço (ex: Sessão terapêutica com foco em TCC para ansiedade...)"
                            value={service.description || ''}
                            onChange={e => updateService(service.id, 'description', e.target.value)}
                            rows={2}
                            className="text-sm mb-2"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Select
                                label="Modalidade"
                                value={service.modality}
                                onChange={e => updateService(service.id, 'modality', e.target.value)}
                                options={[
                                    { value: 'online', label: 'Online' },
                                    { value: 'presencial', label: 'Presencial' },
                                    { value: 'hybrid', label: 'Híbrido' }
                                ]}
                            />

                            <div className="relative">
                                <Input
                                    label="Duração (min)"
                                    type="number"
                                    value={(service.duration ?? 50).toString()}
                                    onChange={e => updateService(service.id, 'duration', parseInt(e.target.value) || 0)}
                                />
                                <ClockIcon className="absolute right-3 top-9 w-4 h-4 text-foreground-muted " />
                            </div>

                            <div className="relative">
                                <Input
                                    label="Valor (R$)"
                                    type="number"
                                    value={(service.price ?? 0).toString()}
                                    onChange={e => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                                />
                                <CurrencyDollarIcon className="absolute right-3 top-9 w-4 h-4 text-foreground-muted " />
                            </div>

                            <div className="space-y-3 pt-6"> {/* Align with inputs */}
                                <label className="flex items-center text-sm text-foreground-muted ">
                                    <input
                                        type="checkbox"
                                        checked={service.showPrice}
                                        onChange={e => updateService(service.id, 'showPrice', e.target.checked)}
                                        className="rounded border-border text-blue-600 shadow-sm mr-2"
                                    />
                                    Exibir valor na Bio
                                </label>

                                <div className="relative group">
                                    <label className={`flex items-center text-sm ${!isVerified ? ' text-foreground-muted  cursor-not-allowed' : ' text-foreground-muted   '}`}>
                                        <input
                                            type="checkbox"
                                            checked={service.requirePrepayment}
                                            onChange={e => isVerified && updateService(service.id, 'requirePrepayment', e.target.checked)}
                                            disabled={!isVerified}
                                            className="rounded border-border text-blue-600 shadow-sm mr-2"
                                        />
                                        Cobrança Antecipada
                                    </label>
                                    {!isVerified && (
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-black text-white text-xs rounded p-2 z-10">
                                            Requer conta verificada para habilitar pagamentos online.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button variant="secondary" onClick={addService}>
                <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Serviço
            </Button>

            <div className="flex justify-end pt-4 border-t border-border ">
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar Serviços'}
                </Button>
            </div>
        </div>
    );
};
