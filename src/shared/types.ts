export type BoltType = 'ruby' | 'diamond';

export interface RuneInfo {
  id: number;
  quantity: number;
  price: number;
  name: string;
}

export interface ProfitData {
  profit: number;
  profitPerItem: number;
  baseBoltPrice: number;
  enchantedBoltPrice: number;
  latestBuyPrice: number;
  latestSellPrice: number;
  runes: RuneInfo[];
  limitReached: boolean;
  resetTime: number | null;
}

export interface PriceData {
  avgHighPrice: number;
  avgLowPrice: number;
  highPrice: number;
  lowPrice: number;
}

export interface LimitData {
  limitReached: boolean;
  resetTime: number | null;
} 