import { ServiceType, SocialLinks, ServiceLocation, SchedulingSettings } from '@/types';

export interface ProfileData {
    name: string;
    photoUrl?: string;
    bio?: string;
    bioSlug?: string;
    specialty?: string;
    councilNumber?: string;
    email?: string;
    phone?: string;
    location?: string;

    socialLinks?: SocialLinks;
    services?: ServiceType[];
    serviceLocations?: ServiceLocation[];
    schedulingSettings?: SchedulingSettings;

    themeId?: string;
    colorScheme?: 'lilas' | 'azul' | 'verde' | 'preto';
    bioDescription?: string;
    customLinks?: { id: string; title: string; url: string; active: boolean }[];
    councilName?: string;
    city?: string;
    state?: string;
    
    id: string;
    serviceHours?: any;

    targetAudiences?: string[];
    approachTranslation?: string;
    faq?: { question: string; answer: string }[];
    certifications?: string[];
    graduationYear?: number;
    whatsapp?: string;
}

export interface ThemeProps {
    data: ProfileData;
    onOpenBooking?: () => void; // Tornando opcional pois o StandardTheme não precisa abrir modal
}
