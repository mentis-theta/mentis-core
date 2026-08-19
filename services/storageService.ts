
import type { Patient } from '../types.ts';
import CryptoJS from 'crypto-js';
import localforage from 'localforage';

const STORAGE_KEY = 'psychologist-patient-records';

// Chave de encriptação interna.
const SECRET_KEY = "mentis-vault-v1-secure-key";

/**
 * Validates and migrates raw patient data to the current Patient schema.
 * Throws an error if the data is fundamentally invalid.
 * @param data - The raw data, typically from JSON.parse().
 * @returns A validated and migrated array of patients.
 */
export const migrateAndValidatePatientsData = (data: any): Patient[] => {
    if (!Array.isArray(data)) {
        throw new Error("O arquivo de importação é inválido. O conteúdo deve ser uma lista (array) de pacientes.");
    }

    // This is the migration logic that ensures old patient records don't crash the app.
    return data.map((patient: any, index: number): Patient => {
        // Basic check to ensure we're dealing with an object-like structure.
        if (typeof patient !== 'object' || patient === null) {
            throw new Error(`Entrada inválida encontrada no registro do paciente #${index + 1}. Esperava um objeto.`);
        }

        return {
            ...patient,
            // Ensure new required fields have default values for old records
            paymentType: patient.paymentType || 'particular',
            // Default agreedPrice to 150 if not set (migration)
            agreedPrice: patient.agreedPrice !== undefined ? patient.agreedPrice : 150,
            goals: (patient.goals || []).map((goal: any) => ({
                ...goal,
                interventions: (goal.interventions || []).map((intervention: any) => ({
                    ...intervention,
                    feedback: intervention.feedback === undefined ? null : intervention.feedback,
                })),
                patientTasks: goal.patientTasks || [],
            })),
            insights: patient.insights || [], // Add default insights array
            // Ensure optional fields exist
            healthPlan: patient.healthPlan || undefined,
            documents: patient.documents || [],
            // Anamnesis migration: if it doesn't exist, create it (empty)
            // If legacy medicalHistory exists, use it to populate medicalPsychiatricHistory
            anamnesis: patient.anamnesis || (patient.medicalHistory ? {
                mainComplaint: '',
                historyOfPresentIllness: '',
                personalHistory: '',
                familyHistory: '',
                medicalPsychiatricHistory: patient.medicalHistory,
                lifestyle: '',
                observation: '',
                lastUpdated: new Date().toISOString()
            } : undefined),
            sessions: (patient.sessions || []).map((session: any) => ({
                ...session,
                paymentStatus: session.paymentStatus === 'paid' ? 'paid' : 'pending',
                price: session.price ?? 150, // Default price for old sessions
                goalIds: session.goalIds || [], // Add default goalIds array
                tags: session.tags || [], // Add default tags array
                // Default status to 'completed' if not present (legacy migration)
                status: session.status || 'completed'
            })),
        };
    });
};


export const getPatients = async (): Promise<Patient[] | undefined> => {
    try {
        const rawData = await localforage.getItem<string>(STORAGE_KEY);
        // Retornar undefined (em vez de []) para que a UI saiba que carregou vazio vs não tem pacientes
        if (!rawData) return undefined;

        let parsedData: any;

        // TENTATIVA 1: Ler como dado encriptado
        try {
            const bytes = CryptoJS.AES.decrypt(rawData, SECRET_KEY);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

            if (decryptedString) {
                parsedData = JSON.parse(decryptedString);
            } else {
                // Se a string estiver vazia, a decriptação falhou (chave inválida ou dado corrompido)
                throw new Error("FatalDecryptionError: Falha na decriptação (Chave inválida ou Payload corrompido)");
            }
        } catch (e: unknown) {
            // TENTATIVA 2: Fallback para ler como JSON puro (dados legados não criptografados)
            try {
                parsedData = JSON.parse(rawData);
            } catch (jsonError) {
                // Se não é JSON puro e a decriptação falhou, é um ERRO FATAL (Patologia 5)
                console.error("Dados corrompidos ou ilegíveis no IndexedDB.");
                throw new Error("FatalDecryptionError: " + (e instanceof Error ? e.message : String(e)));
            }
        }

        return migrateAndValidatePatientsData(parsedData);

    } catch (error) {
        console.error("Failed to load or migrate patients from localforage", error);
        // O throw propaga para o ErrorBoundary para travar o sistema e não sobrescrever a base com array vazia
        throw error;
    }
};

export const savePatients = async (patients: Patient[]): Promise<void> => {
    try {
        const jsonString = JSON.stringify(patients);

        // Encripta os dados antes de salvar no IndexedDB
        const encryptedData = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();

        await localforage.setItem(STORAGE_KEY, encryptedData);
    } catch (error) {
        console.error("Failed to save patients to localforage", error);
        throw error;
    }
};
