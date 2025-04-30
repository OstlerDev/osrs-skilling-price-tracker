import { EnhancedProfitData } from "./types";
import { BoltPrices } from "./types";
import { GE_TAX_RATE, GE_TAX_THRESHOLD } from "./constants";

interface ProfitCalculation {
  profit: number;
  profitPerItem: number;
  buyPrice: number;
  sellPrice: number;
}

export const formatGP = (number: number): string => {
  return `${number.toLocaleString()}`;
};

export const formatTimeRemaining = (resetTime: number): string => {
  const remaining = resetTime - Date.now();
  if (remaining <= 0) return '';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  
  return `Available in ${hours || ''}${hours > 0 ? 'h ' : ''}${minutes || ''}${
    minutes > 0 ? 'm ' : ''
  }${seconds}s`;
};

export const calculateProfit = (
  buyPrice: number,
  sellPrice: number,
  batchSize: number,
  runesCost: number
): ProfitCalculation => {
  const totalBuyCost = buyPrice * batchSize;
  let totalSellValue = sellPrice * batchSize;
  
  // Apply 1% GE tax if item price is over 100gp
  if (sellPrice > GE_TAX_THRESHOLD) {
    const taxAmount = totalSellValue * GE_TAX_RATE;
    totalSellValue -= taxAmount;
  }
  
  const profit = totalSellValue - totalBuyCost - runesCost;
  const profitPerItem = profit / batchSize;

  return {
    profit,
    profitPerItem,
    buyPrice,
    sellPrice
  };
};

export const calculateEnhancedProfit = (
  prices: BoltPrices,
  batchSize: number,
  runesCost: number
): EnhancedProfitData => {
  console.log(`Calculating enhanced profit for ${batchSize} bolts`);
  console.log(`Base item high price: ${prices.baseItem.avgHighPrice}`);
  console.log(`Base item low price: ${prices.baseItem.avgLowPrice}`);
  console.log(`Enchanted item high price: ${prices.enchantedItem.avgHighPrice}`);
  console.log(`Enchanted item low price: ${prices.enchantedItem.avgLowPrice}`);
  // Instant profit: Buy high, sell low (immediate execution)
  const instantProfit = calculateProfit(
    prices.baseItem.avgHighPrice,
    prices.enchantedItem.avgLowPrice,
    batchSize,
    runesCost
  );

  // Slow profit: Buy low, sell high (patient execution)
  const slowProfit = calculateProfit(
    prices.baseItem.avgLowPrice,
    prices.enchantedItem.avgHighPrice,
    batchSize,
    runesCost
  );

  // Median profit: Average prices for both buy and sell
  const medianProfit = calculateProfit(
    (prices.baseItem.avgHighPrice + prices.baseItem.avgLowPrice) / 2,
    (prices.enchantedItem.avgHighPrice + prices.enchantedItem.avgLowPrice) / 2,
    batchSize,
    runesCost
  );

  return {
    instantProfit,
    slowProfit,
    medianProfit,
    baseBoltPrices: prices.baseItem,
    enchantedBoltPrices: prices.enchantedItem,
    runes: [],
    limitReached: false,
    resetTime: null
  };
}; 