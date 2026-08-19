import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { Input } from '@/components/Form';
import { MapPinIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '@/components/Icons';
import { ServiceLocation } from '@/types';
import { useToast } from '@/contexts/ToastContext';

export const LocationsSection = () => {
    const { currentUser, refreshUsers } = useAuth();
 const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize with existing locations or defaults if empty
    // We want at least one "Online" location by default? Maybe not.
    const [locations, setLocations] = useState<ServiceLocation[]>(currentUser?.serviceLocations || []);

    const handleSave = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { success, error } = await updateProfile(currentUser.id, { serviceLocations: locations });
            if (success) {
                await refreshUsers();
 addToast("Locais de atendimento atualizados!", "success");
            } else {
 addToast(error || "Erro ao salvar.", "error");
            }
        } catch (error) {
 addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const addLocation = (type: 'online' | 'physical') => {
        const newLocation: ServiceLocation = {
            id: crypto.randomUUID(),
            type,
            name: type === 'online' ? 'Videoconferência' : '',
            address: '',
            active: true
        };
        setLocations([...locations, newLocation]);
    };

    const updateLocation = (id: string, field: keyof ServiceLocation, value: any) => {
        setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLocation = (id: string) => {
        setLocations(prev => prev.filter(l => l.id !== id));
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm space-y-6">
            <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-4 flex items-center">
                <MapPinIcon className="w-4 h-4 mr-2 text-primary/60" />
                Locais de Atendimento
            </h3>

            <div className="space-y-4">
                {locations.length === 0 && (
                    <p className=" text-foreground-muted text-sm italic">Nenhum local de atendimento cadastrado.</p>
                )}

                {locations.map((loc) => (
                    <div key={loc.id} className="border border-border/40 rounded-3xl p-5 bg-surface/50 dark:bg-slate-700/20 relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${loc.type === 'online' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'}`}>
                                    {loc.type === 'online' ? 'Online' : 'Presencial'}
                                </span>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={loc.active}
                                        onChange={e => updateLocation(loc.id, 'active', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    <span className="ml-2 text-sm text-foreground-muted ">{loc.active ? 'Ativo' : 'Inativo'}</span>
                                </label>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => removeLocation(loc.id)}>
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nome do Local (Ex: Clínica Central)"
                                value={loc.name}
                                onChange={e => updateLocation(loc.id, 'name', e.target.value)}
                            />
                            {loc.type === 'physical' && (
                                <Input
                                    label="Endereço Completo"
                                    value={loc.address || ''}
                                    onChange={e => updateLocation(loc.id, 'address', e.target.value)}
                                    placeholder="Rua, Número, Bairro, Cidade"
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => addLocation('online')}>
                    <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Online
                </Button>
                <Button variant="secondary" onClick={() => addLocation('physical')}>
                    <PlusIcon className="w-4 h-4 mr-1" /> Adicionar Presencial
                </Button>
            </div>

            <div className="flex justify-end pt-4 border-t border-border ">
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar Locais'}
                </Button>
            </div>
        </div>
    );
};
