import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
  const { data: chunks, error } = await supabase
    .from('clinical_knowledge_chunks')
    .select('id, category, content, metadata')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error("DB Error:", error);
    process.exit(1);
  }

  const analysis = chunks.map(c => {
    return {
      id: c.id,
      category: c.category,
      contentLength: c.content?.length || 0,
      contentPreview: c.content?.substring(0, 150).replace(/\n/g, '\\n'),
      metadata: c.metadata,
      issues: c.content?.length < 50 ? 'Too short' : (c.content?.length > 2000 ? 'Too long' : 'OK')
    };
  });

  fs.writeFileSync('chunk_analysis.json', JSON.stringify(analysis, null, 2));
  console.log("Analysis saved to chunk_analysis.json. Found", chunks.length, "chunks.");
}

analyze();
