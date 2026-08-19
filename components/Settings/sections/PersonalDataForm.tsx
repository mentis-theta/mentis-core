import React, { useState, useEffect } from 'react';
import { Input } from '@/components/Form';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { useToast } from '@/contexts/ToastContext';
import { User } from 'lucide-react';

// IBGE API Helpers
const fetchStates = async () => {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
    const data = await res.json();
    return data.map((uf: any) => ({ id: uf.sigla, label: uf.nome, value: uf.sigla }));
};

const fetchCities = async (uf: string) => {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    const data = await res.json();
    return data.map((city: any) => ({ id: String(city.id), label: city.nome, value: city.nome }));
};

export const PersonalDataForm: React.FC = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [states, setStates] = useState<{ id: string; label: string; value: string }[]>([]);
    const [cities, setCities] = useState<{ id: string; label: string; value: string }[]>([]);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        birthDate: '',
        state: '',
        city: '',
        photoUrl: '',
    });

    useEffect(() => {
        fetchStates().then(setStates);
    }, []);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name || '',
                phone: currentUser.phone || '',
                birthDate: currentUser.birthDate || '',
                state: currentUser.state || '',
                city: currentUser.city || '',
                photoUrl: currentUser.photoUrl || '',
            });
        }
    }, [currentUser]);

    useEffect(() => {
        if (formData.state) {
            setIsLoadingCities(true);
            fetchCities(formData.state).then(data => {
                setCities(data);
                setIsLoadingCities(false);
            });
        }
    }, [formData.state]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, city: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
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
                addToast('Dados pessoais salvos!', 'success');
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
                Dados Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Avatar Upload */}
                <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <div className="mb-4 relative group">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-border bg-background flex items-center justify-center">
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <User className="w-12 h-12 text-slate-400" />
                            )}
                        </div>
                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
                    <p className="text-xs text-foreground-muted text-center">Foto de Perfil</p>
                </div>

                {/* Personal Fields */}
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            id="name"
                            label="Nome Completo"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <Input
                        id="phone"
                        label="Telefone / WhatsApp"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                    />
                    <Input
                        id="birthDate"
                        label="Data de Nascimento"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleChange}
                    />
                    <div className="md:col-span-1">
                        <label htmlFor="state" className="block text-sm font-medium text-foreground-muted mb-1">Estado (UF)</label>
                        <select
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 py-2 px-3"
                        >
                            <option value="">Selecione...</option>
                            {states.map(uf => <option key={uf.id} value={uf.value}>{uf.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="city" className="block text-sm font-medium text-foreground-muted mb-1">Cidade</label>
                        <select
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            disabled={!formData.state}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 py-2 px-3 disabled:opacity-50"
                        >
                            <option value="">{isLoadingCities ? 'Carregando...' : 'Selecione...'}</option>
                            {cities.map(city => <option key={city.id} value={city.value}>{city.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Card-level save button (M3) */}
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="sm">
                    {isSaving ? 'Salvando...' : 'Salvar Dados Pessoais'}
                </Button>
            </div>
        </div>
    );
};
