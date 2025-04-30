export type BoltType = 'ruby' | 'diamond';

export interface RuneInfo {
  id: number;
  quantity: number;
  defaultPrice: number;
  price: number; // This will be the actual dynamic price
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
  highVolume: number;
  lowVolume: number;
  timestamp: number;
}

export interface LimitData {
  limitReached: boolean;
  resetTime: number | null;
}

export interface PricePoint {
  avgHighPrice: number;
  avgLowPrice: number;
}

export interface BoltPrices {
  baseItem: PricePoint;
  enchantedItem: PricePoint;
}

export interface ProfitCalculation {
  profit: number;
  profitPerItem: number;
  buyPrice: number;
  sellPrice: number;
}

export interface EnhancedProfitData {
  instantProfit: ProfitCalculation;
  slowProfit: ProfitCalculation;
  medianProfit: ProfitCalculation;
  baseBoltPrices: PricePoint;
  enchantedBoltPrices: PricePoint;
  runes: RuneInfo[];
  limitReached: boolean;
  resetTime: number | null;
}

export interface HistoricalPriceData {
  item_id: number;
  timestamp: number;
  high_price: number;
  low_price: number;
  high_volume: number;
  low_volume: number;
  time_step: string;
}

export interface ProfitHistoryData {
  timestamp: number;
  profit: number;
  profit_per_bolt: number;
  regular_bolt_price: number;
  enchanted_bolt_price: number;
  runes_cost: number;
} 