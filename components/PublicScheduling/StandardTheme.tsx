import React, { useState, useEffect } from 'react';
import { getPublicAvailability, createSchedulingRequest } from '@/services/bookingService';
import { getSlotsForDay, formatCpf, formatPhone } from './bookingUtils';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes, addMinutes, isBefore, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Button from '../Button';
import { Input, Textarea } from '../Form';
import type { PublicAvailability, DaySchedule } from '@/types';
import { NeuronIcon } from '../Icons';
import { ThemeProps } from './types';
import { useToast } from '@/contexts/ToastContext';
import { normalizeInstagramUrl } from '@/utils/socialLinkHelpers';
import { trackMentisEvent } from '@/utils/analytics';
import {
    Instagram,
    Linkedin,
    Globe,
    MessageCircle,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Heart,
    BookOpen,
    Film,
    MapPin,
    Video,
    Clock,
    Calendar,
    CheckCircle,
    AlertCircle,
    User,
    ArrowLeft,
    ExternalLink,
    FileText
} from 'lucide-react';

// --- THEME DEFINITIONS (Restored from Original) ---
const THEME_STYLES: Record<string, any> = {
    purple: {
        id: 'purple',
        primary: 'bg-indigo-600 hover:bg-indigo-700',
        secondary: 'bg-indigo-50',
        text: 'text-indigo-600',
        textDark: 'text-indigo-900',
        border: 'border-indigo-100',
        gradient: 'from-indigo-100 via-purple-100 to-teal-100',
        badge: 'bg-indigo-100 text-indigo-700',
        ring: 'focus:ring-indigo-500',
        iconBg: 'bg-indigo-50',
        accentBg: 'bg-indigo-100'
    },
    blue: {
        id: 'blue',
        primary: 'bg-blue-600 hover:bg-blue-700',
        secondary: 'bg-blue-50',
        text: 'text-blue-600',
        textDark: 'text-blue-900',
        border: 'border-blue-100',
        gradient: 'from-blue-100 via-sky-100 to-indigo-100',
        badge: 'bg-blue-100 text-blue-700',
        ring: 'focus:ring-blue-500',
        iconBg: 'bg-blue-50',
        accentBg: 'bg-blue-100'
    },
    green: {
        id: 'green',
        primary: 'bg-emerald-600 hover:bg-emerald-700',
        secondary: 'bg-emerald-50',
        text: 'text-emerald-600',
        textDark: 'text-emerald-900',
        border: 'border-emerald-100',
        gradient: 'from-emerald-100 via-teal-100 to-lime-100',
        badge: 'bg-emerald-100 text-emerald-700',
        ring: 'focus:ring-emerald-500',
        iconBg: 'bg-emerald-50',
        accentBg: 'bg-emerald-100'
    },
    black: {
        id: 'black',
        primary: 'bg-slate-800 hover:bg-slate-900',
        secondary: ' bg-background ',
        text: ' text-foreground-muted ',
        textDark: ' text-on-surface ',
        border: ' border-border ',
        gradient: 'from-slate-100 via-gray-100 to-zinc-50',
        badge: 'bg-background text-on-surface',
        ring: 'focus:ring-slate-500',
        iconBg: ' bg-background ',
        accentBg: 'bg-slate-200'
    }
};

export const StandardTheme = ({ data }: ThemeProps) => {
    // Alias data to profile for easier copy-paste adaptation
    const profile = data;
    const psychologistId = data.id;
    const { addToast } = useToast();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availability, setAvailability] = useState<PublicAvailability[]>([]);
    // const [profile, setProfile] = useState<any>(null); // Removed: Use prop!
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    const [formStep, setFormStep] = useState<'calendar' | 'form' | 'success'>('calendar');
    const [noSlotsToday, setNoSlotsToday] = useState(false);
    const [isSearchingNext, setIsSearchingNext] = useState(false);

    // Form Stats
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [hasConsented, setHasConsented] = useState(false);
    const [modality, setModality] = useState<'online' | 'presencial'>('online');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    // --- THEME RESOLUTION ---
    // Inherit color from profile if available, otherwise default to purple or use themeId map
    const themeKey = profile.colorScheme || (profile as any).theme || 'purple';
    // Handle 'lilas' -> 'purple' etc if needed, but THEME_STYLES uses 'purple', 'blue', 'green', 'black'. 
    // Data uses 'lilas', 'azul', 'verde', 'preto'. Map it.
    const mapColor = (c?: string) => {
        if (c === 'lilas') return 'purple';
        if (c === 'azul') return 'blue';
        if (c === 'verde') return 'green';
        if (c === 'preto') return 'black';
        return c || 'purple';
    }

    const currentTheme = THEME_STYLES[mapColor(themeKey)] || THEME_STYLES.purple;

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!psychologistId) return;
            const start = startOfWeek(selectedDate);
            const end = endOfWeek(selectedDate);
            const data = await getPublicAvailability(psychologistId, start, end);
            setAvailability(data);
        };
        fetchAvailability();
        
        // Analytics: Track Page View
        trackMentisEvent('page_view', { 
            psychologistId,
            theme: themeKey 
        });
    }, [psychologistId, selectedDate]);

    // Lógica de agendamento externa
    useEffect(() => {
        if (formStep !== 'calendar') return;
        if (isSameDay(selectedDate, new Date())) {
            const slots = getSlotsForDay({ date: selectedDate, profile, availability });
            setNoSlotsToday(slots.length === 0);
        } else {
            setNoSlotsToday(false);
        }
    }, [selectedDate, availability, profile, formStep]);

    const findNextAvailableSlot = async () => {
        setIsSearchingNext(true);
        // Allow UI to render the loading state
        await new Promise(resolve => setTimeout(resolve, 50));

        let searchDate = addDays(new Date(), 1);
        if (isAfter(selectedDate, new Date())) {
            searchDate = addDays(selectedDate, 1);
        }
        let foundDate: Date | null = null;
        let attempts = 0;
        const MAX_DAYS_SEARCH = 30;

        while (attempts < MAX_DAYS_SEARCH && !foundDate) {
            const dayOfWeek = searchDate.getDay();
            const schedule: DaySchedule = profile?.serviceHours?.[dayOfWeek];
            if (schedule && schedule.enabled) {
                const daySlots = getSlotsForDay({ date: searchDate, profile, availability });
                if (daySlots.length > 0) {
                    foundDate = searchDate;
                } else {
                    searchDate = addDays(searchDate, 1);
                    attempts++;
                }
            } else {
                searchDate = addDays(searchDate, 1);
                attempts++;
            }
        }

        if (foundDate) {
            setSelectedDate(foundDate);
            setNoSlotsToday(false);
        } else {
            addToast("Não encontramos horários livres nos próximos 30 dias.", "warning");
        }
        setIsSearchingNext(false);
    };

    const handleSlotClick = (slot: Date) => {
        // Analytics: Track Slot Selected and Time To Select
        const timeOnPage = typeof window !== 'undefined' && window.performance ? Math.round(performance.now() / 1000) : 0;
        trackMentisEvent('calendar_slot_selected', { 
            psychologistId, 
            slot: slot.toISOString(),
            time_to_select_seconds: timeOnPage
        });

        setSelectedSlot(slot);
        setFormStep('form');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot) return;

        setIsSubmitting(true);
        try {
            if (!psychologistId) {
                addToast("Erro: ID do psicólogo não encontrado. Por favor, recarregue a página.", "error");
                setIsSubmitting(false);
                return;
            }
            const res = await createSchedulingRequest(psychologistId, {
                name, phone, email, cpf, birthDate, modality, time: selectedSlot, notes, lgpdConsented: hasConsented
            });
            setIsSubmitting(false);

            if (res.success) {
                trackMentisEvent('booking_completed', { psychologistId, slot: selectedSlot.toISOString() });
                setFormStep('success');
            } else {
                trackMentisEvent('booking_abandoned', { psychologistId, error: res.error });
                addToast(res.error || "Erro ao agendar.", "error");
            }
        } catch (error) {
            console.error("Booking error:", error);
            addToast("Erro inesperado ao realizar o agendamento.", "error");
            setIsSubmitting(false);
        }
    };

    const getLinkIcon = (link: { url: string; title: string }) => {
        const url = (link.url || '').toLowerCase();
        const title = (link.title || '').toLowerCase();
        if (url.includes('instagram')) return <Instagram className="w-5 h-5" />;
        if (url.includes('whatsapp')) return <MessageCircle className="w-5 h-5" />;
        if (url.includes('linkedin')) return <Linkedin className="w-5 h-5" />;
        if (title.includes('curadoria') || title.includes('livro')) return <BookOpen className="w-5 h-5" />;
        if (title.includes('video') || title.includes('youtube')) return <Film className="w-5 h-5" />;
        return <Globe className="w-5 h-5" />;
    };

    if (!profile && formStep !== 'success') {
        return (
            <div className={`min-h-screen flex items-center justify-center  text-foreground-muted  font-sans bg-gradient-to-br ${currentTheme.gradient}`}>
                <div className="animate-pulse flex flex-col items-center">
                    <NeuronIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p>Carregando perfil...</p>
                </div>
            </div>
        );
    }

    if (profile && profile.schedulingSettings?.active === false) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 font-sans bg-gradient-to-br ${currentTheme.gradient} fixed inset-0`}>
                <div className=" bg-surface/80 backdrop-blur-lg border border-white/50 p-8 rounded-3xl shadow-2xl max-w-md text-center">
                    <div className="w-16 h-16 bg-background/50 text-foreground-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-on-surface mb-2">Agenda Fechada</h2>
                    <p className=" text-foreground-muted mb-6 font-medium">No momento, este profissional não está recebendo novos agendamentos online.</p>
                    {profile.email && <p className="text-sm text-foreground-muted ">Contato: {profile.email}</p>}
                </div>
            </div>
        )
    }

    if (formStep === 'success') {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 font-sans bg-gradient-to-br ${currentTheme.gradient} fixed inset-0`}>
                <div className=" bg-surface/90 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl max-w-md text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-on-surface mb-2">Solicitação Enviada!</h2>
                    <p className=" text-foreground-muted mb-8 leading-relaxed">
                        Recebemos seu pedido de agendamento para <br />
                        <span className={`font-bold ${currentTheme.text} text-lg`}>
                            {selectedSlot && format(selectedSlot, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>.
                    </p>
                    <Button className={`w-full h-12 text-lg shadow-lg ${currentTheme.primary}`} onClick={() => window.location.reload()}>
                        Voltar ao Início
                    </Button>
                </div>
            </div>
        );
    }

    if (formStep === 'form') {
        return (
            <div className="min-h-screen font-sans text-on-surface relative pb-12">
                <div className={`fixed inset-0 bg-gradient-to-br ${currentTheme.gradient} -z-10`} />
                <div className="max-w-md mx-auto pt-12 px-4">
                    <button
                        onClick={() => setFormStep('calendar')}
                        className={`mb-6 flex items-center  text-foreground-muted  hover:${currentTheme.text} font-medium transition-colors  bg-surface/40  px-4 py-2 rounded-full backdrop-blur-sm border border-white/40 shadow-sm`}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </button>
                    <div className=" bg-surface/90 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl">
                        <div className={`flex items-center mb-8 border-b ${currentTheme.border} pb-6`}>
                            {profile?.photoUrl ? (
                                <img src={profile.photoUrl} alt={profile.name} className="h-14 w-14 rounded-full object-cover mr-4 border-2 border-white shadow-md bg-surface " />
                            ) : (
                                <div className={`h-14 w-14 rounded-full ${currentTheme.accentBg} flex items-center justify-center mr-4 ${currentTheme.text}`}>
                                    <User className="w-6 h-6" />
                                </div>
                            )}
                            <div>
                                <p className={`text-xs ${currentTheme.text} uppercase font-bold tracking-wider mb-1`}>Agendamento com</p>
                                <h3 className="text-lg font-bold text-on-surface ">{profile?.name}</h3>
                            </div>
                        </div>

                        <div className={`${currentTheme.secondary}/80 p-4 rounded-2xl mb-8 border ${currentTheme.border} flex items-center`}>
                            <Clock className={`w-6 h-6 ${currentTheme.text} mr-3`} />
                            <div>
                                <span className={`block text-xs ${currentTheme.text} font-bold uppercase`}>Data Selecionada</span>
                                <p className={`${currentTheme.textDark} font-bold text-lg`}>
                                    {selectedSlot && format(selectedSlot, "EEE, dd 'de' MMMM", { locale: ptBR })}
                                </p>
                                <p className={`${currentTheme.text} font-medium`}>
                                    às {selectedSlot && format(selectedSlot, "HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <Input label="Nome Completo *" value={name} onChange={(e) => setName(e.target.value)} required />
                            <div className="grid grid-cols-2 gap-4">
                                <Input type="tel" label="Celular *" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required placeholder="(99) 99999-9999" />
                                <Input label="CPF *" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} required placeholder="000.000.000-00" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input type="email" label="Email (Opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
                                <Input type="date" label="Data Nascimento *" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground-muted mb-2">Modalidade *</label>
                                <div className="flex space-x-4">
                                    <label className={`flex-1 border-2 rounded-xl p-3 cursor-pointer transition-all ${modality === 'online' ? `${currentTheme.secondary} border-current ${currentTheme.text}` : ' bg-surface/50  border-transparent  text-foreground-muted  hover:bg-white'}`}>
                                        <input type="radio" name="modality" value="online" checked={modality === 'online'} onChange={() => setModality('online')} className="sr-only" />
                                        <div className="text-center font-bold flex flex-col items-center">
                                            <Video className="w-6 h-6 mb-1" />
                                            Online
                                        </div>
                                    </label>
                                    <label className={`flex-1 border-2 rounded-xl p-3 cursor-pointer transition-all ${modality === 'presencial' ? `${currentTheme.secondary} border-current ${currentTheme.text}` : ' bg-surface/50  border-transparent  text-foreground-muted  hover:bg-white'}`}>
                                        <input type="radio" name="modality" value="presencial" checked={modality === 'presencial'} onChange={() => setModality('presencial')} className="sr-only" />
                                        <div className="text-center font-bold flex flex-col items-center">
                                            <MapPin className="w-6 h-6 mb-1" />
                                            Presencial
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <Textarea label="Motivo (Breve)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                            
                            <label className="flex items-start gap-3 p-4 border border-border rounded-xl bg-surface/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hasConsented}
                                    onChange={(e) => setHasConsented(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-border"
                                    required
                                />
                                <span className="text-xs text-foreground-muted leading-tight">
                                    Concordo com os Termos de Uso e Política de Privacidade. Reconheço que os dados
                                    fornecidos serão tratados conforme a Lei Geral de Proteção de Dados (LGPD).
                                </span>
                            </label>

                            <Button type="submit" disabled={isSubmitting || !hasConsented} className={`w-full h-14 text-lg font-bold shadow-lg rounded-xl ${currentTheme.primary} ${!hasConsented ? 'opacity-50' : ''}`}>
                                {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const weekDays = eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 })
    });

    const totalSlotsThisWeek = weekDays.reduce((acc, day) => {
        if (isBefore(day, startOfDay(new Date()))) return acc;
        return acc + getSlotsForDay({ date: day, profile, availability }).length;
    }, 0);
    const isCurrentWeek = isSameDay(startOfWeek(selectedDate, { weekStartsOn: 0 }), startOfWeek(new Date(), { weekStartsOn: 0 }));

    const handleWaitlistClick = () => {
        trackMentisEvent('booking_waitlist_clicked', { psychologistId });
        const text = encodeURIComponent(`Olá ${profile?.name}, vi que sua agenda online está cheia. Gostaria de entrar na lista de espera para o próximo horário disponível.`);
        const phone = profile?.phone || profile?.whatsapp || '';
        if (phone) {
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank');
        } else {
            addToast("O profissional não disponibilizou um número de WhatsApp.", "warning");
        }
    };

    return (
        <div className="min-h-screen font-sans text-on-surface relative pb-12">
            <div className={`fixed inset-0 bg-gradient-to-br ${currentTheme.gradient} -z-10`} />
            <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:grid lg:grid-cols-3 gap-8 items-start pb-24">

                {/* 1. Profile & Authority (Top on Mobile, Left on Desktop) */}
                <div className="lg:col-span-2 order-1 space-y-8">
                    <div>
                        <div className="bg-surface/60 backdrop-blur-md border border-white/40 shadow-xl rounded-3xl p-6 md:p-8">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
                                <div className="shrink-0">
                                    {profile?.photoUrl ? (
                                        <img src={profile.photoUrl} alt={profile.name} className="w-28 h-28 md:w-32 md:h-32 rounded-full shadow-lg border-4 border-white object-cover bg-surface " />
                                    ) : (
                                        <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full shadow-lg border-4 border-white ${currentTheme.accentBg} flex items-center justify-center ${currentTheme.text}`}>
                                            <User className="w-12 h-12 md:w-16 md:h-16" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">{profile?.name || 'Agendamento Online'}</h1>
                                    {profile?.bioDescription && (
                                        <p className=" text-foreground-muted font-medium italic mb-6 leading-relaxed">"{profile.bioDescription}"</p>
                                    )}
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-medium text-foreground-muted ">
                                        {profile?.specialty && (
                                            <span className={`flex items-center ${currentTheme.text}  bg-surface/40  px-3 py-1 rounded-full border border-white/40`}>
                                                <BookOpen className="w-4 h-4 mr-2" /> {profile.specialty}
                                            </span>
                                        )}
                                        {profile?.graduationYear && (
                                            <span className={`flex items-center ${currentTheme.text} bg-surface/40 px-3 py-1 rounded-full border border-white/40`}>
                                                <Clock className="w-4 h-4 mr-2" /> Atuação clínica desde {profile.graduationYear}
                                            </span>
                                        )}
                                        {profile?.city && (
                                            <span className="flex items-center bg-surface/40 px-3 py-1 rounded-full border border-white/40">
                                                <MapPin className="w-4 h-4 mr-2 text-foreground-muted " />
                                                {profile.city} {profile.state && `/ ${profile.state}`}
                                            </span>
                                        )}
                                        {profile?.councilNumber && (
                                            <span className="flex items-center bg-surface/40 px-3 py-1 rounded-full border border-white/40">
                                                <FileText className="w-4 h-4 mr-2 text-foreground-muted" />
                                                {profile.councilName || 'CRP'}: {profile.councilNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     {/* 2. Especialidades e Foco Clínico */}
                    {profile?.targetAudiences && profile.targetAudiences.length > 0 && (
                        <div>
                            <h3 className="text-xl font-semibold text-on-surface mb-3 px-2">Especialidades e Foco Clínico</h3>
                            <div className="flex flex-wrap gap-2 px-2">
                                {profile.targetAudiences.map((audience: string, index: number) => (
                                    <span key={index} className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-white/40 bg-surface/60 ${currentTheme.text}`}>
                                        <Heart className="w-4 h-4 mr-2 opacity-70" /> {audience}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Serviços Disponíveis */}
                    {profile?.services && profile.services.length > 0 && (
                        <section>
                            <h3 className="text-xl font-semibold text-on-surface mb-4 px-2">Serviços Disponíveis</h3>
                            <div className="flex flex-col gap-3">
                                {profile.services.filter((s: any) => s.active).map((service: any) => (
                                    <div 
                                        key={service.id} 
                                        onClick={() => trackMentisEvent('service_clicked', { psychologistId, service: service.name })}
                                        className="group flex items-start p-4 bg-surface/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-md cursor-default"
                                    >
                                        <div className={`${currentTheme.secondary} p-2.5 rounded-lg mr-4 ${currentTheme.text} shadow-sm group-hover:scale-110 transition-transform mt-1`}>
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-foreground-muted text-lg leading-tight">{service.name}</h4>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full  bg-surface/50  ${currentTheme.text} border border-white/20 ml-2 whitespace-nowrap`}>
                                                    {service.modality === 'online' ? 'Online' : 'Presencial'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{service.description || 'Sessão de atendimento personalizada.'}</p>
                                            <div className="flex items-center text-xs text-foreground-muted mt-2 font-medium">
                                                <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {service.duration} min</span>
                                                {service.showPrice && service.price && (
                                                    <span className="ml-3 text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                        A partir de R$ {service.price.toFixed(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 4. Marketing: Abordagem Traduzida */}
                    {profile?.approachTranslation && (
                        <div className="bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6 relative overflow-hidden mt-4">
                            <div className={`absolute top-0 left-0 w-1 h-full ${currentTheme.primary}`} />
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-2 flex items-center">
                                <NeuronIcon className="w-4 h-4 mr-2 opacity-60" /> Como eu trabalho
                            </h3>
                            <p className="text-foreground-muted leading-relaxed text-sm whitespace-pre-wrap">
                                {profile.approachTranslation}
                            </p>
                        </div>
                    )}

                    {/* 5. Formações e Certificações */}
                    {profile?.certifications && profile.certifications.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-on-surface mb-3 px-2 flex items-center">
                                <CheckCircle className={`w-4 h-4 mr-2 ${currentTheme.text}`} /> Formações e Certificações
                            </h3>
                            <div className="flex flex-col gap-2">
                                {profile.certifications.map((cert: string, index: number) => (
                                    <div key={index} className="flex items-start text-sm text-foreground-muted bg-surface/40 px-4 py-2.5 rounded-xl border border-white/40">
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.primary} mt-1.5 mr-3 shrink-0`} />
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. FAQ Accordion */}
                    {profile?.faq && profile.faq.length > 0 && (
                        <section className="bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm rounded-3xl p-6 mt-4">
                            <h3 className="text-xl font-semibold text-on-surface mb-4">Dúvidas Frequentes</h3>
                            <div className="space-y-3">
                                {profile.faq.map((item: any, index: number) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div key={index} className="border border-border/60 bg-surface/40 rounded-2xl overflow-hidden transition-all duration-200">
                                            <button
                                                className="w-full p-4 flex justify-between items-center text-left hover:bg-surface/80"
                                                onClick={() => {
                                                    setOpenFaqIndex(isOpen ? null : index);
                                                    if (!isOpen) trackMentisEvent('faq_opened', { psychologistId, question: item.question });
                                                }}
                                            >
                                                <span className="font-bold text-sm text-on-surface">{item.question}</span>
                                                {isOpen ? <ChevronUp className="w-5 h-5 text-foreground-muted shrink-0" /> : <ChevronDown className="w-5 h-5 text-foreground-muted shrink-0" />}
                                            </button>
                                            {isOpen && (
                                                <div className="p-4 pt-0 text-sm text-foreground-muted leading-relaxed">
                                                    {item.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 7. Locais de Atendimento */}
                    {profile?.serviceLocations && profile.serviceLocations.length > 0 && (
                        <section>
                            <h3 className="text-xl font-semibold text-on-surface mb-4 px-2">Locais de Atendimento</h3>
                            <div className="flex flex-col gap-3">
                                {profile.serviceLocations.filter((l: any) => l.active).map((loc: any) => (
                                    <div key={loc.id} className="group flex items-start p-4 bg-surface/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-md cursor-default">
                                        <div className={`p-2.5 rounded-lg mr-4 shadow-sm group-hover:scale-110 transition-transform mt-1 ${loc.type === 'online' ? `${currentTheme.secondary} ${currentTheme.text}` : 'bg-orange-100/50 text-orange-600'}`}>
                                            {loc.type === 'online' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-foreground-muted text-lg leading-tight">{loc.name}</h4>
                                                {loc.type === 'physical' && (
                                                    <div
                                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`, '_blank')}
                                                        className="text-xs text-blue-600 flex items-center bg-blue-50 px-2 py-1 rounded ml-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                                    >
                                                        Ver no mapa <ExternalLink className="w-3 h-3 ml-1" />
                                                    </div>
                                                )}
                                            </div>
                                            {loc.type === 'physical' && loc.address && (
                                                <p className="text-sm text-foreground-muted mt-1 leading-relaxed">{loc.address}</p>
                                            )}
                                            {loc.type === 'online' && (
                                                <p className="text-sm text-foreground-muted mt-1">Sala de Atendimento Virtual Segura</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 8. Redes Sociais */}
                    {totalSlotsThisWeek === 0 && (
                        <div className="flex flex-col gap-3 pt-4">
                            <h3 className="text-sm font-bold text-on-surface mb-2 px-2">Acompanhe nas Redes</h3>
                            {profile?.socialLinks?.instagram && (
                                <a href={normalizeInstagramUrl(profile.socialLinks.instagram)} target="_blank" rel="noreferrer" onClick={() => trackMentisEvent('social_clicked', { platform: 'instagram' })} className="group flex items-center p-3 bg-surface/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-md">
                                    <div className=" bg-surface/60 p-2.5 rounded-lg mr-4 text-pink-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <Instagram className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-foreground-muted flex-1">Instagram</span>
                                    <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-pink-600 transition-colors" />
                                </a>
                            )}
                            {profile?.socialLinks?.linkedin && (
                                <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="group flex items-center p-3 bg-surface/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-md">
                                    <div className=" bg-surface/60 p-2.5 rounded-lg mr-4 text-blue-700 shadow-sm group-hover:scale-110 transition-transform">
                                        <Linkedin className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-foreground-muted flex-1">LinkedIn</span>
                                    <ChevronRight className="w-5 h-5 text-foreground-muted group-hover:text-blue-700 transition-colors" />
                                </a>
                            )}
                            {profile?.customLinks?.filter((l: any) => l.active).map((link: any) => (
                                <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="group flex items-center p-3 bg-surface/40 hover:bg-white/70 backdrop-blur-sm border border-white/40 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm hover:shadow-md">
                                    <div className={` bg-surface/60  p-2.5 rounded-lg mr-4 ${currentTheme.text} shadow-sm group-hover:scale-110 transition-transform`}>
                                        {getLinkIcon(link)}
                                    </div>
                                    <span className="font-semibold text-foreground-muted flex-1">{link.title}</span>
                                    <ChevronRight className={`w-5 h-5  text-foreground-muted  group-hover:${currentTheme.text} transition-colors`} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COL - CALENDAR (Middle on Mobile, Right on Desktop) */}
                <div className="lg:col-span-1 order-2 lg:order-2 lg:row-span-2">
                    <div className="lg:sticky lg:top-8 z-10">
                        <div className=" bg-surface/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-3xl overflow-hidden relative">
                            <div className={`p-4 ${currentTheme.secondary}/50 border-b ${currentTheme.border} text-center`}>
                                <h3 className="font-bold text-foreground-muted ">Escolha um horário</h3>
                            </div>
                            <div className={`flex items-center justify-between p-4 border-b ${currentTheme.border}  bg-surface/40 `}>
                                <button
                                    onClick={() => setSelectedDate(d => addDays(d, -7))}
                                    disabled={isBefore(addDays(selectedDate, -7), startOfWeek(new Date()))}
                                    className="p-2 hover:bg-white hover:shadow-md rounded-lg transition-all text-foreground-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h2 className="font-bold text-sm capitalize text-on-surface bg-surface/50 px-4 py-1 rounded-full shadow-sm">
                                    {format(selectedDate, 'MMM yyyy', { locale: ptBR })}
                                </h2>
                                <button
                                    onClick={() => setSelectedDate(d => addDays(d, 7))}
                                    className="p-2 hover:bg-white hover:shadow-md rounded-lg transition-all text-foreground-muted "
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {isCurrentWeek && totalSlotsThisWeek > 0 && totalSlotsThisWeek <= 3 && (
                                <div className="bg-orange-100/80 text-orange-800 text-xs font-bold text-center py-2 px-4 shadow-inner flex items-center justify-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Agenda concorrida: Restam apenas {totalSlotsThisWeek} horários esta semana.
                                </div>
                            )}

                            {noSlotsToday ? (
                                <div className="p-6 flex flex-col justify-center items-center py-12 text-center bg-surface/40">
                                    <Calendar className={`w-12 h-12 ${currentTheme.text} mb-4`} />
                                    <h3 className="text-lg font-black text-on-surface mb-2">Agenda Bastante Procurada</h3>
                                    <p className="text-foreground-muted text-sm mb-6 max-w-xs mx-auto">
                                        No momento, não há horários disponíveis para hoje.
                                    </p>
                                    
                                    <div className="flex flex-col gap-3 w-full">
                                        <Button onClick={findNextAvailableSlot} className={`w-full rounded-xl ${currentTheme.primary} text-white shadow-md h-12 text-sm font-bold`} disabled={isSearchingNext}>
                                            {isSearchingNext ? 'Buscando disponibilidade...' : 'Buscar Próxima Vaga'}
                                        </Button>
                                        <Button variant="secondary" onClick={handleWaitlistClick} className="w-full rounded-xl h-12 text-sm font-bold flex items-center justify-center bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-transparent">
                                            <MessageCircle className="w-4 h-4 mr-2" /> Entrar na Lista de Espera
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                                    <div className={`grid grid-cols-7 divide-x ${currentTheme.border.replace('border-', 'divide-')} border-b ${currentTheme.border}`}>
                                        {weekDays.map(day => {
                                            const slots = getSlotsForDay({ date: day, profile, availability });
                                            const isToday = isSameDay(day, new Date());
                                            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                                            return (
                                                <div key={day.toString()} className={`flex flex-col ${isPast ? ' bg-surface/50 ' : ''}`}>
                                                    <div className={`sticky top-0 z-10 p-2 text-center border-b ${currentTheme.border} backdrop-blur-md ${isToday ? `${currentTheme.secondary}/90` : ' bg-surface/90 '}`}>
                                                        <div className="text-[10px] uppercase text-foreground-muted font-bold mb-0.5">{format(day, 'EEE', { locale: ptBR }).slice(0, 1)}</div>
                                                        <div className={`text-sm font-bold ${isToday ? currentTheme.text : ' text-foreground-muted '}`}>{format(day, 'd')}</div>
                                                    </div>
                                                    <div className="py-1 px-0.5 space-y-1 flex-1 min-h-[100px] relative">
                                                        {slots.length > 0 && slots.map(slot => (
                                                            <button
                                                                key={slot.toString()}
                                                                onClick={() => handleSlotClick(slot)}
                                                                className={`w-full py-1.5 px-0.5  bg-surface  hover:${currentTheme.primary} hover:text-white ${currentTheme.text} border ${currentTheme.border} hover:border-transparent rounded text-xs font-bold transition-all shadow-sm`}
                                                            >
                                                                {format(slot, 'HH:mm')}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-surface/50 text-center">
                                <p className="text-[10px] text-foreground-muted ">Horário de Brasília</p>
                            </div>
                        </div>

                        {/* NEW: Trust Layer */}
                        <div className="mt-6 bg-surface/60 backdrop-blur-md border border-white/40 shadow-sm rounded-3xl p-6">
                            <h3 className="text-lg font-bold text-on-surface mb-4">Como funciona</h3>
                            <ul className="space-y-3 text-sm font-medium text-foreground-muted">
                                <li className="flex items-start">
                                    <CheckCircle className={`w-5 h-5 mr-3 shrink-0 ${currentTheme.text}`} />
                                    <span>Escolha um horário disponível</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className={`w-5 h-5 mr-3 shrink-0 ${currentTheme.text}`} />
                                    <span>Preencha seus dados de contato</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className={`w-5 h-5 mr-3 shrink-0 ${currentTheme.text}`} />
                                    <span>Receba a confirmação do agendamento</span>
                                </li>
                                <li className="flex items-start">
                                    <CheckCircle className={`w-5 h-5 mr-3 shrink-0 ${currentTheme.text}`} />
                                    <span>Compareça ao atendimento no horário marcado</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <footer className="mt-8 text-center pb-8 opacity-60 hover:opacity-100 transition-opacity">
                <p className=" text-foreground-muted text-xs mb-2 uppercase tracking-wider font-bold">Tecnologia Mentis</p>
                <div className="flex items-center justify-center space-x-2">
                    <NeuronIcon className="h-6 w-6 text-foreground-muted " />
                </div>
            </footer>
        </div>
    );
};
