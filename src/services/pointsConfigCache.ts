import { EarningRules } from '../types/points';

let cachedEarning: EarningRules | null = null;

export function setEarningCache(earning: EarningRules | null): void {
  cachedEarning = earning;
}

export function getEarning(): EarningRules | null {
  return cachedEarning;
}
