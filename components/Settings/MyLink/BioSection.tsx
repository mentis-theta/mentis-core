import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/authService';
import Button from '@/components/Button';
import { Input, Textarea } from '@/components/Form';
import { LinkIcon, TrashIcon, PlusIcon } from '@/components/Icons';
import { CustomLink } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/services/supabaseClient';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const BioSection = () => {
    const { currentUser, refreshUsers } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // Local state for immediate feedback
    const [bioSlug, setBioSlug] = useState(currentUser?.bioSlug || '');
    const [isSlugAvailable, setIsSlugAvailable] = useState(true);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);

    const [bioDescription, setBioDescription] = useState(currentUser?.bioDescription || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    // Redes Sociais
    const [instagram, setInstagram] = useState(currentUser?.socialLinks?.instagram || '');
    const [tiktok, setTiktok] = useState(currentUser?.socialLinks?.tiktok || '');
    const [youtube, setYoutube] = useState(currentUser?.socialLinks?.youtube || '');
    const [linkedin, setLinkedin] = useState(currentUser?.socialLinks?.linkedin || '');

    // Custom Links
    const [customLinks, setCustomLinks] = useState<CustomLink[]>(currentUser?.customLinks || []);

    // Check slug availability debounce
    useEffect(() => {
        if (!bioSlug || bioSlug === currentUser?.bioSlug) {
            setIsSlugAvailable(true);
            setIsCheckingSlug(false);
            return;
        }

        const checkSlug = async () => {
            setIsCheckingSlug(true);
            const { data, error } = await supabase
                .rpc('check_slug_availability', { slug_param: bioSlug, current_profile_id: currentUser?.id });
            
            if (!error && data !== null) {
                setIsSlugAvailable(data);
            }
            setIsCheckingSlug(false);
        };

        const timeout = setTimeout(checkSlug, 500);
        return () => clearTimeout(timeout);
    }, [bioSlug, currentUser?.bioSlug, currentUser?.id]);

    const handleSave = async () => {
        if (!currentUser) return;
        if (!isSlugAvailable) {
            addToast("O link escolhido já está em uso.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const updates = {
                bioSlug,
                bioDescription,
                socialLinks: { ...currentUser?.socialLinks, instagram, tiktok, youtube, linkedin },
                customLinks
            };

            const { success, error } = await updateProfile(currentUser.id, updates);
            if (success) {
                await refreshUsers();
                addToast("Bio e Links atualizados com sucesso!", "success");
            } else {
                addToast(error || "Erro ao atualizar.", "error");
            }
        } catch (error) {
            addToast("Erro ao processar.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const addCustomLink = () => {
        setCustomLinks([...customLinks, { id: crypto.randomUUID(), title: '', url: '', active: true }]);
    };

    const updateCustomLink = (id: string, field: keyof CustomLink, value: any) => {
        setCustomLinks(links => links.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeCustomLink = (id: string) => {
        setCustomLinks(links => links.filter(l => l.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm">
                <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-6 flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2 text-primary/60" />
                    Perfil Público (Bio)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            Link da sua Bio (Slug)
                        </label>
                        <div className="flex relative">
                            <span className={`inline-flex items-center px-3 rounded-l-md border border-r-0 ${!isSlugAvailable ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20' : 'border-border bg-surface dark:bg-slate-700 text-foreground-muted'} text-sm`}>
                                mentis.com.br/
                            </span>
                            <input
                                type="text"
                                value={bioSlug}
                                onChange={e => {
                                    // only allow valid URL slug chars
                                    setBioSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                }}
                                className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border ${!isSlugAvailable ? 'border-red-500 focus:ring-red-500 focus:border-red-500 text-red-600' : 'border-border focus:ring-blue-500 focus:border-blue-500'} sm:text-sm`}
                                placeholder="seu-nome"
                            />
                        </div>
                        {!isSlugAvailable && (
                            <p className="mt-2 text-sm font-medium text-red-500 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" /> Este link já está em uso, por favor escolha outro.
                            </p>
                        )}
                        {isCheckingSlug && (
                            <p className="mt-2 text-sm text-foreground-muted flex items-center">
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Verificando disponibilidade...
                            </p>
                        )}
                        {isSlugAvailable && bioSlug && bioSlug !== currentUser?.bioSlug && !isCheckingSlug && (
                            <p className="mt-2 text-sm font-medium text-green-500 flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Link disponível!
                            </p>
                        )}
                    </div>

                    <div className="col-span-2">
                        <Textarea
                            label="Sobre mim (Bio)"
                            value={bioDescription}
                            onChange={e => setBioDescription(e.target.value)}
                            rows={3}
                            placeholder="Breve descrição sobre sua atuação..."
                        />
                    </div>
                </div>

                <div className="border-t border-border/40 my-6"></div>

                <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider mb-4">Redes Sociais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Instagram" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@seu.perfil" />
                    <Input label="TikTok" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="@seu.perfil" />
                    <Input label="YouTube" value={youtube} onChange={e => setYoutube(e.target.value)} placeholder="https://youtube.com/seu-canal" />
                    <Input label="LinkedIn" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/seu-perfil" />
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-[32px] border border-border/40 dark:border-white/10 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight">Links Personalizáveis</h3>
                    <Button size="sm" variant="secondary" onClick={addCustomLink}>
                        <PlusIcon className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                </div>

                {customLinks.length === 0 ? (
                    <p className=" text-foreground-muted text-sm italic">Nenhum link extra adicionado.</p>
                ) : (
                    <div className="space-y-4">
                        {customLinks.map((link, index) => (
                            <div key={link.id} className="flex gap-4 items-start bg-surface/50 dark:bg-slate-700/20 p-5 rounded-3xl border border-border/40">
                                <div className="flex-1 space-y-2">
                                    <Input
                                        placeholder="Título do Botão (ex: Meu Site)"
                                        value={link.title}
                                        onChange={e => updateCustomLink(link.id, 'title', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                    <Input
                                        placeholder="URL (https://...)"
                                        value={link.url}
                                        onChange={e => updateCustomLink(link.id, 'url', e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <Button variant="danger" size="sm" onClick={() => removeCustomLink(link.id)} className="mt-1">
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </div >
    );
};
