import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import type { Patient } from '@/types';
import * as cryptoService from '@/services/cryptoService';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { getPortalToken, hasPortalToken } from '@/services/portalAuthService';

// Helper: extrair nome amigável do dispositivo
const getDeviceName = (ua: string): string => {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) {
        const match = ua.match(/Android[^;]*;\s*([^)]+)\)/);
        return match ? match[1].trim().split(' Build')[0] : 'Android';
    }
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'PC (Windows)';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Dispositivo desconhecido';
};

export const usePortalUser = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const [deviceLimitError, setDeviceLimitError] = useState(false);

    const fetchPatientFn = async (): Promise<Patient> => {
        // Check for Preview Mode (Therapist View)
        const params = new URLSearchParams(location.search);
        const previewId = params.get('preview_id');
        const isPreview = !!previewId;
        
        // Check for Magic Link Mode (Patient View - Custo Zero)
        const portalToken = getPortalToken();
        const magicId = portalToken?.patientId ?? null;
        const magicTokenVersion = portalToken?.version ?? 1;
        const isMagic = !!magicId && !currentUser;

        // Authentication Check 
        if (!currentUser && !isPreview && !isMagic) throw new Error("Autenticação necessária.");

        // 1. Query by auth_user_id OR ID (if Preview or Magic)
        let data: any = null;
        let error: any = null;

        if (isPreview) {
            const result = await supabase.from('patients').select('*').eq('id', previewId).maybeSingle();
            data = result.data;
            error = result.error;
        } else if (isMagic) {
            // Usa função SECURITY DEFINER para bypassar RLS de forma segura
            const result = await supabase.rpc('get_portal_patient', { 
                p_patient_id: magicId,
                p_token_version: magicTokenVersion
            });
            if (result.error) {
                error = result.error;
            } else if (result.data && result.data.length > 0) {
                data = result.data[0];
            } else {
                error = { message: 'Link inválido ou expirado. Solicite um novo link ao seu terapeuta.' };
            }
        } else {
            const result = await supabase.from('patients').select('*').eq('auth_user_id', currentUser!.id).maybeSingle();
            data = result.data;
            error = result.error;
        }

        if (error) {
            throw error;
        }

        // 2. Registrar dispositivo (apenas para Magic Link, se ainda não registrado nesta sessão do browser)
        if (isMagic && magicId) {
            const sessionRegistered = sessionStorage.getItem('mentis_device_registered');
            if (!sessionRegistered) {
                try {
                    const ua = navigator.userAgent;
                    const deviceName = getDeviceName(ua);
                    await supabase.rpc('register_portal_access', {
                        p_patient_id: magicId,
                        p_device_name: deviceName,
                        p_user_agent: ua,
                        p_token_version: magicTokenVersion
                    });
                    sessionStorage.setItem('mentis_device_registered', 'true');
                } catch (regErr: any) {
                    if (regErr?.message?.includes('DEVICE_LIMIT_REACHED')) {
                        setDeviceLimitError(true);
                        throw new Error('DEVICE_LIMIT_REACHED');
                    }
                    // Falha silenciosa para outros erros de registro — não bloquear acesso
                    console.warn('Device registration failed (non-blocking):', regErr);
                }
            }
        }

        // 3. Fetch Psychologist Branding
        const psychologistId = data.user_id;
        let psychologistData = {};

        if (psychologistId) {
            const { data: profData } = await supabase
                .from('profiles')
                .select('color_scheme, clinic_name, name, logo_url')
                .eq('id', psychologistId)
                .single();

            if (profData) {
                psychologistData = {
                    colorScheme: profData.color_scheme,
                    clinicName: profData.clinic_name,
                    name: profData.name,
                    logoUrl: profData.logo_url
                };
            }
        }

        // Temporary Mock until migration for displaying name correctly:
        const partialPatient: Patient = {
            id: data.id,
            createdAt: data.created_at,
            email: data.email,
            authUserId: data.auth_user_id,
            name: data.display_name || data.email?.split('@')[0] || 'Paciente',
            psychologist: psychologistData,
            psychologistId: data.user_id,
            sessions: [],
            documents: [],
            goals: [],
            insights: [],
            status: 'active',
            cpf: '',
            phone: '',
            birthDate: '',
            consent: false,
            paymentType: 'particular',
            medicalHistory: ''
        };

        return partialPatient;
    };

    const { data: patient = null, isLoading: loading, error } = useQuery({
        queryKey: ['portal_user', currentUser?.id, location.search, hasPortalToken()],
        queryFn: fetchPatientFn,
        enabled: !!currentUser || location.search.includes('preview_id') || hasPortalToken(),
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // Flag centralizada: true quando o terapeuta está visualizando o portal como paciente (preview)
    const isSimulation = !!(currentUser && patient && currentUser.id !== patient.authUserId) || location.search.includes('preview_id');

    // Extrair token information para uso em RPCs (bypass RLS)
    const exportedToken = getPortalToken();
    const isMagic = !!exportedToken?.patientId && !currentUser;
    const magicTokenVersion = exportedToken?.version ?? 1;

    return { patient, loading, error: error ? error.message : null, isSimulation, deviceLimitError, isMagic, magicTokenVersion };
};
