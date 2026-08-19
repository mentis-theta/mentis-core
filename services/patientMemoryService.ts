import { supabase } from '@/services/supabaseClient';
import type { PatientMemoryFact } from '@/types';

export const patientMemoryService = {
  async fetchPatientMemory(patientId: string): Promise<PatientMemoryFact[]> {
    const { data, error } = await supabase
      .from('patient_ai_memory')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient memory:', error);
      throw error;
    }

    return data as PatientMemoryFact[];
  },

  async upsertClinicalFacts(facts: Partial<PatientMemoryFact>[]): Promise<void> {
    if (!facts || facts.length === 0) return;

    // We assume facts are properly formed.
    // Ensure created_at is present if missing for new records, though DB sets default.
    const validFacts = facts.map(f => ({
      ...f,
      created_at: f.created_at || new Date().toISOString()
    }));

    const { error } = await supabase
      .from('patient_ai_memory')
      .upsert(validFacts, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting patient memory:', error);
      throw error;
    }
  },

  async deleteFact(factId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_ai_memory')
      .delete()
      .eq('id', factId);
      
    if (error) {
      console.error('Error deleting patient memory fact:', error);
      throw error;
    }
  }
};
