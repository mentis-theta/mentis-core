
import { supabase } from './supabaseClient';
import type { SchedulingRequest, PublicAvailability } from '../types';
import { showGlobalToast } from '../contexts/ToastContext.tsx';

// --- Availability ---

export const getPublicAvailability = async (psychologistId: string, startRange: Date, endRange: Date): Promise<PublicAvailability[]> => {
    const { data, error } = await supabase
        .from('public_availability')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .gte('end_time', startRange.toISOString())
        .lte('start_time', endRange.toISOString());

    if (error) {
        console.error("Error fetching availability:", error);
        showGlobalToast('Falha ao carregar horários disponíveis. Tente novamente.', 'error');
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        psychologistId: row.psychologist_id,
        startTime: row.start_time,
        endTime: row.end_time,
        isAvailable: row.is_available
    }));
};

export const getPsychologistProfile = async (psychologistIdOrSlug: string) => {
    // 1. Determine if the param is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(psychologistIdOrSlug);
    
    // 2. Call the appropriate RPC
    const rpcName = isUUID ? 'get_public_profile' : 'get_public_profile_by_slug';
    const rpcParams = isUUID ? { profile_id: psychologistIdOrSlug } : { slug_param: psychologistIdOrSlug };

    // Use secure RPC to get public profile data (bypassing strict RLS for anon)
    const { data, error } = await supabase
        .rpc(rpcName, rpcParams);

    if (error) {
        console.error("Error fetching psychologist profile:", error);
        return null;
    }

    // Cast to any to handle RPC result structure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = data as any;
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    if (!profile) {
        return null;
    }

    return {
        id: profile.id,
        name: profile.name,
        display_name: profile.display_name,
        specialty: profile.specialty,
        photoUrl: profile.photo_url,
        logoUrl: profile.logo_url,
        serviceHours: profile.service_hours,
        councilName: profile.council_name,
        councilNumber: profile.council_number,
        city: profile.city,
        state: profile.state,

        // Meu Link Fields
        bioSlug: profile.bio_slug,
        bioDescription: profile.bio_description,
        socialLinks: profile.social_links,
        
        // CRO / Marketing Fields
        certifications: profile.certifications,
        graduationYear: profile.graduation_year,
        targetAudiences: profile.target_audiences,
        approachTranslation: profile.approach_translation,
        faq: profile.faq,
        customLinks: profile.custom_links,
        serviceLocations: profile.service_locations,
        services: profile.services,
        schedulingSettings: profile.scheduling_settings,
        theme: profile.theme,
        themeId: profile.theme_id,
        colorScheme: profile.color_scheme
    };
};

// Sync session to public availability (mark as busy)
export const syncSessionToAvailability = async (psychologistId: string, sessionId: string, start: Date, end: Date) => {
    // 1. Remove existing availability for this session (cleanup)
    const { error: deleteError } = await supabase
        .from('public_availability')
        .delete()
        .eq('session_id', sessionId);

    if (deleteError) {
        console.error("Error cleaning up availability:", deleteError);
        return;
    }

    // 2. Insert new "Busy" slot
    const { error } = await supabase
        .from('public_availability')
        .insert({
            psychologist_id: psychologistId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            is_available: false,
            session_id: sessionId
        });

    if (error) console.error("Error syncing availability:", error);
};

export const deleteSessionAvailability = async (sessionId: string) => {
    const { error } = await supabase
        .from('public_availability')
        .delete()
        .eq('session_id', sessionId);

    if (error) console.error("Error deleting availability:", error);
};

// --- Scheduling Requests ---

export const createSchedulingRequest = async (
    psychologistId: string,
    data: {
        name: string;
        phone: string;
        email?: string;
        cpf?: string;
        birthDate?: string;
        modality?: 'online' | 'presencial';
        time: Date;
        notes?: string;
        lgpdConsented?: boolean;
    }
): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
        .from('scheduling_requests')
        .insert({
            psychologist_id: psychologistId,
            patient_name: data.name,
            patient_phone: data.phone,
            patient_email: data.email,
            patient_cpf: data.cpf,
            patient_birth_date: data.birthDate,
            modality: data.modality,
            requested_time: data.time.toISOString(),
            notes: data.notes,
            status: 'pending',
            lgpd_consent: data.lgpdConsented,
            lgpd_consent_date: data.lgpdConsented ? new Date().toISOString() : null
        });

    if (error) {
        console.error("Error creating request:", error);
        return { success: false, error: 'Erro ao enviar solicitação.' };
    }
    return { success: true };
};

export const getSchedulingRequests = async (psychologistId: string): Promise<SchedulingRequest[]> => {
    const { data, error } = await supabase
        .from('scheduling_requests')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching requests:", error);
        return [];
    }

    return data.map((row: any) => ({
        id: row.id,
        psychologistId: row.psychologist_id,
        patientName: row.patient_name,
        patientPhone: row.patient_phone,
        patientEmail: row.patient_email,
        patientCpf: row.patient_cpf,
        patientBirthDate: row.patient_birth_date,
        modality: row.modality,
        requestedTime: row.requested_time,
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        lgpdConsented: row.lgpd_consent,
        lgpdConsentDate: row.lgpd_consent_date
    }));
};

export const updateSchedulingRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
        .from('scheduling_requests')
        .update({ status })
        .eq('id', requestId);

    if (error) throw error;
};

export const deleteSchedulingRequest = async (requestId: string) => {
    const { error } = await supabase
        .from('scheduling_requests')
        .delete()
        .eq('id', requestId);

    if (error) throw error;
};
