
import { GoogleGenAI } from "@google/genai";

export const getCityComparisonInsights = async (city1: string, city2: string) => {
  try {
    // Create a new instance right before the call to use the latest injected key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Compare the geographic sizes and urban structures of ${city1} and ${city2}. 
      Provide a very brief summary (2 sentences) and 3 bullet points of interesting facts about their footprints or layout. 
      Format as JSON with keys: "summary" and "funFacts" (array).`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "Comparison unavailable at the moment.",
      funFacts: ["Error fetching city insights."]
    };
  }
};
