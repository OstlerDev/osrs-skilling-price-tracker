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
        readonly price: number;
        readonly quantity: number;
    }>;
}

export class EnchantingMonitor {
    private logger: Logger;
    private config: EnchantingConfig;
    private trackers: {
        baseItem: ItemPriceTracker;
        enchantedItem: ItemPriceTracker;
    };
    public lastProfit: EnhancedProfitData | null = null;

    constructor(config: EnchantingConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
        
        const baseItemHistory = new PriceHistoryManager(config.baseItemId, logger);
        const enchantedItemHistory = new PriceHistoryManager(config.enchantedItemId, logger);
        
        this.trackers = {
            baseItem: new ItemPriceTracker(config.baseItemId, baseItemHistory, logger),
            enchantedItem: new ItemPriceTracker(config.enchantedItemId, enchantedItemHistory, logger)
        };
    }

    async initialize(): Promise<void> {
        await Promise.all([
            this.trackers.baseItem.initialize(),
            this.trackers.enchantedItem.initialize()
        ]);
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

        const runesCost = this.config.runes.reduce((total, rune) => 
            total + (rune.price * rune.quantity), 0);

        const profitData = calculateEnhancedProfit(
            prices,
            this.config.BOLT_BATCH_SIZE,
            runesCost
        );

        // Add rune information
        profitData.runes = this.config.runes.map(rune => ({
            id: rune.id,
            quantity: Number(rune.quantity || 0),
            price: Number(rune.price || 0),
            name: RUNE_NAMES[rune.id] || 'Unknown Rune'
        }));

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
            instantProfit: profitData.instantProfit,
            slowProfit: profitData.slowProfit,
            medianProfit: profitData.medianProfit
        });
    }
} 