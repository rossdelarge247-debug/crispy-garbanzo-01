import type { MarketFlag, MarketFlagDetail, Hypothesis, TestScenario, TradePlan } from "@/types";
import { mockFlags, mockFlagDetails } from "@/data/mock-flags";
import { mockHypotheses } from "@/data/mock-hypotheses";
import { mockTests } from "@/data/mock-tests";
import { mockTradePlans } from "@/data/mock-trade-plans";

export async function getFlags(): Promise<MarketFlag[]> {
  // In production: aggregate from market data, news, sentiment, calendar providers
  // For Phase 1: return mock data
  return mockFlags;
}

export async function getFlagById(id: string): Promise<MarketFlagDetail | null> {
  return mockFlagDetails.find(f => f.id === id) || null;
}

export async function getHypotheses(flagId: string): Promise<Hypothesis[]> {
  return mockHypotheses.filter(h => h.flagId === flagId);
}

export async function getTests(hypothesisId: string): Promise<TestScenario[]> {
  return mockTests.filter(t => t.hypothesisId === hypothesisId);
}

export async function getTestsForFlag(flagId: string): Promise<TestScenario[]> {
  return mockTests.filter(t => t.flagId === flagId);
}

export async function getTradePlan(flagId: string): Promise<TradePlan | null> {
  return mockTradePlans.find(p => p.flagId === flagId) || null;
}
