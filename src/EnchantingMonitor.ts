import { Logger } from './Logger';
import { PriceHistoryManager } from './PriceHistoryManager';
import { ItemRegistry } from './ItemRegistry';
import { BoltPrices, EnhancedProfitData, RuneInfo } from './shared/types';
import { calculateEnhancedProfit } from './shared/utils';
import { RUNE_NAMES } from './shared/constants';
import { ItemPriceTracker } from './ItemPriceTracker';

interface EnchantingConfig {
    readonly baseItemId: number;
    readonly enchantedItemId: number;
    readonly BOLT_BATCH_SIZE: number;
    readonly targetMargin: number;
    readonly runes: ReadonlyArray<{
        readonly id: number;
        readonly quantity: number;
        readonly defaultPrice: number;
    }>;
}

export class EnchantingMonitor {
    private logger: Logger;
    private config: EnchantingConfig;
    private trackers: {
        baseItem: ItemPriceTracker;
        enchantedItem: ItemPriceTracker;
        runes: Map<number, ItemPriceTracker>;
    };
    public lastProfit: EnhancedProfitData | null = null;

    constructor(config: EnchantingConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
        
        const baseItemHistory = new PriceHistoryManager(config.baseItemId, logger);
        const enchantedItemHistory = new PriceHistoryManager(config.enchantedItemId, logger);
        
        // Create a map to store rune trackers
        const runeTrackers = new Map<number, ItemPriceTracker>();
        
        this.trackers = {
            baseItem: new ItemPriceTracker(config.baseItemId, baseItemHistory, logger),
            enchantedItem: new ItemPriceTracker(config.enchantedItemId, enchantedItemHistory, logger),
            runes: runeTrackers
        };
        
        // Initialize rune trackers
        config.runes.forEach(rune => {
            const runeHistory = new PriceHistoryManager(rune.id, logger);
            runeTrackers.set(rune.id, new ItemPriceTracker(rune.id, runeHistory, logger));
        });
    }

    async initialize(): Promise<void> {
        // Initialize bolt trackers
        const initPromises = [
            this.trackers.baseItem.initialize(),
            this.trackers.enchantedItem.initialize()
        ];
        
        // Initialize rune trackers
        this.config.runes.forEach(rune => {
            const runeTracker = this.trackers.runes.get(rune.id);
            if (runeTracker) {
                initPromises.push(runeTracker.initialize());
            }
        });
        
        await Promise.all(initPromises);
    }

    async calculateCurrentProfit(): Promise<EnhancedProfitData | null> {
        const [baseItem, enchantedItem] = await Promise.all([
            this.trackers.baseItem.updatePrice(),
            this.trackers.enchantedItem.updatePrice()
        ]);

        if (!baseItem || !enchantedItem) {
            this.logger.error('Missing price data for items');
            return null;
        }

        const prices: BoltPrices = {
            baseItem: {
                avgHighPrice: baseItem.avgHighPrice,
                avgLowPrice: baseItem.avgLowPrice
            },
            enchantedItem: {
                avgHighPrice: enchantedItem.avgHighPrice,
                avgLowPrice: enchantedItem.avgLowPrice
            }
        };

        // Update rune prices and calculate total rune cost
        const runeInfos: RuneInfo[] = [];
        let runesCost = 0;
        
        // Create an array of promises for rune price updates
        const runeUpdatePromises = this.config.runes.map(async rune => {
            const runeTracker = this.trackers.runes.get(rune.id);
            let runePrice = rune.defaultPrice; // Default fallback price
            
            if (runeTracker) {
                try {
                    const priceData = await runeTracker.updatePrice();
                    if (priceData && priceData.avgHighPrice > 0) {
                        // Use high price for runes (instant buy)
                        runePrice = priceData.avgHighPrice;
                    }
                } catch (error) {
                    this.logger.error(`Failed to update price for rune ${rune.id}`, error);
                }
            }
            
            // Calculate cost for this rune
            const runeCost = runePrice * rune.quantity;
            runesCost += runeCost;
            
            // Add rune info to array
            runeInfos.push({
                id: rune.id,
                quantity: rune.quantity,
                defaultPrice: rune.defaultPrice,
                price: runePrice,
                name: RUNE_NAMES[rune.id] || 'Unknown Rune'
            });
        });
        
        // Wait for all rune price updates to complete
        await Promise.all(runeUpdatePromises);

        const profitData = calculateEnhancedProfit(
            prices,
            this.config.BOLT_BATCH_SIZE,
            runesCost
        );

        // Add rune information
        profitData.runes = runeInfos;

        this.lastProfit = profitData;
        this.logProfitCalculation(baseItem, enchantedItem, profitData);
        return profitData;
    }

    private logProfitCalculation(baseItem: any, enchantedItem: any, profitData: EnhancedProfitData): void {
        this.logger.debug('Profit calculation:', {
            baseItem: {
                avgHigh: baseItem.avgHighPrice,
                avgLow: baseItem.avgLowPrice
            },
            enchantedItem: {
                avgHigh: enchantedItem.avgHighPrice,
                avgLow: enchantedItem.avgLowPrice
            },
            runes: profitData.runes.map(rune => ({
                id: rune.id,
                name: rune.name,
                price: rune.price,
                quantity: rune.quantity
            })),
            instantProfit: profitData.instantProfit,
            slowProfit: profitData.slowProfit,
            medianProfit: profitData.medianProfit
        });
    }
} 