
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LandmarkInfo, DetailedHistory } from "./types";

// Initialize the API client
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Stage 1: Identify the landmark using Gemini 3 Pro Preview (Vision)
 */
export async function identifyLandmark(base64Image: string): Promise<LandmarkInfo> {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "Identify the landmark in this photo. Provide a JSON response with the landmark name, a short description, and exactly 3 points of interest (POI) with their estimated X and Y coordinates (as percentages 0-100) relative to the image frame where they likely appear. Coordinates should be normalized." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          pointsOfInterest: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER }
              },
              required: ["label", "description", "x", "y"]
            }
          }
        },
        required: ["name", "shortDescription", "pointsOfInterest"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    throw new Error("Failed to parse landmark identification data.");
  }
}

/**
 * Stage 2: Research history using Gemini 3 Flash Preview (Search Grounding)
 */
export async function researchLandmark(landmarkName: string): Promise<DetailedHistory> {
  const ai = getAi();
  const prompt = `Research the historical significance and interesting facts about ${landmarkName}. Provide a detailed and engaging historical narrative. Focus on why it is important today.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    }));

  return {
    fullStory: response.text || "No information found.",
    sources: sources
  };
}

/**
 * Stage 3: Narrate the history using Gemini 2.5 Flash Preview TTS
 */
export async function narrateHistory(text: string): Promise<string> {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Speak in a warm, professional tour guide voice: ${text.substring(0, 1000)}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data generated.");
  
  return base64Audio;
}
