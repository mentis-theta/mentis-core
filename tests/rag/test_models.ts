import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const geminiKey = process.env.GEMINI_API_KEY;

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    const names = data.models.map((m: any) => m.name);
    console.log("Available models:");
    console.log(names.join('\n'));
  } else {
    console.log("Error or no models found", data);
  }
}

listModels();
