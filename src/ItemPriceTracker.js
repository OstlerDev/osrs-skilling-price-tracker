const OSRSPriceAPI = require('./OSRSPriceAPI');
const ItemRegistry = require('./ItemRegistry');

class ItemPriceTracker {
    constructor(itemId, priceHistory, logger = console) {
        this.itemId = itemId;
        this.priceHistory = priceHistory;
        this.logger = logger;
        this.api = new OSRSPriceAPI();
        this.registry = new ItemRegistry();
        this.updateInterval = 300000; // 5 minutes
        this.timeSteps = ['5m', '1h', '6h', '24h'];
        this.latestPrice = null;
    }

    async initialize() {
        const itemName = this.registry.getName(this.itemId);
        this.logger.info(`Initializing price tracker for ${itemName}`);
        
        // Fetch both historical and latest prices in parallel
        await Promise.all([
            this.loadHistoricalPrices(),
            this.updateLatestPrice()
        ]);

        // Start periodic updates
        this.startUpdates();
    }

    startUpdates() {
        setInterval(async () => {
            await this.updateTimeSeries('5m');
        }, this.updateInterval);
    }

    async updateTimeSeries(timeStep) {
        const data = await this.api.fetchTimeSeries(this.itemId, timeStep);
        const itemName = this.registry.getName(this.itemId);
        if (data) {
            this.logger.info(`Loaded ${data.length} ${timeStep} price points for ${itemName}`);
            await this.priceHistory.recordTimeSeriesData(this.itemId, timeStep, data);
        }
    }

    async updateLatestPrice() {
        try {
            const latestPrice = await this.priceHistory.getLatestPrice(this.itemId);
            const itemName = this.registry.getName(this.itemId);

            if (latestPrice) {
                // If either price is null, try to get the most recent non-null value
                if (latestPrice.high === null) {
                    const lastHigh = await this.priceHistory.getLatestNonNullPrice(this.itemId, 'high');
                    if (lastHigh) {
                        latestPrice.high = lastHigh.price;
                        this.logger.debug(`Using fallback high price from ${new Date(lastHigh.timestamp).toISOString()}`);
                    }
                }

                if (latestPrice.low === null) {
                    const lastLow = await this.priceHistory.getLatestNonNullPrice(this.itemId, 'low');
                    if (lastLow) {
                        latestPrice.low = lastLow.price;
                        this.logger.debug(`Using fallback low price from ${new Date(lastLow.timestamp).toISOString()}`);
                    }
                }

                this.latestPrice = latestPrice;
                this.logger.debug(`Updated latest price for ${itemName}: High=${latestPrice.high?.toLocaleString() || 'N/A'} GP, Low=${latestPrice.low?.toLocaleString() || 'N/A'} GP`);
            } else {
                this.logger.warn(`No price data available for ${itemName}`);
            }
        } catch (error) {
            this.logger.error(`Failed to fetch latest price for ${this.registry.getName(this.itemId)}:`, error);
        }
    }

    async loadHistoricalPrices() {
        try {
            await Promise.all([
                this.updateTimeSeries('5m'),
                this.updateTimeSeries('1h'),
                this.updateTimeSeries('6h'),
                this.updateTimeSeries('24h')
            ]);
        } catch (error) {
            this.logger.error(`Failed to load historical prices for ${this.itemId}:`, error);
        }
    }

    async getLatestPrice() {
        await this.updateLatestPrice();
        const averages = await this.priceHistory.getAveragePrices(this.itemId, '1h');
        
        const prices = {
            // Latest instant prices (with fallback)
            highPrice: this.latestPrice?.high,
            lowPrice: this.latestPrice?.low,
            // 1-hour moving averages
            avgHighPrice: averages?.avgHighPrice,
            avgLowPrice: averages?.avgLowPrice
        };

        const itemName = this.registry.getName(this.itemId);
        this.logger.debug(`=== Price Data for ${itemName} ===`);
        this.logger.debug(`Latest High: ${prices.highPrice?.toLocaleString() || 'N/A'} GP`);
        this.logger.debug(`Latest Low: ${prices.lowPrice?.toLocaleString() || 'N/A'} GP`);
        this.logger.debug(`1h Avg High: ${prices.avgHighPrice?.toLocaleString() || 'N/A'} GP`);
        this.logger.debug(`1h Avg Low: ${prices.avgLowPrice?.toLocaleString() || 'N/A'} GP`);
        this.logger.debug(`Intervals: ${averages?.intervalCount || 0} (5-minute periods)`);
        this.logger.debug(`Data Points: ${averages?.totalDataPoints || 0} total`);
        this.logger.debug(`  High Prices: ${averages?.highPricePoints || 0} points`);
        this.logger.debug(`  Low Prices: ${averages?.lowPricePoints || 0} points`);
        
        return prices;
    }

    async getPriceHistory(duration = '1h') {
        return this.priceHistory.getPriceHistory(this.itemId, duration);
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

module.exports = ItemPriceTracker; 