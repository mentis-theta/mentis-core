import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Credenciais do Supabase não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDatabase() {
  console.log('Limpando documentos e vetores antigos (Palheiros e Agulhas)...');
  
  // O "ON DELETE CASCADE" configurado nas migrations garante que ao deletar os docs, os chunks somem.
  const { error } = await supabase
    .from('clinical_knowledge_docs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack simples para deletar todas as linhas

  if (error) {
    console.error('❌ Erro ao limpar o banco:', error.message);
  } else {
    console.log('✅ Banco limpo com sucesso. Tábula rasa pronta para nova ingestão.');
  }
}

wipeDatabase();
