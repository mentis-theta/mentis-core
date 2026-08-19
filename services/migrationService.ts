import { supabase } from './supabaseClient.ts';
import * as cryptoService from './cryptoService.ts';
import { getPatients } from './storageService.ts'; // Legacy getter
import type { Patient } from '../types.ts';

export const migrateLocalStorageToSupabase = async (masterKey: string, userId: string) => {
    try {
        // 1. Read legacy data
        const localPatients = await getPatients();
        if (!localPatients || localPatients.length === 0) return { success: true, count: 0 };

        // Starting migration

        // 2. Prepare batch insert
        const rowsToInsert = localPatients.map((p: Patient) => {
            const encryptedData = cryptoService.encryptData(p, masterKey);
            const blindIndex = cryptoService.generateBlindIndex(p.name, masterKey);

            return {
                id: p.id, // Keep original ID
                user_id: userId,
                encrypted_data: encryptedData,
                blind_index_name: blindIndex
            };
        });

        // 3. Insert into Supabase
        const { error } = await supabase.from('patients').upsert(rowsToInsert);

        if (error) throw error;

        // 4. Clear localStorage (optional, maybe rename key to backup)
        localStorage.removeItem('psychologist-patient-records');
        const encryptedBackup = cryptoService.encryptData(localPatients, masterKey);
        localStorage.setItem('migration_backup_patients', encryptedBackup);

        // Migration successful
        return { success: true, count: localPatients.length };

    } catch (error) {
        console.error("Migration failed:", error);
        return { success: false, error };
    }
};
