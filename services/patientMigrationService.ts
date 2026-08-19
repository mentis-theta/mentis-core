import { supabase } from './supabaseClient';
import * as cryptoService from './cryptoService';
import type { Patient } from '../types';
import * as Sentry from '@sentry/react';

/**
 * Checks if the patient blob still contains embedded lists.
 * If so, extracts them, encrypts them individually, inserts into the new tables,
 * and updates the patients table with a stripped blob.
 */
export const migratePatientBlobIfNeeded = async (patient: Patient, masterKey: string, userId: string): Promise<void> => {
    try {
        const hasSessions = patient.sessions && patient.sessions.length > 0;
        const hasGoals = patient.goals && patient.goals.length > 0;
        const hasDocuments = patient.documents && patient.documents.length > 0;
        
        const needsMigration = hasSessions || hasGoals || hasDocuments;

        if (!needsMigration) return;

        console.log(`[E2EE] Migrating blob for patient ${patient.name}...`);

        // 1. Migrate Sessions
        if (hasSessions) {
            const sessionsToInsert = patient.sessions.map(s => ({
                id: s.id,
                patient_id: patient.id,
                user_id: userId,
                encrypted_data: cryptoService.encryptData(s, masterKey)
            }));
            const { error } = await supabase.from('patient_sessions').upsert(sessionsToInsert);
            if (error) throw new Error(`Sessions migration failed: ${error.message}`);
        }

        // 2. Migrate Goals
        if (hasGoals) {
            const goalsToInsert = patient.goals.map(g => ({
                id: g.id,
                patient_id: patient.id,
                user_id: userId,
                encrypted_data: cryptoService.encryptData(g, masterKey)
            }));
            const { error } = await supabase.from('patient_goals').upsert(goalsToInsert);
            if (error) throw new Error(`Goals migration failed: ${error.message}`);
        }

        // 3. Migrate Documents
        if (hasDocuments) {
            const docsToInsert = patient.documents.map(d => ({
                id: d.id,
                patient_id: patient.id,
                user_id: userId,
                encrypted_data: cryptoService.encryptData(d, masterKey)
            }));
            const { error } = await supabase.from('patient_documents').upsert(docsToInsert);
            if (error) throw new Error(`Documents migration failed: ${error.message}`);
        }

        // 4. Wipe Blob from patient object and update database
        const { sessions, goals, documents, ...cleanPatient } = patient;
        
        // Save without the lists
        const strippedPatient = { ...cleanPatient };
        const encryptedData = cryptoService.encryptData(strippedPatient, masterKey);
        
        const { error: updateError } = await supabase.from('patients').update({
            encrypted_data: encryptedData
        }).eq('id', patient.id);

        if (updateError) throw new Error(`Failed to update stripped patient blob: ${updateError.message}`);

        console.log(`[E2EE] Blob migrated successfully for patient ${patient.name}`);
    } catch (e) {
        Sentry.captureException(e, { extra: { context: "Patient Blob Migration Failed", patientId: patient.id } });
        console.error("Migration error:", e);
    }
};
