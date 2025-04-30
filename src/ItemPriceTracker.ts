import { OSRSPriceAPI } from './OSRSPriceAPI';
import { Logger } from './Logger';
import { PriceHistoryManager } from './PriceHistoryManager';
import { PriceData } from './shared/types';

export class ItemPriceTracker {
    private itemId: number;
    private priceHistory: PriceHistoryManager;
    private logger: Logger;
    private api: OSRSPriceAPI;
    private updateInterval: number;
    private lastUpdated: number | null;
    private timeSteps: string[];
    private latestPrice: PriceData | null;

    constructor(itemId: number, priceHistory: PriceHistoryManager, logger: Logger) {
        this.itemId = itemId;
        this.priceHistory = priceHistory;
        this.logger = logger;
        this.api = new OSRSPriceAPI();
        this.updateInterval = 60000; // 1 minute
        this.lastUpdated = null;
        this.timeSteps = ['5m', '1h', '6h', '24h'];
        this.latestPrice = null;
    }

    async updatePrice(): Promise<PriceData | null> {
        try {
            const now = Date.now();
            const ONE_HOUR = 60 * 60 * 1000;
            
            // Check if we have enough recent data points
            const recentDataPoints = await this.priceHistory.getRecentDataPoints(ONE_HOUR);
            if (recentDataPoints < 3) { // If less than 10 data points in the last hour
                this.logger.info(`Insufficient recent data points (${recentDataPoints}), reloading historical data`);
                await this.priceHistory.loadHistoricalData(this.timeSteps);
            }

            // Continue with normal price update
            if (this.lastUpdated && (now - this.lastUpdated) < this.updateInterval) {
                this.logger.debug('Skipping price update - too soon since last update');
                return this.latestPrice;
            }

            const data = await this.api.getLatestPrice(this.itemId);
            const itemData = data.data[this.itemId];

            if (!itemData) {
                throw new Error(`No price data found for item ${this.itemId}`);
            }

            this.latestPrice = {
                avgHighPrice: itemData.high,
                avgLowPrice: itemData.low,
                highPrice: itemData.high,
                lowPrice: itemData.low,
                highVolume: 0, // API doesn't provide volume data
                lowVolume: 0,
                timestamp: now
            };

            this.lastUpdated = now;
            await this.priceHistory.recordPrice(this.latestPrice);

            return this.latestPrice;
        } catch (error) {
            this.logger.error('Failed to update price:', error);
            return null;
        }
    }

    getLatestPrice(): PriceData | null {
        return this.latestPrice;
    }

    setUpdateInterval(interval: number): void {
        this.updateInterval = interval;
    }

    async initialize(): Promise<void> {
        try {
            await this.priceHistory.loadHistoricalData(this.timeSteps);
            await this.updatePrice();
        } catch (error) {
            this.logger.error('Failed to initialize price tracker:', error);
            throw error;
        }
    }
} 