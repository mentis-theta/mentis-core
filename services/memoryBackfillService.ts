import { supabase } from '@/services/supabaseClient';
import { patientMemoryService } from '@/services/patientMemoryService';
import * as Sentry from '@sentry/react';
import { extractFactsFromAnamnesis, extractClinicalFacts } from '@/services/aiDocumentService';
import { getPlainTextFromSession } from '@/components/Session/RichTextRenderer';
import type { Patient, Anamnesis, PatientMemoryFact, Session } from '@/types';

interface BackfillResult {
    sessionsIngested: number;
    rpdsIngested: number;
    inventoriesIngested: number;
    anamnesisIngested: number;
    errors: string[];
}

const EMOTION_MAP: Record<string, string> = {
    'sadness': 'Tristeza',
    'anxiety': 'Ansiedade',
    'anger': 'Raiva',
    'joy': 'Alegria',
    'neutral': 'Neutro'
};

/**
 * Backfill: Varre os dados históricos de um paciente e injeta na memória da IA.
 * Usa merge inteligente: a IA compara novos dados com os existentes e extrai apenas o que é diferente.
 */
export async function backfillPatientMemory(patient: Patient): Promise<BackfillResult> {
    const result: BackfillResult = {
        sessionsIngested: 0,
        rpdsIngested: 0,
        inventoriesIngested: 0,
        anamnesisIngested: 0,
        errors: []
    };

    // 1. Carregar memória existente para merge inteligente
    let existingFacts: PatientMemoryFact[] = [];
    try {
        existingFacts = await patientMemoryService.fetchPatientMemory(patient.id);
    } catch {
        // Se falhar, continuamos sem comparação
    }

    // ==============================
    // TRILHA 1: Sessões Históricas
    // ==============================
    try {
        const sessions = patient.sessions || [];
        const completedSessions = sessions.filter(s => s.status === 'completed' && s.notes);

        if (completedSessions.length > 0) {
            // Processa em lotes de 5 sessões para não estourar o contexto da IA
            const BATCH_SIZE = 5;
            let totalSessionFacts = 0;

            for (let i = 0; i < completedSessions.length; i += BATCH_SIZE) {
                const batch = completedSessions.slice(i, i + BATCH_SIZE);

                try {
                    // Recarrega a memória após cada lote para o merge ser acumulativo
                    const currentMemory = i === 0
                        ? existingFacts
                        : await patientMemoryService.fetchPatientMemory(patient.id);

                    const result = await extractClinicalFacts(patient.id, batch);
                    const facts = result.facts;

                    if (facts && facts.length > 0) {
                        const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                        const factsToSave = facts.map(fact => ({
                            id: isValidUUID(fact.id) ? fact.id : crypto.randomUUID(),
                            patient_id: patient.id,
                            text: fact.text,
                            type: fact.type,
                            source_refs: fact.source_refs || [],
                            source_type: 'session' as const,
                            status: 'approved' as const
                        }));

                        await patientMemoryService.upsertClinicalFacts(factsToSave);
                        totalSessionFacts += factsToSave.length;
                    }
                } catch (batchError) {
                    Sentry.captureException(batchError);
                    result.errors.push(`Sessões Batch ${i}: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
                }
            }

            result.sessionsIngested = totalSessionFacts;

            // Recarregar a memória após processar sessões para que as próximas trilhas comparem corretamente
            existingFacts = await patientMemoryService.fetchPatientMemory(patient.id);
        }
    } catch (e) {
        Sentry.captureException(e);
        result.errors.push(`Erro geral Sessões: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Criar Set para dedup mecânica (RPDs e Inventários)
    const existingTexts = new Set(existingFacts.map(f => f.text));

    // =====================
    // TRILHA 2: RPDs Antigos
    // =====================
    try {
        const { data: rpds, error } = await supabase
            .from('clinical_records')
            .select('*')
            .eq('patient_id', patient.id)
            .eq('type', 'clinical_tool')
            .contains('metadata', { toolType: 'rpd' })
            .order('date', { ascending: true });

        if (error) throw error;

        if (rpds && rpds.length > 0) {
            const factsToInsert: Partial<PatientMemoryFact>[] = [];

            for (const rpd of rpds) {
                const emotion = rpd.metadata?.emotion || '';
                const intensity = rpd.metadata?.intensity || 0;
                const situation = rpd.content?.situation || '';
                const thought = rpd.content?.thought || '';

                if (!situation && !thought) continue;

                const emotionLabel = EMOTION_MAP[emotion] || emotion || 'Não especificada';
                const text = `Paciente relatou sentimento de ${emotionLabel} (Intensidade: ${intensity}%) na seguinte situação: "${situation}". Pensamento automático associado: "${thought}".`;

                if (existingTexts.has(text)) continue;

                factsToInsert.push({
                    id: crypto.randomUUID(),
                    patient_id: patient.id,
                    text,
                    type: 'Observation',
                    source_refs: [],
                    source_type: 'other',
                    status: 'approved'
                });
                existingTexts.add(text);
            }

            if (factsToInsert.length > 0) {
                await patientMemoryService.upsertClinicalFacts(factsToInsert);
                result.rpdsIngested = factsToInsert.length;
            }
        }
    } catch (e) {
        Sentry.captureException(e);
        result.errors.push(`Erro RPD: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============================
    // TRILHA 3: Inventários Antigos
    // ============================
    try {
        const { data: inventories, error } = await supabase
            .from('clinical_records')
            .select('*')
            .eq('patient_id', patient.id)
            .eq('type', 'clinical_tool')
            .contains('metadata', { toolType: 'inventory' })
            .order('date', { ascending: true });

        if (error) throw error;

        if (inventories && inventories.length > 0) {
            const factsToInsert: Partial<PatientMemoryFact>[] = [];

            for (const inv of inventories) {
                const scaleName = inv.metadata?.scaleName || 'Escala Desconhecida';
                const score = inv.metadata?.score ?? 'N/A';
                const severity = inv.metadata?.severity || '';
                const notes = inv.content?.notes || '';

                const severityText = severity ? ` (Severidade: ${severity})` : '';
                const notesText = notes ? ` Observações: ${notes}` : '';
                const text = `Avaliação Psicométrica: ${scaleName}. Escore: ${score}${severityText}.${notesText}`;

                if (existingTexts.has(text)) continue;

                factsToInsert.push({
                    id: crypto.randomUUID(),
                    patient_id: patient.id,
                    text,
                    type: 'Psychometrics',
                    source_refs: [],
                    source_type: 'psychometrics',
                    status: 'approved'
                });
                existingTexts.add(text);
            }

            if (factsToInsert.length > 0) {
                await patientMemoryService.upsertClinicalFacts(factsToInsert);
                result.inventoriesIngested = factsToInsert.length;
            }
        }
    } catch (e) {
        Sentry.captureException(e);
        result.errors.push(`Erro Inventários: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ==========================
    // TRILHA 4: Anamnese Existente
    // ==========================
    try {
        const anamnesis: Anamnesis | undefined = patient.anamnesis;

        if (anamnesis && anamnesis.mainComplaint) {
            // Recarrega a memória mais atualizada para a IA fazer merge com tudo que já foi inserido acima
            const latestMemory = await patientMemoryService.fetchPatientMemory(patient.id);

            const facts = await extractFactsFromAnamnesis(patient.id, anamnesis);

            if (facts && facts.length > 0) {
                const latestTexts = new Set(latestMemory.map(f => f.text));
                const factsToInsert = facts.filter(f => !latestTexts.has(String(f.value)));

                if (factsToInsert.length > 0) {
                    const factsToSave = factsToInsert.map(fact => ({
                        id: crypto.randomUUID(),
                        patient_id: patient.id,
                        text: String(fact.value),
                        type: 'Anamnesis',
                        source_refs: [],
                        source_type: 'anamnesis' as const,
                        status: 'approved' as const
                    }));

                    await patientMemoryService.upsertClinicalFacts(factsToSave);
                    result.anamnesisIngested = factsToSave.length;
                }
            }
        }
    } catch (e) {
        Sentry.captureException(e);
        result.errors.push(`Erro Anamnese: ${e instanceof Error ? e.message : String(e)}`);
    }

    return result;
}
