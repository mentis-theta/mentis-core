import React, { useState, useEffect } from 'react';
import { Input } from '@/components/Form';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { useToast } from '@/contexts/ToastContext';

const CRPS = Array.from({ length: 24 }, (_, i) => ({
    id: `CRP-${String(i + 1).padStart(2, '0')}`,
    label: `CRP-${String(i + 1).padStart(2, '0')}`,
    value: `CRP-${String(i + 1).padStart(2, '0')}`
}));

export const ProfessionalDataForm: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
 const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        specialty: '',
        display_name: '',
        councilName: '',
        councilNumber: '',
        cpf: '',
        addressFull: '',
        signatureUrl: '',
        taxRegime: 'pf',
    });

    useEffect(() => {
        if (currentUser) {
            setFormData({
                specialty: currentUser.specialty || '',
                display_name: currentUser.display_name || '',
                councilName: currentUser.councilName || '',
                councilNumber: currentUser.councilNumber || '',
                cpf: currentUser.cpf || '',
                addressFull: currentUser.addressFull || '',
                signatureUrl: currentUser.signatureUrl || '',
                taxRegime: currentUser.taxRegime || 'pf',
            });
        }
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, signatureUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, formData);
            if (success) {
                await refreshUsers();
 addToast('Dados profissionais salvos!', 'success');
            } else {
 addToast(error || 'Erro ao salvar.', 'error');
            }
        } catch {
 addToast('Erro ao salvar.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-surface-container-lowest border border-border/40 rounded-[24px] p-6 shadow-sm transition-all duration-300">
            <h3 className="text-[14px] font-black text-foreground uppercase tracking-tight mb-6 border-b border-border/40 pb-3">
                Dados Profissionais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Assinatura Digital (direito do profissional, permanece aqui) */}
                <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <div className="mb-4 relative group">
                        <div className="h-20 w-40 rounded-lg overflow-hidden border-2 border-dashed border-border bg-surface flex items-center justify-center">
                            {formData.signatureUrl ? (
                                <img src={formData.signatureUrl} alt="Assinatura" className="h-full w-full object-contain" />
                            ) : (
                                <span className=" text-foreground-muted text-xs text-center p-2">Assinatura</span>
                            )}
                        </div>
                        <label
                            htmlFor="signature-upload"
                            className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs py-1 px-3 rounded-full cursor-pointer hover:bg-slate-800 shadow-md whitespace-nowrap"
                        >
                            Alterar
                        </label>
                        <input
                            id="signature-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureUpload}
                            className="hidden"
                        />
                    </div>
                    <p className="text-xs text-foreground-muted text-center mt-4">Assinatura Digital</p>
                    <p className="text-[10px] text-foreground-muted text-center mt-1">Usada em documentos e recibos</p>
                </div>

                {/* Professional Fields */}
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            id="specialty"
                            label="Especialidade / Abordagem"
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleChange}
                            placeholder="Ex: Neuropsicologia, TCC"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Input
                            id="display_name"
                            label="Nome Profissional (Como aparecerá no link público)"
                            name="display_name"
                            value={formData.display_name}
                            onChange={handleChange}
                            placeholder="Ex: Dra. Ana Silva ou Ana Silva Psicóloga"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label htmlFor="councilName" className="block text-sm font-medium text-foreground-muted mb-1">Conselho (CRP)</label>
                        <select
                            id="councilName"
                            name="councilName"
                            value={formData.councilName}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 py-2 px-3"
                        >
                            <option value="">Selecione...</option>
                            {CRPS.map(crp => <option key={crp.id} value={crp.value}>{crp.label}</option>)}
                        </select>
                    </div>

                    <Input
                        id="councilNumber"
                        label="Número de Registro"
                        name="councilNumber"
                        value={formData.councilNumber}
                        onChange={handleChange}
                        placeholder="00000/00"
                    />

                    <Input
                        id="cpf"
                        label="CPF (Para Recibos)"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleChange}
                        placeholder="000.000.000-00"
                    />

                    <div className="md:col-span-2">
                        <Input
                            id="addressFull"
                            label="Endereço Completo (Para Recibos)"
                            name="addressFull"
                            value={formData.addressFull}
                            onChange={handleChange}
                            placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
                        />
                    </div>

                    {/* Tax Regime Toggle */}
                    <div className="md:col-span-2 pt-4 border-t border-border/40 mt-2">
                        <label className="block text-sm font-medium text-foreground-muted mb-3">Atuação Fiscal (Cálculo de Impostos)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`relative flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${formData.taxRegime === 'pf' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-surface-container-lowest hover:bg-surface-container-low'}`}>
                                <input
                                    type="radio"
                                    name="taxRegime"
                                    value="pf"
                                    checked={formData.taxRegime === 'pf'}
                                    onChange={handleChange}
                                    className="sr-only"
                                />
                                <div className="text-center">
                                    <span className={`block text-sm font-bold ${formData.taxRegime === 'pf' ? 'text-primary' : 'text-on-surface'}`}>Pessoa Física (CPF)</span>
                                    <span className="block text-xs text-foreground-muted mt-1">Carnê-Leão e Isenções IRPF</span>
                                </div>
                            </label>
                            
                            <label className={`relative flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${formData.taxRegime === 'pj' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-surface-container-lowest hover:bg-surface-container-low'}`}>
                                <input
                                    type="radio"
                                    name="taxRegime"
                                    value="pj"
                                    checked={formData.taxRegime === 'pj'}
                                    onChange={handleChange}
                                    className="sr-only"
                                />
                                <div className="text-center">
                                    <span className={`block text-sm font-bold ${formData.taxRegime === 'pj' ? 'text-primary' : 'text-on-surface'}`}>Pessoa Jurídica (CNPJ)</span>
                                    <span className="block text-xs text-foreground-muted mt-1">Simples Nacional (Fator R)</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card-level save button (M3) */}
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                    {isSaving ? 'Salvando...' : 'Salvar Dados Profissionais'}
                </Button>
            </div>
        </div>
    );
};
