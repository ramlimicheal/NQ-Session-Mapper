
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