

import { GoogleGenAI, Type } from "@google/genai";
import {
    AnalysisResult, WeeklyForecast, HistoricalPatterns,
    DayStrategyAnalysis, StrategyForecastResult, StrategyPerformance,
    PredictedTradeSetup, NextDayPrediction, StrategyType, DailyData
} from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const advancedChartAnalysisPrompt = `You are a world-class institutional trading analyst specializing in NQ (NASDAQ) futures. Analyze this 1-hour chart using MULTIPLE PROFESSIONAL TRADING STRATEGIES.

CHART SESSION BOXES:
- BLUE boxes = London session
- ORANGE boxes = New York session
- PINK boxes = Asia session

ANALYZE USING THESE 5 WORLD-CLASS STRATEGIES:

1. ICT (Inner Circle Trader):
   - Order Blocks: Last down-candle before bullish move (bullish OB) or last up-candle before bearish move (bearish OB)
   - Fair Value Gaps (FVG): 3-candle pattern with gap between candle 1 high and candle 3 low
   - Liquidity Sweeps: Price taking out previous highs/lows then reversing

2. Smart Money Concepts (SMC):
   - Break of Structure (BOS): Price breaking previous high/low in trend direction
   - Change of Character (ChoCH): Failed break indicating trend change
   - Market Structure Shifts: Higher highs/lows or lower highs/lows

3. Session-Based Trading:
   - Session High/Low bounces and rejections
   - Previous day's session levels as support/resistance

4. Supply & Demand Zones:
   - Fresh zones: Strong move away from consolidation (not tested yet)
   - Tested zones: Previous support/demand or resistance/supply zones
   - Zone strength: Number of touches and price reaction strength

5. Market Profile:
   - Value Area High/Low (where 70% of volume occurred)
   - Point of Control (highest volume node)

FOR EACH VISIBLE DAY, EXTRACT:

1. Session highs/lows (exact prices)
2. Order blocks identified (price, type, strength)
3. Fair value gaps (top/bottom prices)
4. Structure breaks (BOS/ChoCH with price levels)
5. Supply/demand zones (price ranges, strength)
6. Session level reactions
7. Which strategies align (confluence)

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
      ],
      "strategySignals": [
        {
          "strategy": "ICT",
          "entryPrice": 25100,
          "confidence": 85,
          "direction": "LONG",
          "orderBlocks": [
            {
              "price": 25090,
              "type": "bullish",
              "strength": "strong",
              "tested": false
            }
          ],
          "fairValueGaps": [
            {
              "topPrice": 25150,
              "bottomPrice": 25100,
              "type": "bullish",
              "filled": false
            }
          ]
        },
        {
          "strategy": "SESSION",
          "entryPrice": 25100,
          "confidence": 82,
          "direction": "LONG",
          "sessionLevels": [
            {
              "level": "Asia Low",
              "price": 25100
            }
          ]
        },
        {
          "strategy": "SUPPLY_DEMAND",
          "entryPrice": 25095,
          "confidence": 78,
          "direction": "LONG",
          "supplyDemandZones": [
            {
              "topPrice": 25110,
              "bottomPrice": 25090,
              "type": "demand",
              "strength": "fresh",
              "touches": 0
            }
          ]
        }
      ],
      "confluenceScore": 3
    }
  ],
  "weekHigh": 25400,
  "weekLow": 25100,
  "volatility": "NORMAL"
}

CRITICAL: Respond ONLY with the JSON. No explanations, no markdown, no code blocks.`;

// Keep legacy prompt for backward compatibility
const chartAnalysisPrompt = advancedChartAnalysisPrompt;

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

// ============================================
// STRATEGY-BASED FORECAST WITH MULTI-STRATEGY ANALYSIS
// ============================================

const ACCOUNT_SIZE = 50000;
const RISK_PERCENTAGE = 2; // 2% risk per trade
const MAX_STOP_LOSS_DOLLARS = 150; // $150 max stop loss
const MAX_STOP_LOSS_POINTS = 75; // 75 points on MNQ ($2/point)
const PNL_MULTIPLIER = 2; // $2 per point for MNQ

/**
 * Calculate hybrid stop loss: Use smallest of technical stop OR max fixed stop
 */
const calculateHybridStopLoss = (entryPrice: number, direction: 'LONG' | 'SHORT', technicalStopPrice: number): { stopLoss: number; stopLossPoints: number } => {
    const technicalStopPoints = Math.abs(entryPrice - technicalStopPrice);
    const stopLossPoints = Math.min(technicalStopPoints, MAX_STOP_LOSS_POINTS);
    const stopLoss = direction === 'LONG' ? entryPrice - stopLossPoints : entryPrice + stopLossPoints;

    return { stopLoss, stopLossPoints };
};

/**
 * Calculate position size based on risk parameters
 */
const calculatePositionSize = (stopLossPoints: number): { positionSize: number; riskAmount: number } => {
    const maxRiskDollars = ACCOUNT_SIZE * (RISK_PERCENTAGE / 100); // $1000 for $50k at 2%
    const riskPerContract = stopLossPoints * PNL_MULTIPLIER;
    const positionSize = Math.floor(maxRiskDollars / riskPerContract);
    const actualRiskAmount = positionSize * riskPerContract;

    return {
        positionSize: Math.max(1, positionSize), // At least 1 contract
        riskAmount: actualRiskAmount
    };
};

const strategyForecastSchema = {
    type: Type.OBJECT,
    properties: {
        weeklyPredictions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    dayOfWeek: { type: Type.STRING },
                    setupName: { type: Type.STRING },
                    strategies: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    confluenceScore: { type: Type.NUMBER },
                    entryPrice: { type: Type.NUMBER },
                    technicalStopLoss: { type: Type.NUMBER },
                    takeProfit: { type: Type.NUMBER },
                    direction: { type: Type.STRING },
                    probability: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                    technicalDetails: { type: Type.STRING },
                },
                required: ['date', 'dayOfWeek', 'setupName', 'strategies', 'confluenceScore', 'entryPrice', 'technicalStopLoss', 'takeProfit', 'direction', 'probability', 'reasoning', 'technicalDetails']
            }
        },
        nextDayPrediction: {
            type: Type.OBJECT,
            properties: {
                date: { type: Type.STRING },
                dayOfWeek: { type: Type.STRING },
                marketBias: { type: Type.STRING },
                keyLevels: {
                    type: Type.OBJECT,
                    properties: {
                        resistance: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                        support: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    },
                    required: ['resistance', 'support']
                },
                recommendation: { type: Type.STRING },
                topSetups: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            setupName: { type: Type.STRING },
                            strategies: { type: Type.ARRAY, items: { type: Type.STRING } },
                            confluenceScore: { type: Type.NUMBER },
                            entryPrice: { type: Type.NUMBER },
                            technicalStopLoss: { type: Type.NUMBER },
                            takeProfit: { type: Type.NUMBER },
                            direction: { type: Type.STRING },
                            probability: { type: Type.NUMBER },
                            reasoning: { type: Type.STRING },
                            technicalDetails: { type: Type.STRING },
                        },
                        required: ['setupName', 'strategies', 'confluenceScore', 'entryPrice', 'technicalStopLoss', 'takeProfit', 'direction', 'probability', 'reasoning', 'technicalDetails']
                    }
                }
            },
            required: ['date', 'dayOfWeek', 'marketBias', 'keyLevels', 'recommendation', 'topSetups']
        }
    },
    required: ['weeklyPredictions', 'nextDayPrediction']
};

export const generateStrategyBasedForecast = async (
    historicalData: DailyData[],
    patterns: HistoricalPatterns
): Promise<StrategyForecastResult> => {

    // Get next Monday's date for weekly predictions
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));

    // Get tomorrow's date for next-day prediction
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const forecastPrompt = `You are a world-class quantitative trading strategist. Analyze historical NQ futures data using MULTIPLE PROFESSIONAL TRADING STRATEGIES to generate HIGH-PROBABILITY trade setups.

STRATEGIES TO ANALYZE:
1. ICT (Inner Circle Trader) - Order Blocks, Fair Value Gaps, Liquidity Sweeps
2. SMC (Smart Money Concepts) - Break of Structure, Change of Character, Market Structure
3. SESSION Trading - Asia/London/NY session high/low bounces
4. SUPPLY & DEMAND - Fresh zones, tested zones, flip zones
5. MARKET PROFILE - Value Area, Point of Control, Volume imbalances

HISTORICAL DATA SUMMARY:
- Total days analyzed: ${patterns.totalDays}
- Best performing day: ${patterns.bestDay}
- Best performing session: ${patterns.bestSession}
- Day-by-day success rates: ${JSON.stringify(patterns.byDay)}

RECENT PRICE ACTION:
${historicalData.slice(-5).map(day => `${day.dayOfWeek} ${day.date}: Asia ${day.sessions.find(s => s.name === 'Asia')?.high}-${day.sessions.find(s => s.name === 'Asia')?.low}, London ${day.sessions.find(s => s.name === 'London')?.high}-${day.sessions.find(s => s.name === 'London')?.low}, NY ${day.sessions.find(s => s.name === 'NewYork')?.high}-${day.sessions.find(s => s.name === 'NewYork')?.low}`).join('\n')}

GENERATE PREDICTIONS FOR:
1. NEXT WEEK (Monday ${nextMonday.toISOString().split('T')[0]} through Friday)
2. TOMORROW (${tomorrow.toISOString().split('T')[0]})

FOR EACH SETUP, PROVIDE:
- Which strategies align (higher confluence = higher probability)
- Entry price (exact level)
- Technical stop loss (based on structure, order blocks, or session range)
- Take profit target (based on next key level or average move)
- Direction (LONG/SHORT)
- Probability (based on historical success rate)
- Detailed reasoning (why this setup works)
- Technical details (which order blocks, FVGs, zones, etc.)

TRADING RULES:
- Confluence Score: Number of strategies aligned (1-5)
- Higher confluence = higher probability
- Fresh zones are stronger than tested zones
- Order blocks near session levels = high confluence
- Prioritize setups with 3+ strategy confluence

Respond ONLY with valid JSON in this format:

{
  "weeklyPredictions": [
    {
      "date": "2025-11-17",
      "dayOfWeek": "Monday",
      "setupName": "London Low Bounce + Bullish Order Block",
      "strategies": ["ICT", "SESSION", "SUPPLY_DEMAND"],
      "confluenceScore": 3,
      "entryPrice": 20150,
      "technicalStopLoss": 20050,
      "takeProfit": 20450,
      "direction": "LONG",
      "probability": 85,
      "reasoning": "Historical data shows 82% win rate on Monday London lows. Bullish order block at 20100 adds confluence. Fresh demand zone aligns.",
      "technicalDetails": "Bullish OB at 20100, FVG 20130-20170, Session Low 20150, Fresh Demand 20090-20140"
    }
  ],
  "nextDayPrediction": {
    "date": "${tomorrow.toISOString().split('T')[0]}",
    "dayOfWeek": "${tomorrow.toLocaleDateString('en-US', { weekday: 'long' })}",
    "marketBias": "BULLISH",
    "keyLevels": {
      "resistance": [20500, 20600],
      "support": [20100, 20000]
    },
    "recommendation": "Focus on London session low bounce. Wait for price to sweep Asian low then look for bullish order block entry.",
    "topSetups": [
      {
        "setupName": "Asia Low Sweep + OB Entry",
        "strategies": ["ICT", "SESSION"],
        "confluenceScore": 2,
        "entryPrice": 20120,
        "technicalStopLoss": 20050,
        "takeProfit": 20350,
        "direction": "LONG",
        "probability": 78,
        "reasoning": "Price likely to sweep Asia low then reverse from order block",
        "technicalDetails": "Bullish OB at 20100, Asia Low 20150"
      }
    ]
  }
}

CRITICAL: Respond ONLY with JSON. No markdown, no explanations.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: forecastPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: strategyForecastSchema,
        },
    });

    const responseText = response.text.trim();
    try {
        const cleanJson = responseText.replace(/^```json/, '').replace(/```$/, '');
        const rawForecast = JSON.parse(cleanJson);

        // Process weekly predictions with hybrid stop loss and position sizing
        const weeklyPredictions: PredictedTradeSetup[] = rawForecast.weeklyPredictions.map((pred: any) => {
            const { stopLoss, stopLossPoints } = calculateHybridStopLoss(
                pred.entryPrice,
                pred.direction,
                pred.technicalStopLoss
            );
            const { positionSize, riskAmount } = calculatePositionSize(stopLossPoints);
            const takeProfitPoints = Math.abs(pred.takeProfit - pred.entryPrice);
            const riskRewardRatio = takeProfitPoints / stopLossPoints;
            const potentialProfit = takeProfitPoints * PNL_MULTIPLIER * positionSize;

            return {
                date: pred.date,
                dayOfWeek: pred.dayOfWeek,
                setupName: pred.setupName,
                strategies: pred.strategies,
                confluenceScore: pred.confluenceScore,
                entryPrice: pred.entryPrice,
                stopLoss,
                stopLossPoints,
                takeProfit: pred.takeProfit,
                takeProfitPoints,
                direction: pred.direction,
                probability: pred.probability,
                riskRewardRatio,
                positionSize,
                riskAmount,
                potentialProfit,
                reasoning: pred.reasoning,
                technicalDetails: pred.technicalDetails,
            };
        });

        // Process next day prediction
        let nextDayPrediction: NextDayPrediction | null = null;
        if (rawForecast.nextDayPrediction) {
            const processedSetups = rawForecast.nextDayPrediction.topSetups.map((setup: any) => {
                const { stopLoss, stopLossPoints } = calculateHybridStopLoss(
                    setup.entryPrice,
                    setup.direction,
                    setup.technicalStopLoss
                );
                const { positionSize, riskAmount } = calculatePositionSize(stopLossPoints);
                const takeProfitPoints = Math.abs(setup.takeProfit - setup.entryPrice);
                const riskRewardRatio = takeProfitPoints / stopLossPoints;
                const potentialProfit = takeProfitPoints * PNL_MULTIPLIER * positionSize;

                return {
                    date: rawForecast.nextDayPrediction.date,
                    dayOfWeek: rawForecast.nextDayPrediction.dayOfWeek,
                    setupName: setup.setupName,
                    strategies: setup.strategies,
                    confluenceScore: setup.confluenceScore,
                    entryPrice: setup.entryPrice,
                    stopLoss,
                    stopLossPoints,
                    takeProfit: setup.takeProfit,
                    takeProfitPoints,
                    direction: setup.direction,
                    probability: setup.probability,
                    riskRewardRatio,
                    positionSize,
                    riskAmount,
                    potentialProfit,
                    reasoning: setup.reasoning,
                    technicalDetails: setup.technicalDetails,
                };
            });

            nextDayPrediction = {
                ...rawForecast.nextDayPrediction,
                topSetups: processedSetups
            };
        }

        // Calculate strategy performance from historical data
        const strategyPerformance = calculateStrategyPerformance(historicalData);

        // Get top confluence setups (3+ strategies aligned)
        const topConfluenceSetups = [...weeklyPredictions]
            .filter(setup => setup.confluenceScore >= 3)
            .sort((a, b) => b.confluenceScore - a.confluenceScore || b.probability - a.probability)
            .slice(0, 5);

        return {
            strategyLeaderboard: strategyPerformance,
            weeklyPredictions,
            nextDayPrediction,
            topConfluenceSetups,
            generatedAt: new Date().toISOString(),
            accountSize: ACCOUNT_SIZE,
            riskPercentage: RISK_PERCENTAGE,
            maxStopLoss: MAX_STOP_LOSS_DOLLARS,
        };
    } catch (e) {
        console.error("Failed to parse strategy forecast:", responseText, e);
        throw new Error("The AI returned an invalid strategy forecast format.");
    }
};

/**
 * Calculate strategy performance from historical data
 */
const calculateStrategyPerformance = (historicalData: DailyData[]): StrategyPerformance[] => {
    const strategies: { [key in StrategyType]: StrategyPerformance } = {
        ICT: {
            strategyName: 'ICT',
            displayName: 'ICT (Order Blocks & FVG)',
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            netPnl: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            bestDay: 'N/A',
            bestSession: 'N/A',
        },
        SMC: {
            strategyName: 'SMC',
            displayName: 'Smart Money Concepts',
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            netPnl: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            bestDay: 'N/A',
            bestSession: 'N/A',
        },
        SESSION: {
            strategyName: 'SESSION',
            displayName: 'Session-Based Trading',
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            netPnl: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            bestDay: 'N/A',
            bestSession: 'N/A',
        },
        SUPPLY_DEMAND: {
            strategyName: 'SUPPLY_DEMAND',
            displayName: 'Supply & Demand Zones',
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            netPnl: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            bestDay: 'N/A',
            bestSession: 'N/A',
        },
        MARKET_PROFILE: {
            strategyName: 'MARKET_PROFILE',
            displayName: 'Market Profile / Volume',
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            netPnl: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            bestDay: 'N/A',
            bestSession: 'N/A',
        },
    };

    // For now, use session-based data as proxy for SESSION strategy
    // In production, you'd extract actual strategy signals from historical data
    historicalData.forEach(day => {
        if (Array.isArray(day.reactions)) {
            day.reactions.forEach(reaction => {
                const pnl = reaction.reacted && reaction.outcome ? reaction.move * PNL_MULTIPLIER : -MAX_STOP_LOSS_DOLLARS;

                // Attribute to SESSION strategy
                strategies.SESSION.totalTrades++;
                if (pnl > 0) {
                    strategies.SESSION.winningTrades++;
                    strategies.SESSION.netPnl += pnl;
                } else {
                    strategies.SESSION.losingTrades++;
                    strategies.SESSION.netPnl += pnl;
                }
            });
        }
    });

    // Calculate final metrics for each strategy
    Object.values(strategies).forEach(strategy => {
        if (strategy.totalTrades > 0) {
            strategy.winRate = (strategy.winningTrades / strategy.totalTrades) * 100;
            strategy.avgWin = strategy.winningTrades > 0 ? strategy.netPnl / strategy.winningTrades : 0;
            strategy.avgLoss = strategy.losingTrades > 0 ? Math.abs(strategy.netPnl) / strategy.losingTrades : 0;

            const grossProfit = strategy.winningTrades * (strategy.netPnl / strategy.totalTrades);
            const grossLoss = Math.abs(strategy.losingTrades * (strategy.netPnl / strategy.totalTrades));
            strategy.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
        }
    });

    // Return sorted by net PnL
    return Object.values(strategies).sort((a, b) => b.netPnl - a.netPnl);
};
