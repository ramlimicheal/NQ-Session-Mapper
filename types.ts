
export interface ChartFile {
  data: string;
  name: string;
  date: string;
}

export interface ChartsState {
  week1: ChartFile[];
  week2: ChartFile[];
  week3: ChartFile[];
  week4: ChartFile[];
  week5: ChartFile[];
  week6: ChartFile[];
}

export interface Session {
    name: string;
    high: number;
    low: number;
}

export interface Reaction {
    testedLevel: number;
    levelName: string;
    reacted: boolean;
    reactionType: string;
    move: number;
    outcome: string;
}

export interface DailyData {
    date: string;
    dayOfWeek: string;
    sessions: Session[];
    reactions: Reaction[];
    marketEvent?: { type: string; reason: string; volatility: number };
}

export interface AnalysisResult {
    days: DailyData[];
    weekHigh: number;
    weekLow: number;
    volatility: string;
    weekNumber: string;
    uploadDate: string;
    fileName: string;
}

export interface SessionStat {
    tested: number;
    successful: number;
    moves: number[];
    probability: string;
    avgMove: string;
    confidence: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface SessionStats {
    [key: string]: SessionStat;
}

export interface AggregatedResults {
    sessionStats: SessionStats;
    dailyData: DailyData[];
    allReactions: Reaction[];
    totalDays: number;
    totalReactions: number;
    successfulReactions: number;
    overallSuccessRate: string;
}

export interface HistoricalPatterns {
    byDay: { [key: string]: { count: number; reactions: number; successful: number; successRate: string; } };
    bySession: { [key: string]: Reaction[] };
    bestDay: string;
    bestSession: string;
    totalDays: number;
}

export interface DailyPrediction {
    day: string;
    date: string;
    topSetups: {
        session: string;
        level: string;
        probability: number;
        expectedMove: number;
        direction: string;
        reasoning: string;
    }[];
}

export interface TopTrade {
    day: string;
    setup: string;
    probability: number;
    expectedMove: number;
}

export interface WeeklyForecast {
    dailyPredictions: DailyPrediction[];
    weeklyRecommendation: string;
    topTrades: TopTrade[];
    generatedAt: string;
    historicalDays: number;
}

export interface Trade {
    date: string;
    level: string;
    direction: string;
    pnl: number;
    cumulativePnl: number;
}

export interface PerformanceMetrics {
    trades: Trade[];
    netPnl: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    avgWin: number;
    avgLoss: number;
    rewardRiskRatio: number;
    totalTrades: number;
}

// ============================================
// STRATEGY-BASED TRADING SYSTEM TYPES
// ============================================

export type StrategyType = 'ICT' | 'SMC' | 'SESSION' | 'SUPPLY_DEMAND' | 'MARKET_PROFILE';

export interface OrderBlock {
    price: number;
    type: 'bullish' | 'bearish';
    strength: 'strong' | 'moderate' | 'weak';
    tested: boolean;
}

export interface FairValueGap {
    topPrice: number;
    bottomPrice: number;
    type: 'bullish' | 'bearish';
    filled: boolean;
}

export interface StructureBreak {
    price: number;
    type: 'BOS' | 'ChoCH'; // Break of Structure or Change of Character
    direction: 'bullish' | 'bearish';
}

export interface SupplyDemandZone {
    topPrice: number;
    bottomPrice: number;
    type: 'supply' | 'demand';
    strength: 'fresh' | 'tested' | 'weak';
    touches: number;
}

export interface StrategySignal {
    strategy: StrategyType;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    direction: 'LONG' | 'SHORT';
    confidence: number; // 0-100
    reasoning: string;
    riskRewardRatio: number;
    setupDetails: {
        orderBlocks?: OrderBlock[];
        fairValueGaps?: FairValueGap[];
        structureBreaks?: StructureBreak[];
        supplyDemandZones?: SupplyDemandZone[];
        sessionLevels?: { level: string; price: number }[];
    };
}

export interface DayStrategyAnalysis {
    date: string;
    dayOfWeek: string;
    detectedStrategies: StrategySignal[];
    confluenceScore: number; // Number of strategies aligned
    bestSetup: StrategySignal | null;
}

export interface StrategyPerformance {
    strategyName: StrategyType;
    displayName: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    netPnl: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    bestDay: string;
    bestSession: string;
}

export interface PredictedTradeSetup {
    date: string;
    dayOfWeek: string;
    setupName: string;
    strategies: StrategyType[]; // Which strategies confirm this setup
    confluenceScore: number;
    entryPrice: number;
    stopLoss: number;
    stopLossPoints: number;
    takeProfit: number;
    takeProfitPoints: number;
    direction: 'LONG' | 'SHORT';
    probability: number; // 0-100
    riskRewardRatio: number;
    positionSize: number; // Number of MNQ contracts
    riskAmount: number; // Dollar risk (should be ~$1000 for 2%)
    potentialProfit: number;
    reasoning: string;
    technicalDetails: string;
}

export interface NextDayPrediction {
    date: string;
    dayOfWeek: string;
    topSetups: PredictedTradeSetup[];
    marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyLevels: {
        resistance: number[];
        support: number[];
    };
    recommendation: string;
}

export interface StrategyForecastResult {
    strategyLeaderboard: StrategyPerformance[];
    weeklyPredictions: PredictedTradeSetup[];
    nextDayPrediction: NextDayPrediction | null;
    topConfluenceSetups: PredictedTradeSetup[]; // Top 5 highest confluence
    generatedAt: string;
    accountSize: number;
    riskPercentage: number;
    maxStopLoss: number;
}