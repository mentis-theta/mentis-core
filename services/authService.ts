import { supabase } from './supabaseClient.ts';
import * as cryptoService from './cryptoService.ts';
import type { User, RegisterData } from '../types.ts';
import type { AuthError } from '@supabase/supabase-js';
import * as auditLogger from './auditLogger.ts';

const SAFE_PROFILE_COLUMNS = `
  id, name, display_name, role, email, crp, cpf, 
  specialty, phone, birth_date, council_name, 
  city, state, timezone, photo_url, logo_url, 
  bio_slug, bio_description, social_links, custom_links, 
  service_locations, services, service_hours, 
  scheduling_settings, expense_categories, linked_user_ids, theme, theme_id, color_scheme, target_audiences, approach_translation, faq,
  certifications, graduation_year, clinic_name, tax_regime, has_seen_docstation_guide,
  key_salt, has_recovery_phrase, recovery_skip_count
`.replace(/\s/g, '');

// --- Types ---

export interface AuthResult {
  success: boolean;
  user?: User;
  masterKey?: string;
  error?: string;
  mfaRequired?: boolean; // Indicates if MFA challenge is needed
}

export interface DatabaseProfile {
    id?: string;
    name?: string;
    display_name?: string;
    role?: string;
    email?: string;
    crp?: string;
    cpf?: string;
    specialty?: string;
    phone?: string;
    birth_date?: string;
    council_name?: string;
    city?: string;
    state?: string;
    timezone?: string;
    photo_url?: string;
    logo_url?: string;
    bio_slug?: string;
    bio_description?: string;
    social_links?: any;
    custom_links?: any;
    service_locations?: any;
    services?: any;
    service_hours?: any;
    scheduling_settings?: any;
    expense_categories?: any;
    linked_user_ids?: string[];
    theme?: 'lilas' | 'azul' | 'verde' | 'preto';
    theme_id?: string;
    color_scheme?: 'lilas' | 'azul' | 'verde' | 'preto';
    target_audiences?: string[];
    approach_translation?: string;
    faq?: any;
    certifications?: any;
    graduation_year?: number;
    clinic_name?: string;
    tax_regime?: 'pf' | 'pj';
    has_seen_docstation_guide?: boolean;
    encrypted_master_key?: string;
    key_salt?: string;
    public_key?: string;
    encrypted_private_key?: string;
    has_recovery_phrase?: boolean;
    recovery_skip_count?: number;
}

// --- Helpers ---

const mapSupabaseUserToUser = (sbUser: { id: string, email?: string, user_metadata?: any }, profile: DatabaseProfile): User => {
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: profile?.name || sbUser.user_metadata?.name || 'User',
    role: profile?.role || sbUser.user_metadata?.role || 'psychologist',
    crp: profile?.crp,
    cpf: profile?.cpf,
    linkedUserIds: profile?.linked_user_ids || [], // Mapped correctly now
    taxRegime: profile?.tax_regime,
    has_seen_docstation_guide: profile?.has_seen_docstation_guide,

    // Security and E2EE Fields
    key_salt: profile?.key_salt,
    has_recovery_phrase: profile?.has_recovery_phrase,
    recovery_skip_count: profile?.recovery_skip_count,

    // Profile Fields Mapping
    display_name: profile?.display_name,
    specialty: profile?.specialty,
    phone: profile?.phone,
    birthDate: profile?.birth_date,
    councilName: profile?.council_name,
    councilNumber: profile?.crp,
    city: profile?.city,
    state: profile?.state,
    timezone: profile?.timezone,
    photoUrl: profile?.photo_url,
    logoUrl: profile?.logo_url,
    theme: profile?.theme,
    themeId: profile?.theme_id,
    colorScheme: profile?.color_scheme,
    clinicName: profile?.clinic_name,
    targetAudiences: profile?.target_audiences,
    approachTranslation: profile?.approach_translation,
    faq: profile?.faq,
    certifications: profile?.certifications,
    graduationYear: profile?.graduation_year,
    // Meu Link Fields
    bioSlug: profile?.bio_slug,
    bioDescription: profile?.bio_description,
    socialLinks: profile?.social_links,
    customLinks: profile?.custom_links,
    serviceLocations: profile?.service_locations,
    services: profile?.services,
    serviceHours: profile?.service_hours,
    schedulingSettings: profile?.scheduling_settings,
    expenseCategories: profile?.expense_categories,
  };
};

// --- Helper for Profile Cleanup ---
const cleanUserMetadata = async (user: any) => {
  // Basic cleanup logic if needed
  // In production we might not need this if we trust supabase completely
  return;
};

// --- MFA Helpers (Proxied) ---
export const getAuthenticatorAssuranceLevel = async () => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    currentLevel: data?.currentLevel,
    nextLevel: data?.nextLevel
  };
};

export const challengeMFA = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) return { success: false, error: error.message };
  return { success: true, challengeId: data?.id };
};

export const verifyMFA = async (factorId: string, challengeId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};


// --- Public API ---

export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // 1. Call Secure Edge Function (Handles Rate Limiting + Auth server-side)
    const { data: fnData, error: fnError } = await supabase.functions.invoke('login', {
      body: { email, password }
    });

    if (fnError) {
      // The Edge Function returned an error (e.g. 429 Rate Limit or 401 Invalid Credentials)
      throw new Error(fnError.message || fnError.context?.error || 'Erro de autenticação no servidor');
    }

    if (fnData?.error) {
       throw new Error(fnData.error);
    }

    const session = fnData?.session;
    if (!session || !session.user) {
        throw new Error('Falha ao obter sessão do servidor');
    }

    // 2. Set the session explicitly in the client to log the user in
    const { data: authData, error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
    });

    if (sessionError) throw sessionError;
    if (!authData.user) throw new Error('No user returned after setting session');

    // 2. Fetch Profile to get Encrypted Key
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`${SAFE_PROFILE_COLUMNS}, encrypted_master_key, key_salt, public_key, encrypted_private_key`)
      .eq('id', authData.user.id)
      .single();

    const profile = profileData as unknown as DatabaseProfile;

    if (profileError) throw profileError;
    if (!profile) throw new Error('Profile not found');

    // 3. Unwrap Master Key
    if (!profile.encrypted_master_key || !profile.key_salt) {
      // Migration scenario: User exists but has no key? 
      // For now, treat as error or handle legacy migration later.
      throw new Error('Conta antiga detectada. Por favor, entre em contato com o suporte para migração.');
    }

    const kek = cryptoService.deriveKeyFromPassword(password, profile.key_salt);
    const masterKey = cryptoService.unwrapKey(profile.encrypted_master_key, kek);

    // Retro-fit E2E Asymmetric Keys if they don't exist
    if (profile.role === 'psychologist' && !profile.public_key) {
        const keyPair = await cryptoService.generateAsymmetricKeyPair();
        const encryptedPrivateKey = cryptoService.encryptData(keyPair.privateKey, masterKey);
        
        await supabase.from('profiles').update({
            public_key: keyPair.publicKey,
            encrypted_private_key: encryptedPrivateKey
        }).eq('id', authData.user.id);

        localStorage.setItem('mentis_private_key', encryptedPrivateKey);
    } else if (profile.encrypted_private_key) {
        localStorage.setItem('mentis_private_key', profile.encrypted_private_key);
    }

    const user = mapSupabaseUserToUser(authData.user, profile);

    // Security: Clean up sensitive data from user_metadata if present
    await cleanUserMetadata(authData.user);

    // Check if MFA is required
    const aalResult = await getAuthenticatorAssuranceLevel();
    const mfaRequired = aalResult.success &&
      aalResult.nextLevel === 'aal2' &&
      aalResult.currentLevel === 'aal1';

    // Log successful login
    await auditLogger.logAccess(user, 'auth', undefined, 'LOGIN', {
      userAgent: navigator.userAgent,
      method: 'password'
    });

    return {
      success: true,
      user,
      masterKey,
      mfaRequired // New flag to indicate MFA challenge is needed
    };

  } catch (error: unknown) {
    console.error('Login failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Falha no login';

    // Friendly error message for rate limit
    if (errorMessage && errorMessage.includes('Muitas tentativas falhas')) {
      return { success: false, error: errorMessage };
    }

    return { success: false, error: errorMessage };
  }
};

export const register = async (data: RegisterData): Promise<AuthResult> => {
  try {
    // 1. Generate Keys
    const masterKey = cryptoService.generateMasterKey();
    const salt = cryptoService.generateSalt();
    const kek = cryptoService.deriveKeyFromPassword(data.password, salt);
    const encryptedMasterKey = cryptoService.wrapKey(masterKey, kek);

    // 1.5 Generate Asymmetric Keys
    let publicKey = null;
    let encryptedPrivateKey = null;
    if (data.role === 'psychologist') {
        const keyPair = await cryptoService.generateAsymmetricKeyPair();
        publicKey = keyPair.publicKey;
        encryptedPrivateKey = cryptoService.encryptData(keyPair.privateKey, masterKey);
    }

    // 2. Sign Up with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: data.role,
          encrypted_master_key: encryptedMasterKey,
          key_salt: salt,
          // Store initial profile data in metadata to be copied to public.profiles via Trigger (or manually)
          // But effectively, Supabase triggers handles new user insertion into public.profiles usually.
          // IF we are inserting manually, we do it below.
        },
      },
    });

    if (authError) throw authError;

    if (authData.user) {
      // Se o auto-confirm estiver desabilitado (agora desligado/bypassed para MVP), 
      // signup já retorna a sessão ativa e o user. Atualizamos o profile:
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          role: data.role,
          crp: data.role === 'psychologist' ? data.identifier : undefined,
          cpf: data.role === 'staff' ? data.identifier : undefined,
          encrypted_master_key: encryptedMasterKey, // Critical
          key_salt: salt, // Critical
          public_key: publicKey,
          encrypted_private_key: encryptedPrivateKey
        })
        .eq('id', authData.user.id);

      if (encryptedPrivateKey) {
          localStorage.setItem('mentis_private_key', encryptedPrivateKey);
      }

      if (updateError) {
        // Fallback attempt: maybe insert if trigger failed?
        // console.error(updateError);
      }

      // Mapeia o usuário recém criado para o AuthContext prosseguir validando 
      // o login imediatamente
      const user = mapSupabaseUserToUser(authData.user, {
        name: data.name,
        role: data.role,
        crp: data.role === 'psychologist' ? data.identifier : undefined,
        cpf: data.role === 'staff' ? data.identifier : undefined,
      });

      return { success: true, user, masterKey };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Register failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};


// --- Profile & MFA Management ---

export const changePassword = async (email: string, oldPassword: string, newPassword: string, masterKey: string, userId: string) => {
  try {
    // 1. Re-encrypt Master Key with NEW password
    // We reuse the existing salt or generate a new one? Better generate new salt for rotation.
    const newSalt = cryptoService.generateSalt();
    const newKek = cryptoService.deriveKeyFromPassword(newPassword, newSalt);
    const newEncryptedMasterKey = cryptoService.wrapKey(masterKey, newKek);

    // 2. Update Supabase Auth Password
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;

    // 3. Update Profile with new Encrypted Key and Salt
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        encrypted_master_key: newEncryptedMasterKey,
        key_salt: newSalt
      })
      .eq('id', userId);

    if (profileError) {
      console.error('CRITICAL: Password changed but profile update failed. Keys might be out of sync.');
      // Check if we can rollback password? Supabase doesn't support transaction across auth/db easily.
      throw profileError; // Throw so UI knows it failed (though auth might be updated)
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const changeEmail = async (userId: string, newEmail: string) => {
  // Note: userId is not strictly needed for auth.updateUser but keeping signature compatible if needed by component
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const enrollMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp'
  });
  if (error) return { success: false, error: error.message };

  // Map to expected format by SecuritySettings: { factorId, qrCode, secret }
  return {
    success: true,
    factorId: data?.id,
    qrCode: data?.totp?.qr_code,
    secret: data?.totp?.secret,
    uri: data?.totp?.uri
  };
};

export const unenrollMFA = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const listMFAFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { success: false, error: error.message };
  return { success: true, factors: data?.all || [] };
};



// --- User Management & Linking ---

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (error.message?.includes('Refresh Token') || error.name === 'AuthApiError') {
      console.warn('Session expired or invalid refresh token. Cleaning up local session.');
      await supabase.auth.signOut();
    }
    return null;
  }
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(SAFE_PROFILE_COLUMNS as unknown as string)
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return mapSupabaseUserToUser(user, profile as unknown as DatabaseProfile);
};

export const logout = async () => {
  await supabase.auth.signOut();
};

export const getUsers = async (): Promise<User[]> => {
  // This seems to be for searching users to link? Or admin view?
  // Assuming it returns all profiles for now (careful with privacy!)
  // Actually, checking context, it might be for 'linked' users or a staff list.
  // For safety, let's limit colums.
  const { data, error } = await supabase
    .from('profiles')
    .select(SAFE_PROFILE_COLUMNS);

  if (error || !data) return [];

  // We don't have auth user object for all, so we map partially or mock
  return (data as any[]).map((p: any) => mapSupabaseUserToUser({ id: p.id, email: p.email }, p as DatabaseProfile));
};

export const linkUsers = async (userId: string, targetId: string) => {
  // 1. Get current linked_user_ids
  const { data: profile } = await supabase.from('profiles').select('linked_user_ids').eq('id', userId).single();
  const currentLinks = profile?.linked_user_ids || [];

  if (currentLinks.includes(targetId)) return { success: true };

  const newLinks = [...currentLinks, targetId];

  const { error } = await supabase
    .from('profiles')
    .update({ linked_user_ids: newLinks })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const unlinkUsers = async (userId: string, targetId: string) => {
  const { data: profile } = await supabase.from('profiles').select('linked_user_ids').eq('id', userId).single();
  const currentLinks = profile?.linked_user_ids || [];

  const newLinks = currentLinks.filter((id: string) => id !== targetId);

  const { error } = await supabase
    .from('profiles')
    .update({ linked_user_ids: newLinks })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};

// --- Session Management (Banking Level Security) ---

export interface SessionActivity {
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  isCurrent?: boolean;
}

export const listSessions = async (userId: string): Promise<any[]> => {
  // Fetch recent LOGIN actions from audit logs
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('actor_id', userId)
    .eq('action', 'LOGIN')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch session history:', error);
    return [];
  }
  return data || [];
};

export const revokeOtherSessions = async () => {
  // Signs out user from other devices (if supported by Supabase config)
  // or Global SignOut. 
  return await supabase.auth.signOut({ scope: 'others' });
};

export const getCurrentSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};



export const updateProfile = async (userId: string, updates: any) => {
  // Convert top-level camelCase keys to snake_case for Supabase
  const mappedUpdates: any = {};
  
  // Custom Overrides based on Supabase SQL columns
  const overrides: Record<string, string> = {
    photoUrl: 'photo_url',
    councilNumber: 'crp',
    bioDescription: 'bio_description'
  };

  for (const key in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      if (overrides[key]) {
        mappedUpdates[overrides[key]] = updates[key];
      } else {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        mappedUpdates[snakeKey] = updates[key];
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(mappedUpdates)
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
};
