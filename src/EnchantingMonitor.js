const ItemPriceTracker = require('./ItemPriceTracker');
const ItemRegistry = require('./ItemRegistry');

class EnchantingMonitor {
    constructor(config, priceHistory, logger = console) {
        this.registry = new ItemRegistry();
        
        // Validate required config parameters
        const requiredParams = ['baseItemId', 'enchantedItemId', 'batchSize', 'targetMargin', 'runes'];
        requiredParams.forEach(param => {
            if (!(param in config)) {
                throw new Error(`Missing required parameter: ${param}`);
            }
        });

        this.config = {
            batchSize: config.batchSize,
            targetMargin: config.targetMargin,
            stabilityPeriod: config.stabilityPeriod || 3600000, // Default 1 hour
            ...config
        };

        this.priceHistory = priceHistory;
        this.logger = logger;
        this.lastProfitCheck = null;
        this.stableSince = null;

        // Create price trackers for base and enchanted items
        this.trackers = {
            baseItem: new ItemPriceTracker(this.config.baseItemId, priceHistory, logger),
            enchantedItem: new ItemPriceTracker(this.config.enchantedItemId, priceHistory, logger)
        };
    }

    async initialize() {
        this.logger.info(`Initializing EnchantingMonitor for ${this.registry.getName(this.config.baseItemId)}...`);
        await Promise.all([
            this.trackers.baseItem.initialize(),
            this.trackers.enchantedItem.initialize()
        ]);
        
        await this.calculateCurrentProfit();
    }

    calculateRunesCost() {
        return this.config.runes.reduce((total, rune) => {
            return total + (rune.price * rune.quantity);
        }, 0);
    }

    calculateProfitFromPrices(baseItemPrice, enchantedItemPrice) {
        const runesCost = this.calculateRunesCost();
        const baseItemCost = baseItemPrice * this.config.batchSize;
        const totalCost = runesCost + baseItemCost;
        const revenue = enchantedItemPrice * this.config.batchSize;
        const profit = revenue - totalCost;
        const profitPerItem = profit / this.config.batchSize;

        return {
            profit,
            profitPerItem,
            runesCost,
            baseItemCost,
            totalCost,
            revenue
        };
    }

    async calculateCurrentProfit() {
        const [baseItem, enchantedItem] = await Promise.all([
            this.trackers.baseItem.getLatestPrice(),
            this.trackers.enchantedItem.getLatestPrice()
        ]);

        if (!baseItem || !enchantedItem) {
            this.logger.error('Missing price data for items');
            return null;
        }

        // Use avgHighPrice for buying regular bolts (instant buy)
        // Use avgLowPrice for selling enchanted bolts (instant sell)
        const profitData = this.calculateProfitFromPrices(
            baseItem.avgHighPrice || baseItem.avgLowPrice,  // Buy price - prefer instant buy
            enchantedItem.avgLowPrice || enchantedItem.avgHighPrice  // Sell price - prefer instant sell
        );

        this.logProfitCalculation(baseItem, enchantedItem, profitData);
        return profitData;
    }

    logProfitCalculation(baseItem, enchantedItem, profitData) {
        this.logger.info('=== Profit Calculation ===');
        
        // Base item prices
        this.logger.info(`${this.registry.getName(this.config.baseItemId)} (Buy):`);
        this.logger.info(`  Latest: ${baseItem.highPrice || 'N/A'} GP (high) / ${baseItem.lowPrice || 'N/A'} GP (low)`);
        this.logger.info(`  Average: ${baseItem.avgHighPrice || 'N/A'} GP (high) / ${baseItem.avgLowPrice || 'N/A'} GP (low)`);
        this.logger.info(`  Using: ${baseItem.avgHighPrice || baseItem.avgLowPrice} GP`);
        
        // Enchanted item prices
        this.logger.info(`${this.registry.getName(this.config.enchantedItemId)} (Sell):`);
        this.logger.info(`  Latest: ${enchantedItem.highPrice || 'N/A'} GP (high) / ${enchantedItem.lowPrice || 'N/A'} GP (low)`);
        this.logger.info(`  Average: ${enchantedItem.avgHighPrice || 'N/A'} GP (high) / ${enchantedItem.avgLowPrice || 'N/A'} GP (low)`);
        this.logger.info(`  Using: ${enchantedItem.avgLowPrice || enchantedItem.avgHighPrice} GP`);
        
        // Rune costs
        const runeCosts = this.config.runes.map(rune => 
            `${this.registry.getName(rune.id)}: ${rune.price} GP × ${rune.quantity}`
        ).join(', ');
        
        // Profit breakdown
        this.logger.info('\nCost Breakdown:');
        this.logger.info(`  Runes: ${profitData.runesCost.toLocaleString()} GP (${runeCosts})`);
        this.logger.info(`  Base Items: ${profitData.baseItemCost.toLocaleString()} GP`);
        this.logger.info(`  Total Cost: ${profitData.totalCost.toLocaleString()} GP`);
        this.logger.info(`  Revenue: ${profitData.revenue.toLocaleString()} GP`);
        this.logger.info(`  Profit: ${profitData.profit.toLocaleString()} GP`);
        this.logger.info(`  Profit per Item: ${profitData.profitPerItem.toLocaleString()} GP`);
    }

    // ... rest of the methods remain the same as in your current version ...
}

module.exports = EnchantingMonitor; 