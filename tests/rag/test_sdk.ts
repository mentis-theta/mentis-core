import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const geminiKey = process.env.GEMINI_API_KEY;

async function test() {
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: "Hello"
    });
    console.log("Success with gemini-3.5-flash");
    return;
  } catch (e) {
    console.log("Failed with gemini-3.5-flash", e.message);
  }
}

test();
