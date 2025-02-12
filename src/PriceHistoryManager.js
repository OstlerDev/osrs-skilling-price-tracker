const sqlite3 = require('sqlite3').verbose();
const OSRSPriceAPI = require('./OSRSPriceAPI');

class PriceHistoryManager {
    constructor(logger) {
        this.logger = logger;
        this.db = new sqlite3.Database('price_history.db');
        this.api = new OSRSPriceAPI();
        this.initializeDatabase();
    }

    initializeDatabase() {
        this.db.serialize(() => {
            // Create price history table with additional fields
            this.db.run(`
                CREATE TABLE IF NOT EXISTS price_history (
                    item_id INTEGER,
                    timestamp INTEGER,
                    high_price INTEGER,
                    low_price INTEGER,
                    high_volume INTEGER,
                    low_volume INTEGER,
                    time_step TEXT,
                    PRIMARY KEY (item_id, timestamp, time_step)
                )
            `);

            // Create profit history table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS profit_history (
                    timestamp INTEGER PRIMARY KEY,
                    profit INTEGER,
                    profit_per_bolt INTEGER,
                    regular_bolt_price INTEGER,
                    enchanted_bolt_price INTEGER,
                    runes_cost INTEGER
                )
            `);

            this.logger.info('Database initialized');
        });
    }

    async recordPrices(prices, timestamp) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO price_history (item_id, high_price, low_price, timestamp)
            VALUES (?, ?, ?, ?)
        `);

        for (const [itemId, priceData] of Object.entries(prices)) {
            stmt.run(itemId, priceData.high, priceData.low, timestamp);
        }

        stmt.finalize();
    }

    async recordTimeSeriesData(itemId, timeStep, data) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO price_history 
                (item_id, timestamp, high_price, low_price, high_volume, low_volume, time_step)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                let insertCount = 0;
                data.forEach(point => {
                    stmt.run(
                        itemId,
                        point.timestamp * 1000, // Convert UNIX timestamp to milliseconds
                        point.avgHighPrice,
                        point.avgLowPrice,
                        point.highPriceVolume,
                        point.lowPriceVolume,
                        timeStep
                    );
                    insertCount++;
                });

                this.db.run('COMMIT', err => {
                    if (err) {
                        this.logger.error('Error committing time series data:', err);
                        reject(err);
                    } else {
                        this.logger.debug(`Successfully recorded ${insertCount} data points for item ${itemId} (${timeStep})`);
                        resolve();
                    }
                });
            });

            stmt.finalize();
        });
    }

    async getPriceHistory(itemId, duration = '24h') {
        const cutoff = Date.now() - this.getDurationMillis(duration);
        
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM price_history 
                 WHERE item_id = ? AND timestamp > ?
                 ORDER BY timestamp ASC`,
                [itemId, cutoff],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getProfitHistory(duration = '24h') {
        const cutoff = Date.now() - this.getDurationMillis(duration);
        
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM profit_history 
                 WHERE timestamp > ?
                 ORDER BY timestamp ASC`,
                [cutoff],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getDurationMillis(duration) {
        const durations = {
            '1h': 3600000,
            '24h': 86400000,
            '7d': 604800000,
            '30d': 2592000000
        };
        return durations[duration] || durations['24h'];
    }

    close() {
        this.db.close();
    }

    async getLatestPrices() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                WITH LatestTimestamps AS (
                    SELECT item_id, MAX(timestamp) as max_timestamp
                    FROM price_history
                    WHERE time_step = '5m'
                    GROUP BY item_id
                )
                SELECT ph.*
                FROM price_history ph
                JOIN LatestTimestamps lt 
                    ON ph.item_id = lt.item_id 
                    AND ph.timestamp = lt.max_timestamp
                WHERE ph.time_step = '5m'
            `, (err, rows) => {
                if (err) {
                    this.logger.error('Error fetching latest prices', err);
                    reject(err);
                } else {
                    const prices = {};
                    rows.forEach(row => {
                        prices[row.item_id] = {
                            avgHighPrice: row.high_price,
                            avgLowPrice: row.low_price,
                            timestamp: row.timestamp
                        };
                    });
                    resolve(prices);
                }
            });
        });
    }

    async recordProfit(profitData) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO profit_history 
                (timestamp, profit, profit_per_bolt, regular_bolt_price, enchanted_bolt_price, runes_cost)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                Date.now(),
                profitData.profit,
                profitData.profitPerBolt,
                profitData.boltsCost / profitData.BOLT_BATCH_SIZE,
                profitData.revenue / profitData.BOLT_BATCH_SIZE,
                profitData.runesCost
            ], (err) => {
                if (err) {
                    this.logger.error('Error recording profit data', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getLatestPrice(itemId) {
        return new Promise((resolve, reject) => {
            // First try to get the most recent price point
            this.db.all(`
                SELECT high_price, low_price, timestamp
                FROM price_history
                WHERE 
                    item_id = ?
                    AND time_step = '5m'
                ORDER BY timestamp DESC
                LIMIT 5  -- Look at last 5 entries to find non-null values
            `, [itemId], (err, rows) => {
                if (err) {
                    this.logger.error('Error fetching latest price:', err);
                    reject(err);
                } else if (!rows || rows.length === 0) {
                    resolve(null);
                } else {
                    // Find the most recent non-null values for both high and low
                    let high = null;
                    let low = null;
                    let timestamp = rows[0].timestamp;  // Use most recent timestamp

                    for (const row of rows) {
                        if (high === null && row.high_price !== null) {
                            high = row.high_price;
                        }
                        if (low === null && row.low_price !== null) {
                            low = row.low_price;
                        }
                        // Break if we found both prices
                        if (high !== null && low !== null) break;
                    }

                    resolve({
                        high,
                        low,
                        timestamp
                    });
                }
            });
        });
    }

    async getLatestNonNullPrice(itemId, priceType) {
        return new Promise((resolve, reject) => {
            const column = priceType === 'high' ? 'high_price' : 'low_price';
            this.db.get(`
                SELECT ${column}, timestamp
                FROM price_history
                WHERE 
                    item_id = ?
                    AND ${column} IS NOT NULL
                    AND time_step = '5m'
                ORDER BY timestamp DESC
                LIMIT 1
            `, [itemId], (err, row) => {
                if (err) {
                    this.logger.error(`Error fetching latest ${priceType} price:`, err);
                    reject(err);
                } else {
                    resolve(row ? {
                        price: row[column],
                        timestamp: row.timestamp
                    } : null);
                }
            });
        });
    }

    async getAveragePrices(itemId, timeWindow = '1h') {
        const latestTimestamp = await this.getLatestTimestampForItem(itemId);
        if (!latestTimestamp) {
            this.logger.warn(`No data found for item ${itemId}`);
            return null;
        }

        const windowMillis = {
            '5m': 5 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        }[timeWindow] || (60 * 60 * 1000);

        this.logger.debug(`Calculating ${timeWindow} averages for item ${itemId}`);
        this.logger.debug(`Latest timestamp in DB: ${new Date(latestTimestamp).toISOString()}`);
        this.logger.debug(`Window: ${new Date(latestTimestamp - windowMillis).toISOString()} to ${new Date(latestTimestamp).toISOString()}`);

        return new Promise((resolve, reject) => {
            // First, group data into 5-minute intervals and calculate averages for each interval
            const query = `
                WITH intervals AS (
                    SELECT 
                        item_id,
                        (timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000) as interval_start,
                        AVG(CASE WHEN high_price IS NOT NULL THEN high_price END) as interval_high_avg,
                        AVG(CASE WHEN low_price IS NOT NULL THEN low_price END) as interval_low_avg,
                        COUNT(*) as points_in_interval,
                        COUNT(CASE WHEN high_price IS NOT NULL THEN 1 END) as high_points_in_interval,
                        COUNT(CASE WHEN low_price IS NOT NULL THEN 1 END) as low_points_in_interval
                    FROM price_history
                    WHERE 
                        item_id = ? 
                        AND timestamp >= ?
                        AND timestamp <= ?
                        AND time_step = '5m'
                    GROUP BY item_id, interval_start
                )
                SELECT 
                    AVG(interval_high_avg) as avgHighPrice,
                    AVG(interval_low_avg) as avgLowPrice,
                    COUNT(*) as intervalCount,
                    SUM(points_in_interval) as totalDataPoints,
                    SUM(high_points_in_interval) as highPricePoints,
                    SUM(low_points_in_interval) as lowPricePoints,
                    MIN(interval_start) as windowStart,
                    MAX(interval_start) as windowEnd
                FROM intervals
            `;

            this.db.get(query, [
                itemId,
                latestTimestamp - windowMillis,
                latestTimestamp
            ], (err, row) => {
                if (err) {
                    this.logger.error('Error calculating average prices:', err);
                    reject(err);
                } else {
                    this.logger.debug('1-hour normalized average calculation results:', {
                        itemId,
                        windowStart: new Date(row.windowStart).toISOString(),
                        windowEnd: new Date(row.windowEnd).toISOString(),
                        intervalCount: row.intervalCount,
                        totalDataPoints: row.totalDataPoints,
                        highPricePoints: row.highPricePoints,
                        lowPricePoints: row.lowPricePoints,
                        avgHighPrice: row.avgHighPrice ? Math.round(row.avgHighPrice) : null,
                        avgLowPrice: row.avgLowPrice ? Math.round(row.avgLowPrice) : null
                    });

                    resolve({
                        avgHighPrice: row.avgHighPrice ? Math.round(row.avgHighPrice) : null,
                        avgLowPrice: row.avgLowPrice ? Math.round(row.avgLowPrice) : null,
                        intervalCount: row.intervalCount,
                        totalDataPoints: row.totalDataPoints,
                        highPricePoints: row.highPricePoints,
                        lowPricePoints: row.lowPricePoints
                    });
                }
            });
        });
    }

    async getLatestTimestampForItem(itemId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT MAX(timestamp) as latest FROM price_history WHERE item_id = ?',
                [itemId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row?.latest || null);
                }
            );
        });
    }
}

module.exports = PriceHistoryManager; 