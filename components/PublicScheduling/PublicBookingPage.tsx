import React, { useState, useEffect } from 'react';
import { getPsychologistProfile } from '@/services/bookingService';
import { AlertCircle } from 'lucide-react';
import { StandardTheme } from './StandardTheme';

interface PublicBookingPageProps {
    psychologistId: string;
}

const PublicBookingPage: React.FC<PublicBookingPageProps> = ({ psychologistId }) => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            const data = await getPsychologistProfile(psychologistId);
            if (data) {
                const displayName = data.display_name || data.name;
                data.name = displayName;
                document.title = `${displayName} | Agendamento`;
            }
            setProfile(data);
            setLoading(false);
        };
        loadProfile();
    }, [psychologistId]);

    useEffect(() => {
        // Inject Google Fonts
        const linkId = 'mentis-google-fonts';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&family=Courier+Prime&family=Inter:wght@300;400;600;800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Nunito:wght@400;600;700&family=Spectral:ital,wght@0,300;0,600;1,300&family=Lora:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&family=Playfair+Display:ital@1&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col md:flex-row animate-fadeIn">
                {/* Left Side Skeleton (Bio) */}
                <div className="w-full md:w-[45%] lg:w-[40%] xl:w-[35%] h-[40vh] md:h-screen p-8 flex flex-col items-center justify-center relative overflow-hidden bg-surface-container-lowest">
                    <div className="absolute inset-0 opacity-20 bg-foreground/10 dark:bg-foreground/20 animate-pulse"></div>
                    <div className="w-32 h-32 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse mb-6 z-10 border-4 border-surface shadow-lg ring-1 ring-foreground/5 dark:ring-white/10"></div>
                    <div className="w-48 h-8 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse mb-3 z-10"></div>
                    <div className="w-32 h-4 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse mb-8 z-10"></div>
                    <div className="flex gap-4 mb-8 z-10">
                        <div className="w-10 h-10 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse"></div>
                        <div className="w-10 h-10 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse"></div>
                        <div className="w-10 h-10 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse"></div>
                    </div>
                </div>

                {/* Right Side Skeleton (Content) */}
                <div className="w-full md:w-[55%] lg:w-[60%] xl:w-[65%] p-6 lg:p-12 overflow-y-auto">
                    <div className="max-w-2xl mx-auto pt-8">
                        {[1, 2, 3].map((section) => (
                            <div key={section} className="mb-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse shrink-0"></div>
                                    <div className="w-40 h-6 rounded-full bg-foreground/10 dark:bg-foreground/20 animate-pulse"></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[1, 2].map((card) => (
                                        <div key={card} className="h-28 rounded-2xl bg-surface-container-lowest border border-border animate-pulse p-5 flex flex-col justify-between">
                                            <div className="w-3/4 h-5 rounded-full bg-foreground/10 dark:bg-foreground/20"></div>
                                            <div className="w-1/2 h-4 rounded-full bg-foreground/10 dark:bg-foreground/20"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile || profile.schedulingSettings?.active === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <div className="bg-surface p-8 rounded-2xl shadow-xl max-w-md text-center border border-border/40">
                    <AlertCircle className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-on-surface mb-2">Agendamentos Indisponíveis</h2>
                    <p className="text-foreground-muted">
                        No momento, este profissional não está aceitando novos agendamentos online.
                        Por favor, tente novamente mais tarde ou entre em contato diretamente.
                    </p>
                </div>
            </div>
        );
    }

    return <StandardTheme data={profile} />;
};

export default PublicBookingPage;
