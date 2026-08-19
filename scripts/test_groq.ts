import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY });

async function test() {
  try {
    const res = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test json please' }],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    console.log("Success!", res.choices[0].message);
  } catch (e: any) {
    console.error("Erro Groq:", e.status, e.message);
  }
}

test();
