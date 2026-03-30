export interface FinalisedPlan {
  symbol: string;
  direction: string;
  stopLoss: number;
  takeProfit: number;
  maxHold: number;
  winRate: number;
  scenarioCount: number;
  profitFactor: number;
  avgReturn: number;
  avgDaysHeld: number;
  bestReturn: number;
  worstReturn: number;
}
