


import React, { useState } from 'react';
// FIX: Corrected typo in function name from generateAIForcecast to generateAIForecast.
import { analyzeChartWithGemini, generateAIForecast, generateStrategyBasedForecast } from './services/geminiService';
import {
  ChartsState, ChartFile, AnalysisResult, AggregatedResults,
  DailyData, Reaction, SessionStat, SessionStats, WeeklyForecast, HistoricalPatterns, PerformanceMetrics, Trade,
  StrategyForecastResult, PredictedTradeSetup, StrategyPerformance
} from './types';
import {
  Upload, TrendingUp, AlertCircle, Download, Calendar, Target, Sparkles, BarChart3, Zap, FileText
} from './components/icons';

const initialChartsState: ChartsState = {
  week1: [], week2: [], week3: [], week4: [], week5: [], week6: []
};

// Enhanced ReportTab with Strategy-Based Predictions
const ReportTab: React.FC<{
    dailyData: DailyData[],
    strategyForecast: StrategyForecastResult | null,
    onExport: () => void,
    onGenerateStrategies: () => void,
    generatingStrategies: boolean
}> = ({ dailyData, strategyForecast, onExport, onGenerateStrategies, generatingStrategies }) => {
    const pnlMultiplier = 2; // $2 per point for MNQ
    const stopLoss = -150;
    const levels = ['Asia High', 'Asia Low', 'London High', 'London Low', 'New York High', 'New York Low'];

    const reportData = dailyData.map(day => {
        const reactionsByLevel: { [key: string]: any } = {};
        levels.forEach(level => {
            reactionsByLevel[level] = { reacted: 'No', direction: '-', pointsMoved: '-', pnl: '-', entryPrice: '-' };
        });

        if (Array.isArray(day.reactions)) {
            day.reactions.forEach(reaction => {
                const normalizedReactionLevel = reaction.levelName.toLowerCase().replace(/\s+/g, '');
                const matchingLevel = levels.find(l => l.toLowerCase().replace(/\s+/g, '') === normalizedReactionLevel);

                if (matchingLevel) {
                    const isWin = reaction.reacted && reaction.outcome;
                    reactionsByLevel[matchingLevel] = {
                        reacted: reaction.reacted ? 'Yes' : 'No',
                        direction: reaction.outcome || 'SL',
                        pointsMoved: reaction.move,
                        pnl: isWin ? reaction.move * pnlMultiplier : stopLoss,
                        entryPrice: reaction.testedLevel,
                    };
                }
            });
        }

        return {
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dayOfWeek: day.dayOfWeek,
            reactions: reactionsByLevel,
        };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (reportData.length === 0 && !strategyForecast) {
        return (
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-12 border border-zinc-800 text-center animate-fadeIn">
                <FileText className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-2xl font-bold mb-2">No Report Data Available</h3>
                <p className="text-zinc-400">Please analyze one or more charts on the 'Upload' tab to generate a trade report.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Strategy-Based Predictions Section */}
            {!strategyForecast && dailyData.length >= 5 && (
                <div className="bg-gradient-to-br from-purple-950/50 to-blue-950/50 backdrop-blur-sm rounded-xl p-8 border border-purple-800 text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                    <h3 className="text-2xl font-bold mb-2">Generate Multi-Strategy Predictions</h3>
                    <p className="text-zinc-300 mb-6">Analyze historical data using 5 world-class trading strategies (ICT, SMC, Session, Supply/Demand, Market Profile)</p>
                    <button
                        onClick={onGenerateStrategies}
                        disabled={generatingStrategies}
                        className={`bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 px-8 py-4 rounded-lg font-bold flex items-center gap-2 mx-auto transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed ${generatingStrategies ? 'shimmer' : ''}`}
                    >
                        <Target className="w-5 h-5" />
                        <span>{generatingStrategies ? 'Analyzing Strategies...' : 'Generate Strategy Predictions'}</span>
                    </button>
                </div>
            )}

            {/* Strategy Leaderboard */}
            {strategyForecast && strategyForecast.strategyLeaderboard.length > 0 && (
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-yellow-400" />
                            🏆 Strategy Performance Leaderboard
                        </h3>
                        <div className="text-sm text-zinc-400">
                            $50k Account | 2% Risk | Max $150 SL
                        </div>
                    </div>
                    <div className="grid md:grid-cols-5 gap-4">
                        {strategyForecast.strategyLeaderboard.filter(s => s.totalTrades > 0).map((strategy, idx) => (
                            <div key={strategy.strategyName} className={`rounded-lg p-4 border ${idx === 0 ? 'bg-yellow-950/30 border-yellow-700 ring-2 ring-yellow-500' : idx === 1 ? 'bg-zinc-800/50 border-zinc-600' : 'bg-zinc-900 border-zinc-700'}`}>
                                <div className="text-center mb-3">
                                    <div className="text-3xl font-bold text-zinc-500">#{idx + 1}</div>
                                    <div className="font-bold text-lg mt-1">{strategy.displayName}</div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Win Rate</span>
                                        <span className="font-bold text-green-400">{strategy.winRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Net PnL</span>
                                        <span className={`font-bold ${strategy.netPnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${strategy.netPnl.toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Trades</span>
                                        <span className="font-mono">{strategy.totalTrades}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">P.Factor</span>
                                        <span className="font-mono text-purple-400">{strategy.profitFactor.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Next Day Prediction */}
            {strategyForecast?.nextDayPrediction && (
                <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/50 backdrop-blur-sm rounded-xl p-6 border border-blue-800">
                    <h3 className="text-2xl font-bold flex items-center gap-2 mb-4">
                        <Calendar className="w-6 h-6 text-cyan-400" />
                        ⚡ Tomorrow's High-Probability Setups
                    </h3>
                    <div className="mb-4 p-4 bg-zinc-900/50 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-sm text-zinc-400">Date</div>
                                <div className="text-lg font-bold">{new Date(strategyForecast.nextDayPrediction.date).toLocaleDateString()}</div>
                                <div className="text-xs text-zinc-500">{strategyForecast.nextDayPrediction.dayOfWeek}</div>
                            </div>
                            <div>
                                <div className="text-sm text-zinc-400">Market Bias</div>
                                <div className={`text-lg font-bold ${strategyForecast.nextDayPrediction.marketBias === 'BULLISH' ? 'text-green-400' : strategyForecast.nextDayPrediction.marketBias === 'BEARISH' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {strategyForecast.nextDayPrediction.marketBias}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-zinc-400">Key Levels</div>
                                <div className="text-xs">
                                    <div className="text-red-400">R: {strategyForecast.nextDayPrediction.keyLevels.resistance.join(', ')}</div>
                                    <div className="text-green-400">S: {strategyForecast.nextDayPrediction.keyLevels.support.join(', ')}</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-zinc-800/50 rounded">
                            <div className="text-xs text-zinc-400 mb-1">Recommendation</div>
                            <div className="text-sm">{strategyForecast.nextDayPrediction.recommendation}</div>
                        </div>
                    </div>
                    <TradeSetupCards setups={strategyForecast.nextDayPrediction.topSetups} />
                </div>
            )}

            {/* Top Confluence Setups */}
            {strategyForecast && strategyForecast.topConfluenceSetups.length > 0 && (
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-bold flex items-center gap-2 mb-4">
                        <Target className="w-6 h-6 text-green-400" />
                        🎯 Top Confluence Setups (3+ Strategies Aligned)
                    </h3>
                    <TradeSetupCards setups={strategyForecast.topConfluenceSetups} />
                </div>
            )}

            {/* Weekly Predictions */}
            {strategyForecast && strategyForecast.weeklyPredictions.length > 0 && (
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                    <h3 className="text-2xl font-bold flex items-center gap-2 mb-4">
                        <Calendar className="w-6 h-6 text-blue-400" />
                        📅 Weekly Trade Predictions
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {strategyForecast.weeklyPredictions.map((setup, idx) => (
                            <TradeSetupCard key={idx} setup={setup} />
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Trades Table */}
            {reportData.length > 0 && (
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">📋 Historical Trade Log (MNQ)</h3>
                        <button onClick={onExport} className="mt-2 sm:mt-0 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                            <Download className="w-4 h-4" />Export Report CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1024px] text-sm text-left text-zinc-300">
                            <thead className="text-xs text-zinc-400 uppercase bg-zinc-800/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 rounded-tl-lg w-40" rowSpan={2}>Date</th>
                                    <th scope="col" className="px-4 py-3 w-32" rowSpan={2}>MNQ</th>
                                    <th scope="col" className="px-4 py-3 text-center border-l border-r border-zinc-700" colSpan={2}>Asia Session</th>
                                    <th scope="col" className="px-4 py-3 text-center border-r border-zinc-700" colSpan={2}>London Session</th>
                                    <th scope="col" className="px-4 py-3 text-center rounded-tr-lg" colSpan={2}>NY Session</th>
                                </tr>
                                <tr className="border-t border-zinc-700">
                                    {['Asia High', 'Asia Low', 'London High', 'London Low', 'New York High', 'New York Low'].map((level, i) => (
                                        <th key={level} scope="col" className={`px-4 py-3 bg-zinc-800/30 text-center ${i % 2 !== 0 ? 'border-r border-zinc-700' : ''}`}>{level.split(' ')[1]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((day, index) => (
                                    <React.Fragment key={index}>
                                        <tr className={`border-b border-zinc-700 ${index > 0 ? 'border-t-4 border-black' : ''}`}>
                                            <td className="px-4 py-2 font-semibold text-white whitespace-nowrap" rowSpan={5}>
                                                {day.date}
                                                <div className="text-xs font-normal text-zinc-400">{day.dayOfWeek}</div>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-zinc-400 font-semibold bg-zinc-900/40">Reacted</td>
                                            {levels.map(level => {
                                                const reacted = day.reactions[level].reacted;
                                                const reactedClass = reacted === 'Yes' ? 'text-green-400' : 'text-zinc-500';
                                                return <td key={level} className={`px-4 py-2 text-center font-semibold ${reactedClass}`}>{reacted}</td>;
                                            })}
                                        </tr>
                                        <tr className="border-b border-zinc-700">
                                            <td className="px-4 py-2 text-xs text-zinc-400 font-semibold bg-zinc-900/40">Direction</td>
                                            {levels.map(level => {
                                                const dir = day.reactions[level].direction;
                                                const dirClass = dir === 'LONG' ? 'text-green-400' : dir === 'SHORT' ? 'text-red-400' : 'text-zinc-500';
                                                return <td key={level} className={`px-4 py-2 text-center font-bold ${dirClass}`}>{dir}</td>;
                                            })}
                                        </tr>
                                        <tr className="border-b border-zinc-700">
                                            <td className="px-4 py-2 text-xs text-zinc-400 font-semibold bg-zinc-900/40">Entry Price</td>
                                            {levels.map(level => {
                                                const price = day.reactions[level].entryPrice;
                                                return <td key={level} className="px-4 py-2 text-center font-mono">{typeof price === 'number' ? price.toLocaleString() : price}</td>;
                                            })}
                                        </tr>
                                        <tr className="border-b border-zinc-700">
                                            <td className="px-4 py-2 text-xs text-zinc-400 font-semibold bg-zinc-900/40">Points Moved</td>
                                            {levels.map(level => (
                                                <td key={level} className="px-4 py-2 text-center font-mono">{day.reactions[level].pointsMoved}</td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 text-xs text-zinc-400 font-semibold bg-zinc-900/40">PNL</td>
                                            {levels.map(level => {
                                                const pnl = day.reactions[level].pnl;
                                                const pnlClass = typeof pnl === 'number' ? (pnl > 0 ? 'text-green-400' : 'text-red-400') : 'text-zinc-500';
                                                return <td key={level} className={`px-4 py-2 text-center font-mono font-semibold ${pnlClass}`}>
                                                    {typeof pnl === 'number' ? `$${pnl.toLocaleString()}` : pnl}
                                                </td>;
                                            })}
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Trade Setup Card Component
const TradeSetupCard: React.FC<{ setup: PredictedTradeSetup }> = ({ setup }) => {
    const getConfluenceColor = (score: number) => {
        if (score >= 4) return 'border-green-600 bg-green-950/30 ring-2 ring-green-500';
        if (score >= 3) return 'border-blue-600 bg-blue-950/30';
        return 'border-zinc-700 bg-zinc-900/50';
    };

    return (
        <div className={`rounded-lg p-4 border ${getConfluenceColor(setup.confluenceScore)}`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="font-bold text-lg">{setup.setupName}</div>
                    <div className="text-xs text-zinc-400">{new Date(setup.date).toLocaleDateString()} - {setup.dayOfWeek}</div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{setup.probability}%</div>
                    <div className="text-xs text-zinc-400">Probability</div>
                </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-1">
                {setup.strategies.map((strategy, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 border border-purple-700">
                        {strategy}
                    </span>
                ))}
                <span className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700 font-bold">
                    {setup.confluenceScore}x Confluence
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="text-xs text-zinc-400">Entry</div>
                    <div className="font-mono font-bold text-white">{setup.entryPrice.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-red-950/30 rounded border border-red-900">
                    <div className="text-xs text-red-400">Stop Loss</div>
                    <div className="font-mono font-bold text-red-300">{setup.stopLoss.toLocaleString()}</div>
                    <div className="text-xs text-red-400">{setup.stopLossPoints} pts</div>
                </div>
                <div className="p-2 bg-green-950/30 rounded border border-green-900">
                    <div className="text-xs text-green-400">Take Profit</div>
                    <div className="font-mono font-bold text-green-300">{setup.takeProfit.toLocaleString()}</div>
                    <div className="text-xs text-green-400">{setup.takeProfitPoints} pts</div>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="text-xs text-zinc-400">Direction</div>
                    <div className={`font-bold ${setup.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                        {setup.direction}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                    <div className="text-zinc-400">R:R</div>
                    <div className="font-bold text-yellow-400">{setup.riskRewardRatio.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                    <div className="text-zinc-400">Contracts</div>
                    <div className="font-bold">{setup.positionSize}</div>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                    <div className="text-zinc-400">Risk</div>
                    <div className="font-bold text-red-400">${setup.riskAmount.toFixed(0)}</div>
                </div>
            </div>

            <div className="mb-2 p-3 bg-zinc-800/30 rounded text-xs">
                <div className="text-zinc-400 mb-1">Reasoning:</div>
                <div>{setup.reasoning}</div>
            </div>

            <div className="p-3 bg-blue-950/20 rounded text-xs border border-blue-900">
                <div className="text-blue-400 mb-1">Technical Details:</div>
                <div className="text-zinc-300">{setup.technicalDetails}</div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-700 text-xs text-center">
                <div className="text-zinc-400">Potential Profit: <span className="font-bold text-green-400">${setup.potentialProfit.toFixed(0)}</span></div>
            </div>
        </div>
    );
};

// Trade Setup Cards Grid
const TradeSetupCards: React.FC<{ setups: PredictedTradeSetup[] }> = ({ setups }) => {
    if (setups.length === 0) {
        return <div className="text-center text-zinc-400 py-8">No high-probability setups found for this period.</div>;
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {setups.map((setup, idx) => (
                <TradeSetupCard key={idx} setup={setup} />
            ))}
        </div>
    );
};

const PerformanceTab: React.FC<{ metrics: PerformanceMetrics | null }> = ({ metrics }) => {
    if (!metrics || metrics.trades.length === 0) {
        return (
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-12 border border-zinc-800 text-center animate-fadeIn">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <h3 className="text-2xl font-bold mb-2">No Performance Data</h3>
                <p className="text-zinc-400">Analyze charts to generate backtesting results and performance metrics.</p>
            </div>
        );
    }

    const { netPnl, winRate, profitFactor, maxDrawdown, rewardRiskRatio, totalTrades, trades } = metrics;
    
    // SVG Chart component
    const EquityCurveChart = () => {
        const width = 500;
        const height = 200;
        const padding = 20;

        const pnlValues = [0, ...trades.map(t => t.cumulativePnl)];
        const maxPnl = Math.max(...pnlValues);
        const minPnl = Math.min(...pnlValues);
        
        const getX = (index: number) => (index / (pnlValues.length - 1)) * (width - padding * 2) + padding;
        const getY = (pnl: number) => height - ((pnl - minPnl) / (maxPnl - minPnl)) * (height - padding * 2) - padding;

        const path = pnlValues.map((pnl, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pnl)}`).join(' ');
        const areaPath = `${path} L ${getX(pnlValues.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

        return (
            <div className="p-4 bg-zinc-900/50 rounded-lg">
                 <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill="url(#equityGradient)" />
                    <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" />
                    <line x1={padding} y1={getY(0)} x2={width-padding} y2={getY(0)} stroke="#64748b" strokeWidth="1" strokeDasharray="4"/>
                 </svg>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                <h3 className="text-xl font-bold mb-4">📈 Performance & Backtest Results</h3>
                <EquityCurveChart />
            </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Net PNL</div>
                    <div className={`text-2xl font-bold ${netPnl > 0 ? 'text-green-400' : 'text-red-400'}`}>${netPnl.toFixed(2)}</div>
                </div>
                 <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Win Rate</div>
                    <div className="text-2xl font-bold text-cyan-400">{winRate.toFixed(1)}%</div>
                </div>
                 <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Profit Factor</div>
                    <div className="text-2xl font-bold text-purple-400">{profitFactor.toFixed(2)}</div>
                </div>
                 <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-400">${maxDrawdown.toFixed(2)}</div>
                </div>
                 <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Reward/Risk</div>
                    <div className="text-2xl font-bold text-yellow-400">{rewardRiskRatio.toFixed(2)}</div>
                </div>
                 <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-sm text-zinc-400">Total Trades</div>
                    <div className="text-2xl font-bold">{totalTrades}</div>
                </div>
            </div>
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                 <h3 className="text-xl font-bold mb-4">📜 Simulated Trade Log</h3>
                 <div className="overflow-y-auto max-h-96">
                    <table className="w-full text-sm text-left text-zinc-300">
                        <thead className="text-xs text-zinc-400 uppercase bg-zinc-800/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Level</th>
                                <th className="px-4 py-2">Direction</th>
                                <th className="px-4 py-2 text-right">PNL</th>
                                <th className="px-4 py-2 text-right">Cumulative PNL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {trades.map((trade, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-2">{new Date(trade.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{trade.level}</td>
                                    <td className={`px-4 py-2 font-semibold ${trade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{trade.direction}</td>
                                    <td className={`px-4 py-2 text-right font-mono ${trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>${trade.pnl.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-mono">${trade.cumulativePnl.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [charts, setCharts] = useState<ChartsState>(initialChartsState);
  const [analyzing, setAnalyzing] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [generatingStrategies, setGeneratingStrategies] = useState(false);
  const [historicalData, setHistoricalData] = useState<DailyData[]>([]);
  const [weeklyForecast, setWeeklyForecast] = useState<WeeklyForecast | null>(null);
  const [strategyForecast, setStrategyForecast] = useState<StrategyForecastResult | null>(null);
  const [results, setResults] = useState<AggregatedResults | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upload');

  const marketEvents: { [key: string]: { type: string; reason: string; volatility: number } } = {
    '2025-10-30': { type: 'FED', reason: 'Fed rate cut', volatility: 2.0 },
    '2025-11-04': { type: 'ELECTION', reason: 'U.S. Election Day', volatility: 3.0 },
    '2025-11-08': { type: 'ELECTION_AFTERMATH', reason: 'Post-election volatility', volatility: 3.5 }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, week: keyof ChartsState) => {
    if (!e.target.files) return;
    // FIX: Add explicit type `File[]` to `files` to prevent `files.map` from failing due to `files` being inferred as `unknown`.
    const files: File[] = Array.from(e.target.files);
    // FIX: Add explicit type `File` to the `file` parameter to avoid it being inferred as `unknown`. This resolves issues with calling `.map()` on an untyped array.
    const readers = files.map((file: File) => {
      return new Promise<ChartFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            data: event.target!.result as string,
            name: file.name,
            date: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(images => {
      setCharts(prev => ({
        ...prev,
        [week]: [...prev[week], ...images]
      }));
    });
  };

  const removeChart = (week: keyof ChartsState, index: number) => {
    setCharts(prev => ({
      ...prev,
      [week]: prev[week].filter((_, i) => i !== index)
    }));
  };
  
  const aggregateAnalyses = (analyses: AnalysisResult[]): AggregatedResults => {
    const sessionStats: SessionStats = {
      asiaHigh: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' },
      asiaLow: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' },
      londonHigh: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' },
      londonLow: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' },
      newYorkHigh: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' },
      newYorkLow: { tested: 0, successful: 0, moves: [], probability: '0', avgMove: '0', confidence: 'LOW' }
    };

    const dailyData: DailyData[] = [];
    const allReactions: Reaction[] = [];

    analyses.forEach(analysis => {
      // FIX: Add Array.isArray check to prevent runtime errors if the API returns a non-array for `days`.
      if (Array.isArray(analysis.days)) {
        analysis.days.forEach(day => {
          dailyData.push(day);
          // FIX: Add Array.isArray check to prevent runtime errors if the API returns a non-array for `reactions`.
          if (Array.isArray(day.reactions)) {
              day.reactions.forEach(reaction => {
                allReactions.push(reaction);
                // FIX: Correctly generate camelCase key from levelName (e.g., "Asia Low" -> "asiaLow") to match keys in sessionStats.
                const levelKeyRaw = reaction.levelName.replace(/\s+/g, '');
                const levelKey = levelKeyRaw.charAt(0).toLowerCase() + levelKeyRaw.slice(1);
                if (sessionStats[levelKey]) {
                  sessionStats[levelKey].tested++;
                  if (reaction.reacted) {
                    sessionStats[levelKey].successful++;
                    sessionStats[levelKey].moves.push(reaction.move);
                  }
                }
              });
          }
        });
      }
    });

    Object.keys(sessionStats).forEach(key => {
      const stat = sessionStats[key];
      stat.probability = stat.tested > 0 ? ((stat.successful / stat.tested) * 100).toFixed(1) : '0';
      stat.avgMove = stat.moves.length > 0 ? (stat.moves.reduce((a, b) => a + b, 0) / stat.moves.length).toFixed(1) : '0';
      stat.confidence = stat.tested >= 10 ? 'HIGH' : stat.tested >= 5 ? 'MODERATE' : 'LOW';
    });

    const successfulReactionsCount = allReactions.filter(r => r.reacted).length;
    return {
      sessionStats, dailyData, allReactions,
      totalDays: dailyData.length,
      totalReactions: allReactions.length,
      successfulReactions: successfulReactionsCount,
      overallSuccessRate: allReactions.length > 0 ? ((successfulReactionsCount / allReactions.length) * 100).toFixed(1) : '0'
    };
  };

    const calculatePerformanceMetrics = (dailyData: DailyData[]): PerformanceMetrics => {
        const pnlMultiplier = 2; // $2 per point for MNQ
        const stopLoss = -150;
        let trades: Trade[] = [];
        let cumulativePnl = 0;

        const sortedDays = [...dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedDays.forEach(day => {
            if (Array.isArray(day.reactions)) {
                day.reactions.forEach(reaction => {
                    const pnl = reaction.reacted ? reaction.move * pnlMultiplier : stopLoss;
                    cumulativePnl += pnl;
                    trades.push({
                        date: day.date,
                        level: reaction.levelName,
                        direction: reaction.outcome || 'SL',
                        pnl,
                        cumulativePnl,
                    });
                });
            }
        });

        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl <= 0);

        const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

        let maxDrawdown = 0;
        let peakPnl = 0;
        trades.forEach(trade => {
            peakPnl = Math.max(peakPnl, trade.cumulativePnl);
            const drawdown = peakPnl - trade.cumulativePnl;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });

        return {
            trades,
            totalTrades: trades.length,
            netPnl: cumulativePnl,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
            profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
            maxDrawdown,
            avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
            avgLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
            rewardRiskRatio: (losingTrades.length > 0 && winningTrades.length > 0) ? (grossProfit / winningTrades.length) / (grossLoss / losingTrades.length) : 0,
        };
    };

  const analyzeAllCharts = async () => {
    const allCharts = Object.entries(charts).flatMap(([week, weekCharts]) =>
      weekCharts.map((chart) => ({ week, chart }))
    );

    if (allCharts.length === 0) {
      setError('Please upload at least one chart');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResults(null);
    setWeeklyForecast(null);
    setPerformanceMetrics(null);

    try {
      const analyses: AnalysisResult[] = [];
      for (const { week, chart } of allCharts) {
        const analysis = await analyzeChartWithGemini(chart.data);
        analysis.weekNumber = week;
        analysis.uploadDate = chart.date;
        analysis.fileName = chart.name;
        // FIX: Add Array.isArray check to safely handle API response.
        if (Array.isArray(analysis.days)) {
          analysis.days.forEach(day => {
            if (marketEvents[day.date]) {
              day.marketEvent = marketEvents[day.date];
            }
          });
        }
        analyses.push(analysis);
      }
      
      const aggregated = aggregateAnalyses(analyses);
      setResults(aggregated);

      const performance = calculatePerformanceMetrics(aggregated.dailyData);
      setPerformanceMetrics(performance);

      setHistoricalData(prev => [...prev, ...aggregated.dailyData].slice(-100));
      setActiveTab('results');
    } catch (err: any) {
      setError('Analysis failed: ' + err.message);
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeHistoricalPatterns = (): HistoricalPatterns => {
    const byDay: { [key: string]: { count: number; reactions: number; successful: number; successRate: string; } } = {};
    const bySession: { [key: string]: Reaction[] } = { Asia: [], London: [], NewYork: [] };

    historicalData.forEach(day => {
      const dow = day.dayOfWeek;
      if (!byDay[dow]) {
        byDay[dow] = { count: 0, reactions: 0, successful: 0, successRate: "0" };
      }
      byDay[dow].count++;

      if (Array.isArray(day.reactions)) {
        day.reactions.forEach(reaction => {
          const sessionName = reaction.levelName.split(' ')[0];
          if (bySession[sessionName]) {
            bySession[sessionName].push(reaction);
          }
          byDay[dow].reactions++;
          if (reaction.reacted) {
            byDay[dow].successful++;
          }
        });
      }
    });

    Object.keys(byDay).forEach(day => {
      byDay[day].successRate = byDay[day].reactions > 0 ? ((byDay[day].successful / byDay[day].reactions) * 100).toFixed(1) : '0';
    });

    const bestDay = Object.entries(byDay).reduce((best, [day, data]) => parseFloat(data.successRate) > parseFloat(best.rate) ? { day, rate: data.successRate } : best, { day: 'N/A', rate: '0' });
    // FIX: Add a type assertion to `Object.entries` to fix type inference errors where `reactions` becomes `unknown`.
    const bestSession = (Object.entries(bySession) as [string, Reaction[]][]).reduce((best, [session, reactions]) => {
      const successRate = reactions.length > 0 ? (reactions.filter(r => r.reacted).length / reactions.length * 100) : 0;
      return successRate > best.rate ? { session, rate: successRate } : best;
    }, { session: 'N/A', rate: 0 });

    return {
      byDay, bySession,
      bestDay: bestDay.day,
      bestSession: bestSession.session,
      totalDays: historicalData.length
    };
  };

  const generateWeeklyForecast = async () => {
    if (historicalData.length < 5) {
      setError(`Need at least 5 days of historical data. Currently have: ${historicalData.length} days`);
      return;
    }
    setPredicting(true);
    setError(null);

    try {
      const patterns = analyzeHistoricalPatterns();
      // FIX: Corrected typo in function name from generateAIForcecast to generateAIForecast.
      const forecast = await generateAIForecast(patterns);
      setWeeklyForecast(forecast);
      setActiveTab('forecast');
    } catch (err: any) {
      setError('Forecast generation failed: ' + err.message);
      console.error(err);
    } finally {
      setPredicting(false);
    }
  };

  const generateStrategyForecast = async () => {
    if (historicalData.length < 5) {
      setError(`Need at least 5 days of historical data. Currently have: ${historicalData.length} days`);
      return;
    }
    setGeneratingStrategies(true);
    setError(null);

    try {
      const patterns = analyzeHistoricalPatterns();
      const forecast = await generateStrategyBasedForecast(historicalData, patterns);
      setStrategyForecast(forecast);
      setActiveTab('report'); // Navigate to report tab to see results
    } catch (err: any) {
      setError('Strategy forecast generation failed: ' + err.message);
      console.error(err);
    } finally {
      setGeneratingStrategies(false);
    }
  };

  const exportCSV = () => {
    if (!results) return;
    let csv = 'Session,Level,Times Tested,Successful,Probability,Avg Move,Confidence\n';
    // FIX: Add explicit type `[string, SessionStat]` to destructuring to fix type inference issues with `Object.entries`.
    Object.entries(results.sessionStats).forEach(([key, stat]: [string, SessionStat]) => {
      const name = key.replace(/([A-Z])/g, ' $1').trim();
      const [session, level] = name.split(' ');
      csv += `${session},${level},${stat.tested},${stat.successful},${stat.probability}%,${stat.avgMove} pts,${stat.confidence}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SessionMap_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const exportForecast = () => {
    if (!weeklyForecast) return;
    let report = `SESSIONMAP AI - WEEKLY FORECAST\nGenerated: ${new Date(weeklyForecast.generatedAt).toLocaleString()}\nHistorical Days: ${weeklyForecast.historicalDays}\n\n`;
    report += `TOP TRADES FOR THE WEEK:\n`;
    if (Array.isArray(weeklyForecast.topTrades)) {
      weeklyForecast.topTrades.forEach((trade, idx) => {
        report += `${idx + 1}. ${trade.day}: ${trade.setup} (${trade.probability}% probability, ${trade.expectedMove} pts)\n`;
      });
    }
    report += `\n\nDAILY PREDICTIONS:\n`;
    if (Array.isArray(weeklyForecast.dailyPredictions)) {
      weeklyForecast.dailyPredictions.forEach(day => {
        report += `\n${day.day} (${day.date}):\n`;
        if (Array.isArray(day.topSetups)) {
          day.topSetups.forEach(setup => {
            report += `  ${setup.session} ${setup.level}: ${setup.probability}% (${setup.direction}, ${setup.expectedMove} pts)\n  Reasoning: ${setup.reasoning}\n`;
          });
        }
      });
    }
    report += `\n\nWEEKLY RECOMMENDATION:\n${weeklyForecast.weeklyRecommendation}\n`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Weekly_Forecast_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportReportCSV = () => {
    if (!results?.dailyData) return;

    const levels = ['Asia High', 'Asia Low', 'London High', 'London Low', 'New York High', 'New York Low'];
    const pnlMultiplier = 2; // $2 per point for MNQ
    const stopLoss = -150;
    
    let csv = 'Date,Day,Level,Entry Price,Reacted,Direction,Points Moved,PNL\n';

    results.dailyData.forEach(day => {
        const reactionsByLevel: { [key: string]: Reaction } = {};
        if (Array.isArray(day.reactions)) {
          day.reactions.forEach(r => {
              const normalized = r.levelName.toLowerCase().replace(/\s+/g, '');
              const matchingLevel = levels.find(l => l.toLowerCase().replace(/\s+/g, '') === normalized);
              if(matchingLevel) reactionsByLevel[matchingLevel] = r;
          });
        }

        levels.forEach(level => {
            const reaction = reactionsByLevel[level];
            if (reaction) {
                const isWin = reaction.reacted && reaction.outcome;
                const pnl = isWin ? reaction.move * pnlMultiplier : stopLoss;
                csv += `${day.date},${day.dayOfWeek},"${level}",${reaction.testedLevel},${reaction.reacted ? 'Yes' : 'No'},${reaction.outcome || 'SL'},${reaction.move},${pnl}\n`;
            }
        });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SessionMap_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-50 p-4 sm:p-6 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))]">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-zinc-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                🧠 SessionMap AI Pro
              </h1>
              <p className="text-zinc-400 mt-1">Powered by Google Gemini</p>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-0">
              <div className="bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
                <span className="text-xs text-zinc-400">Days: {historicalData.length}</span>
              </div>
              {historicalData.length >= 5 && (
                <div className="bg-green-950/50 px-3 py-2 rounded-lg border border-green-800">
                  <span className="text-xs text-green-400">✓ Ready to Predict</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'results', label: 'Analysis', icon: BarChart3 },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'forecast', label: 'Forecast', icon: Sparkles },
              { id: 'report', label: 'Report', icon: FileText }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm sm:text-base ${activeTab === tab.id ? 'bg-zinc-800 text-zinc-50' : 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400'}`}>
                <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
              <h3 className="text-xl font-bold mb-4">📊 Upload Your 1-Hour Charts</h3>
              <p className="text-zinc-400 mb-4 text-sm">Upload NQ (NASDAQ) 1-hour charts with visible session boxes (Asia/London/NY). Upload charts week by week for best results.</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(charts) as Array<keyof ChartsState>).map((week, idx) => (
                  <div key={week} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Week {idx + 1}</h4>
                      <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">{charts[week].length} chart{charts[week].length !== 1 ? 's' : ''}</span>
                    </div>
                    <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, week)} className="hidden" id={`upload-${week}`} />
                    <label htmlFor={`upload-${week}`} className="block border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg p-4 cursor-pointer transition-colors">
                      <div className="flex flex-col items-center gap-2"><Upload className="w-8 h-8 text-zinc-500" /><span className="text-xs text-zinc-400">Click to upload</span></div>
                    </label>
                    {charts[week].length > 0 && (
                      <div className="mt-3 space-y-2">
                        {charts[week].map((chart, chartIdx) => (
                          <div key={chartIdx} className="flex items-center justify-between bg-zinc-800 rounded p-2">
                            <span className="text-xs truncate flex-1">{chart.name}</span>
                            <button onClick={() => removeChart(week, chartIdx)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <button onClick={analyzeAllCharts} disabled={analyzing || Object.values(charts).every(w => w.length === 0)} className={`relative overflow-hidden bg-zinc-50 text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 px-8 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed ${analyzing ? 'shimmer' : ''}`}>
                <Zap className="w-5 h-5" /><span>{analyzing ? 'Analyzing...' : 'Analyze All Charts'}</span>
              </button>
              {historicalData.length >= 5 && (
                 <button onClick={generateWeeklyForecast} disabled={predicting} className={`relative overflow-hidden bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 px-8 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed ${predicting ? 'shimmer' : ''}`}>
                  <Sparkles className="w-5 h-5" /><span>{predicting ? 'Predicting...' : 'Generate Weekly Forecast'}</span>
                </button>
              )}
            </div>
            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" /><div className="flex-1"><h4 className="font-semibold text-red-400">Error</h4><p className="text-red-400 text-sm break-words">{error}</p></div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'results' && results && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-sm text-blue-400 mb-1">Total Days</div><div className="text-3xl font-bold">{results.totalDays}</div></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-sm text-green-400 mb-1">Success Rate</div><div className="text-3xl font-bold">{results.overallSuccessRate}%</div></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-sm text-purple-400 mb-1">Reactions</div><div className="text-3xl font-bold">{results.totalReactions}</div></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-sm text-orange-400 mb-1">Winners</div><div className="text-3xl font-bold">{results.successfulReactions}</div></div>
            </div>
            <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4"><h3 className="text-xl font-bold">📈 Session Level Statistics</h3><button onClick={exportCSV} className="mt-2 sm:mt-0 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><Download className="w-4 h-4" />Export CSV</button></div>
              <div className="grid md:grid-cols-2 gap-4">
                {/* FIX: Add explicit types to parameters in array methods to fix type inference issues. */}
                {(Object.entries(results.sessionStats) as [string, SessionStat][])
                  .filter(([, stat]) => stat.tested > 0)
                  .sort((a, b) => parseFloat(b[1].probability) - parseFloat(a[1].probability))
                  .map(([key, stat]) => {
                  const name = key.replace(/([A-Z])/g, ' $1').trim();
                  const prob = parseFloat(stat.probability);
                  return (
                    <div key={key} className={`rounded-lg p-4 border ${prob >= 80 ? 'bg-green-950/50 border-green-800' : prob >= 70 ? 'bg-blue-950/50 border-blue-800' : 'bg-zinc-900 border-zinc-800'}`}>
                      <div className="flex items-center justify-between mb-2"><h4 className="font-semibold text-lg">{name}</h4><span className={`text-2xl font-bold ${prob >= 80 ? 'text-green-400' : prob >= 70 ? 'text-blue-400' : 'text-yellow-400'}`}>{stat.probability}%</span></div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><div className="text-zinc-400 text-xs">Tested</div><div className="font-semibold">{stat.tested}</div></div>
                        <div><div className="text-zinc-400 text-xs">Successful</div><div className="font-semibold text-green-400">{stat.successful}</div></div>
                        <div><div className="text-zinc-400 text-xs">Avg Move</div><div className="font-semibold text-cyan-400">{stat.avgMove} pts</div></div>
                      </div>
                      <div className="mt-2 text-xs"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${stat.confidence === 'HIGH' ? 'bg-green-950 text-green-400 border-green-800' : stat.confidence === 'MODERATE' ? 'bg-blue-950 text-blue-400 border-blue-800' : 'bg-yellow-950 text-yellow-400 border-yellow-800'}`}>{stat.confidence}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'performance' && (
            <PerformanceTab metrics={performanceMetrics} />
        )}
        {activeTab === 'forecast' && (
          <div className="space-y-6 animate-fadeIn">
            {!weeklyForecast ? (
              <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-12 border border-zinc-800 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-2xl font-bold mb-2">Weekly Forecast Not Generated</h3>
                <p className="text-zinc-400 mb-6">You have {historicalData.length} days of historical data. {historicalData.length < 5 ? `Need ${5 - historicalData.length} more to generate predictions.` : 'Ready to predict next week!'}</p>
                 <button onClick={generateWeeklyForecast} disabled={predicting || historicalData.length < 5} className={`relative overflow-hidden bg-purple-600 text-white hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 px-8 py-4 rounded-lg font-bold flex items-center gap-2 mx-auto transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed ${predicting ? 'shimmer' : ''}`}>
                  <Sparkles className="w-6 h-6" /><span>{predicting ? 'Generating...' : 'Generate Forecast'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                    <div><h3 className="text-3xl font-bold flex items-center gap-3"><Sparkles className="w-8 h-8 text-purple-400" />Weekly Forecast</h3><p className="text-lg text-purple-300 mt-1">Based on {weeklyForecast.historicalDays} days of data</p></div>
                    <button onClick={exportForecast} className="mt-3 sm:mt-0 bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"><Download className="w-5 h-5" />Export</button>
                  </div>
                </div>
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                  <h4 className="text-xl font-bold mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-green-400" />🔥 Top Trading Setups</h4>
                  <div className="space-y-3">
                    {/* FIX: Add Array.isArray guard to prevent runtime errors. */}
                    {Array.isArray(weeklyForecast.topTrades) && weeklyForecast.topTrades.map((trade, idx) => (
                      <div key={idx} className={`rounded-lg p-4 border ${trade.probability >= 85 ? 'bg-green-950/50 border-green-800' : trade.probability >= 75 ? 'bg-blue-950/50 border-blue-800' : 'bg-zinc-900 border-zinc-800'}`}>
                        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-2xl font-bold text-zinc-500">#{idx + 1}</span><div><div className="font-bold text-lg">{trade.day} — {trade.setup}</div></div></div><div className="text-right"><div className="text-3xl font-bold text-green-400">{trade.probability}%</div><div className="text-sm text-zinc-400">{trade.expectedMove} pts</div></div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-950/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
                  <h4 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-400" />Day-by-Day Predictions</h4>
                  <div className="space-y-4">
                    {/* FIX: Add Array.isArray guard to prevent runtime errors. */}
                    {Array.isArray(weeklyForecast.dailyPredictions) && weeklyForecast.dailyPredictions.map((day, idx) => (
                      <div key={idx} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                        <div className="flex items-center justify-between mb-3"><div><h5 className="text-lg font-bold">{day.day}</h5><p className="text-sm text-zinc-400">{day.date}</p></div></div>
                        <div className="space-y-2">
                          {/* FIX: Add Array.isArray guard to prevent runtime errors. */}
                          {Array.isArray(day.topSetups) && day.topSetups.map((setup, sidx) => (
                            <div key={sidx} className="bg-zinc-800/50 rounded p-3">
                              <div className="flex items-center justify-between mb-2"><span className="font-semibold">{setup.session} {setup.level}</span><span className={`font-bold ${setup.probability >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{setup.probability}%</span></div>
                              <div className="text-sm text-zinc-300">{setup.reasoning}</div>
                              <div className="mt-2 text-xs text-zinc-400">{setup.direction} • {setup.expectedMove} pts expected</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h4 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-400" />💡 Trading Recommendation</h4>
                  <div className="text-zinc-200 text-lg">{weeklyForecast.weeklyRecommendation}</div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'report' && (
            <ReportTab
                dailyData={results?.dailyData || []}
                strategyForecast={strategyForecast}
                onExport={exportReportCSV}
                onGenerateStrategies={generateStrategyForecast}
                generatingStrategies={generatingStrategies}
            />
        )}
      </main>
    </div>
  );
};

export default App;
