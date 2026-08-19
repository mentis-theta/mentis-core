import pg from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Conectado ao banco.");

  try {
    await client.query(`DELETE FROM public.clinical_knowledge_base`);
    console.log("Banco limpo para receber os novos embeddings Nomic.");
    
    // Recarrega o cache do Supabase PostgREST
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log("Schema reload notificado.");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.end();
  }
}

run();
