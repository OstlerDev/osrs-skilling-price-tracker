import sqlite3 from 'sqlite3';
import { Logger } from './Logger';
import { PriceData, HistoricalPriceData, ProfitHistoryData, PricePoint } from './shared/types';
import { OSRSPriceAPI } from './OSRSPriceAPI';

export class PriceHistoryManager {
    private db: sqlite3.Database;
    private itemId: number;
    private logger: Logger;
    public lastUpdated: number = 0;

    constructor(itemId: number, logger: Logger) {
        this.itemId = itemId;
        this.logger = logger;
        this.db = new sqlite3.Database('price_history.db', (err) => {
            if (err) {
                this.logger.error('Error opening database:', err);
            } else {
                this.logger.info('Connected to price history database');
                this.db.run('PRAGMA journal_mode = WAL');  // Enable Write-Ahead Logging
                this.db.run('PRAGMA busy_timeout = 5000'); // Set busy timeout to 5 seconds
                this.initializeDatabase();
            }
        });
    }

    private initializeDatabase(): void {
        this.db.serialize(() => {
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

    async getLatestPrice(): Promise<PricePoint | null> {
        console.log(`Fetching latest price for item ${this.itemId}`);
        try {
            const result: any = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT high_price as avgHighPrice, low_price as avgLowPrice FROM price_history WHERE item_id = ? ORDER BY timestamp DESC LIMIT 1',
                    [this.itemId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (!result) return null;

            console.log(`Latest price for item ${this.itemId}:`, result);
            console.log(`Avg high price: ${result.avgHighPrice}`);
            console.log(`Avg low price: ${result.avgLowPrice}`);
            
            return {
                avgHighPrice: result.avgHighPrice || 0,
                avgLowPrice: result.avgLowPrice || 0
            };
        } catch (error) {
            this.logger.error(`Failed to get latest price for item ${this.itemId}:`, error);
            return null;
        }
    }

    public async recordPrice(priceData: PriceData): Promise<void> {
        console.log(`Recording price data for item ${this.itemId}`);
        console.log(`Price data: ${JSON.stringify(priceData)}`);
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO price_history 
                (item_id, timestamp, high_price, low_price, high_volume, low_volume, time_step)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                this.itemId,
                Date.now(),
                priceData.highPrice || 0,
                priceData.lowPrice || 0,
                priceData.highVolume || 0,
                priceData.lowVolume || 0,
                '5m'
            ], (err) => {
                if (err) {
                    this.logger.error('Error recording price data:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async recordProfit(profitData: ProfitHistoryData): Promise<void> {
        console.log(`Recording profit data for item ${this.itemId}`);
        console.log(`Profit data: ${JSON.stringify(profitData)}`);
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO profit_history 
                (timestamp, profit, profit_per_bolt, regular_bolt_price, enchanted_bolt_price, runes_cost)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                Date.now(),
                profitData.profit,
                profitData.profit_per_bolt,
                profitData.regular_bolt_price,
                profitData.enchanted_bolt_price,
                profitData.runes_cost
            ], (err) => {
                if (err) {
                    this.logger.error('Error recording profit data:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async loadHistoricalData(timeSteps: string[]): Promise<void> {
        console.log(`Loading historical data for item ${this.itemId}`);
        try {
            const api = new OSRSPriceAPI();
            
            for (const timeStep of timeSteps) {
                const data = await api.getHistoricalData(this.itemId, timeStep);
                if (!data || !data.data) continue;

                // Batch insert historical prices
                await new Promise<void>((resolve, reject) => {
                    const stmt = this.db.prepare(`
                        INSERT OR REPLACE INTO price_history 
                        (item_id, timestamp, high_price, low_price, high_volume, low_volume, time_step)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);

                    for (const entry of Object.values(data.data)) {
                        stmt.run(
                            this.itemId,
                            entry.highTime,
                            entry.high || 0,
                            entry.low || 0,
                            timeStep
                        );
                    }

                    stmt.finalize((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                
                this.logger.info(`Loaded historical data for ${timeStep} timestep`);
            }
        } catch (error) {
            this.logger.error(`Failed to load historical data for item ${this.itemId}:`, error);
            throw error;
        }
    }

    async getRecentDataPoints(timeframe: number): Promise<number> {
        try {
            const result: any = await new Promise((resolve, reject) => {
                this.db.get(
                    'SELECT COUNT(*) as count FROM price_history WHERE item_id = ? AND timestamp > ?',
                    [this.itemId, Date.now() - timeframe],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            return result?.count || 0;
        } catch (error) {
            this.logger.error(`Failed to get recent data points for item ${this.itemId}:`, error);
            return 0;
        }
    }

    close(): void {
        this.db.close((err) => {
            if (err) {
                this.logger.error('Error closing database:', err);
            }
        });
    }
} 