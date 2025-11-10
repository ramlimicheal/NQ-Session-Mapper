

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, WeeklyForecast, HistoricalPatterns } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const chartAnalysisPrompt = `You are an expert futures trading analyst. Analyze this NQ (NASDAQ) 1-hour chart.

I can see colored session boxes on the chart:
- BLUE boxes = London session
- ORANGE boxes = New York session  
- PINK boxes = Tokyo/Asia session

For EACH VISIBLE DAY in this chart, extract the following information:

1. Each session's HIGH and LOW price (exact numbers from chart)
2. Whether price REACTED to previous session levels
3. Type of reaction: bounce, rejection, breakdown, or breakout
4. Size of move after reaction (in points)

RESPOND ONLY WITH VALID JSON IN THIS EXACT FORMAT:

{
  "days": [
    {
      "date": "2025-11-XX",
      "dayOfWeek": "Monday",
      "sessions": [
        {
          "name": "Asia",
          "high": 25200,
          "low": 25100
        },
        {
          "name": "London",
          "high": 25350,
          "low": 25180
        },
        {
          "name": "NewYork",
          "high": 25400,
          "low": 25250
        }
      ],
      "reactions": [
        {
          "testedLevel": 25100,
          "levelName": "Asia Low",
          "reacted": true,
          "reactionType": "bounce",
          "move": 250,
          "outcome": "LONG"
        }
      ]
    }
  ],
  "weekHigh": 25400,
  "weekLow": 25100,
  "volatility": "NORMAL"
}

CRITICAL: Respond ONLY with the JSON. No explanations, no markdown, no code blocks.`;

// FIX: Added response schema for type safety and to ensure model returns valid JSON.
const analysisResultSchema = {
    type: Type.OBJECT,
    properties: {
        days: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    dayOfWeek: { type: Type.STRING },
                    sessions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                high: { type: Type.NUMBER },
                                low: { type: Type.NUMBER },
                            },
                            required: ['name', 'high', 'low'],
                        }
                    },
                    reactions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                testedLevel: { type: Type.NUMBER },
                                levelName: { type: Type.STRING },
                                reacted: { type: Type.BOOLEAN },
                                reactionType: { type: Type.STRING },
                                move: { type: Type.NUMBER },
                                outcome: { type: Type.STRING },
                            },
                            required: ['testedLevel', 'levelName', 'reacted', 'reactionType', 'move', 'outcome'],
                        }
                    },
                },
                required: ['date', 'dayOfWeek', 'sessions', 'reactions'],
            }
        },
        weekHigh: { type: Type.NUMBER },
        weekLow: { type: Type.NUMBER },
        volatility: { type: Type.STRING },
    },
    required: ['days', 'weekHigh', 'weekLow', 'volatility'],
};

export const analyzeChartWithGemini = async (imageData: string): Promise<AnalysisResult> => {
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
        throw new Error("Invalid image data provided.");
    }

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
        },
    };

    const textPart = { text: chartAnalysisPrompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            // FIX: Use responseSchema to enforce JSON output structure.
            responseSchema: analysisResultSchema,
        }
    });

    // FIX: Added robust JSON parsing with error handling.
    const responseText = response.text.trim();
    try {
        const cleanJson = responseText.replace(/^```json/, '').replace(/```$/, '');
        return JSON.parse(cleanJson) as AnalysisResult;
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", responseText, e);
        throw new Error("The AI returned an invalid analysis format.");
    }
};

// FIX: Added response schema for type safety and to ensure model returns valid JSON.
const weeklyForecastSchema = {
    type: Type.OBJECT,
    properties: {
        dailyPredictions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    date: { type: Type.STRING },
                    topSetups: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                session: { type: Type.STRING },
                                level: { type: Type.STRING },
                                probability: { type: Type.NUMBER },
                                expectedMove: { type: Type.NUMBER },
                                direction: { type: Type.STRING },
                                reasoning: { type: Type.STRING },
                            },
                            required: ['session', 'level', 'probability', 'expectedMove', 'direction', 'reasoning'],
                        }
                    },
                },
                required: ['day', 'date', 'topSetups'],
            }
        },
        weeklyRecommendation: { type: Type.STRING },
        topTrades: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    setup: { type: Type.STRING },
                    probability: { type: Type.NUMBER },
                    expectedMove: { type: Type.NUMBER },
                },
                required: ['day', 'setup', 'probability', 'expectedMove'],
            }
        },
    },
    required: ['dailyPredictions', 'weeklyRecommendation', 'topTrades'],
};

export const generateAIForecast = async (patterns: HistoricalPatterns): Promise<WeeklyForecast> => {
    const forecastPrompt = `You are a quantitative trading strategist. Based on the following historical trading data, generate predictions for next week's trading.

HISTORICAL DATA:
- Total days analyzed: ${patterns.totalDays}
- Best performing day: ${patterns.bestDay}
- Best performing session: ${patterns.bestSession}
- Session success rates by day: ${JSON.stringify(patterns.byDay)}

Generate predictions for Monday through Friday of next week. For each day, predict:
1. Highest probability setups (which session levels are most likely to react)
2. Expected move size
3. Trading recommendation

Respond ONLY with valid JSON IN THIS EXACT FORMAT:

{
  "dailyPredictions": [
    {
      "day": "Monday",
      "date": "2025-11-11",
      "topSetups": [
        {
          "session": "London",
          "level": "Low",
          "probability": 82,
          "expectedMove": 350,
          "direction": "LONG",
          "reasoning": "London lows show 82% success rate on Mondays"
        }
      ]
    }
  ],
  "weeklyRecommendation": "Focus on London session lows, especially Monday and Wednesday",
  "topTrades": [
    {
      "day": "Monday",
      "setup": "London Low Bounce",
      "probability": 82,
      "expectedMove": 350
    }
  ]
}

CRITICAL: Respond ONLY with JSON. No markdown, no explanations.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: forecastPrompt,
        config: {
            responseMimeType: "application/json",
            // FIX: Use responseSchema to enforce JSON output structure.
            responseSchema: weeklyForecastSchema,
        },
    });

    // FIX: Added robust JSON parsing with error handling.
    const responseText = response.text.trim();
    try {
        const cleanJson = responseText.replace(/^```json/, '').replace(/```$/, '');
        const forecast = JSON.parse(cleanJson) as WeeklyForecast;
        forecast.generatedAt = new Date().toISOString();
        forecast.historicalDays = patterns.totalDays;
        return forecast;
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", responseText, e);
        throw new Error("The AI returned an invalid forecast format.");
    }
}
