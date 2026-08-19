import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decryptData } from '../../../services/cryptoService';
import * as readline from 'readline';

// Carrega variáveis de ambiente
dotenv.config();
dotenv.config({ path: '.env.local' }); // Carrega .env.local se existir

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
    const email = process.env.USER_EMAIL || await question("Digite seu email do Supabase: ");
    const password = process.env.USER_PASSWORD || await question("Digite sua senha do Supabase: ");
    const masterKey = process.env.MASTER_KEY || await question("Digite sua Master Key (Chave de Criptografia): ");

    rl.close();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !authData.user) {
        process.exit(1);
    }

    const userId = authData.user.id;

    const { data: encryptedPatients, error: fetchError } = await supabase
        .from('patients')
        .select('id, encrypted_data')
        .eq('user_id', userId);

    if (fetchError) {
        process.exit(1);
    }

    const patients = [];
    for (const row of encryptedPatients || []) {
        try {
            if (row.encrypted_data) {
                const decrypted = decryptData<any>(row.encrypted_data, masterKey);
                patients.push({ id: row.id, ...decrypted });
            }
        } catch (err: unknown) {
            // Silencioso
        }
    }

    const invoicesToInsert = [];

    for (const patient of patients) {
        if (!patient.sessions || patient.sessions.length === 0) continue;

        for (const session of patient.sessions) {
            if (session.status === 'completed') {
                const sessionDate = new Date(session.date);
                const year = sessionDate.getFullYear();
                const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
                const billingPeriod = `${year}-${month}`;

                invoicesToInsert.push({
                    user_id: userId,
                    patient_id: patient.id,
                    amount: Number(session.price || 0),
                    due_date: session.date.split('T')[0],
                    status: session.paymentStatus === 'paid' ? 'paid' : 'pending',
                    billing_period: billingPeriod,
                    type: 'session',
                    metadata: { sessionIds: [session.id] },
                });
            }
        }
    }

    if (invoicesToInsert.length === 0) {
        process.exit(0);
    }

    const BATCH_SIZE = 100;

    try {
        for (let i = 0; i < invoicesToInsert.length; i += BATCH_SIZE) {
            const batch = invoicesToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('invoices').insert(batch);

            if (error) {
                throw error;
            }
        }

        const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .not('session_id', 'is', null)
            .eq('user_id', userId);

        if (deleteError) {
            // Silencioso
        }

    } catch (error) {
        process.exit(1);
    }
}

// Ponto de Ignição: Chama a função principal
main().catch(() => {});
