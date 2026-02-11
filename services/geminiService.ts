
import { GoogleGenAI } from "@google/genai";
import { AICommentary } from "../types";

// Always use direct process.env.API_KEY per @google/genai guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_COMMENTARIES: AICommentary[] = [
  { message: "Twój wąż porusza się szybciej niż moje procesory w poniedziałek.", type: "encouragement" },
  { message: "Czy Ty w ogóle mrugasz? Taki wynik wymaga nieludzkiego skupienia.", type: "congratulations" },
  { message: "Widzę, że stosujesz strategię 'na centymetry'. Odważnie.", type: "advice" },
  { message: "Zygzakujesz jakbyś uciekał przed aktualizacją systemu.", type: "sarcasm" },
  { message: "Twoja koordynacja oko-ręka jest... akceptowalna przez algorytm.", type: "encouragement" },
  { message: "Zjedzenie tej energii było statystycznie mało prawdopodobne. Brawo.", type: "congratulations" },
  { message: "Uwaga: Wykryto nadmierną zręczność. Czy jesteś botem?", type: "sarcasm" },
  { message: "Skręć w lewo. Albo w prawo. Byle nie w siebie.", type: "advice" }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAICommentary = async (score: number, status: string, retries = 2, delay = 1000): Promise<AICommentary> => {
  try {
    const prompt = `Jesteś dowcipnym i lekko sarkastycznym komentatorem AI w retro grze Snake. 
    Obecny wynik to ${score}, a status gry to ${status}. 
    Podaj krótki, celny, jednozdaniowy komentarz na temat wyników gracza. 
    Bądź kreatywny i używaj terminologii gamingowej.
    TWOJA ODPOWIEDŹ MUSI BYĆ W JĘZYKU POLSKIM.
    Formatuj odpowiedź jako obiekt JSON z dwoma polami: 'message' (string) i 'type' (jedno z: 'encouragement', 'sarcasm', 'advice', 'congratulations').`;

    // Fixed: Always use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    // Fixed: Directly access .text property from GenerateContentResponse
    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text) as AICommentary;

  } catch (error: any) {
    console.warn(`Gemini API Error (Próba: ${3 - retries}):`, error);

    // Jeśli błąd to 429 (Resource Exhausted) i mamy jeszcze próby, ponawiamy z opóźnieniem
    if (error?.message?.includes("429") || error?.status === 429) {
      if (retries > 0) {
        await sleep(delay);
        return getAICommentary(score, status, retries - 1, delay * 2);
      }
    }

    // Jeśli skończyły się próby lub to inny błąd, zwróć losowy komentarz lokalny
    const randomIndex = Math.floor(Math.random() * FALLBACK_COMMENTARIES.length);
    const fallback = FALLBACK_COMMENTARIES[randomIndex];
    
    return {
      ...fallback,
      message: status === "GAME_OVER" 
        ? `Koniec sesji. Wynik: ${score}. Moje obwody płaczą (binarnie).` 
        : fallback.message
    };
  }
};
