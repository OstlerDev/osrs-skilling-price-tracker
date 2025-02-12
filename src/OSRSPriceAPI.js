const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DEFAULT_USER_AGENT = 'bolt-enchanting-profit-tracker - github:ostlerdev';


class OSRSPriceAPI {
    constructor(userAgent = DEFAULT_USER_AGENT) {
        this.BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';
        this.USER_AGENT = userAgent;
    }

    async fetchTimeSeries(itemId, timeStep) {
        try {
            const response = await fetch(
                `${this.BASE_URL}/timeseries?timestep=${timeStep}&id=${itemId}`,
                {
                    headers: {
                        'User-Agent': this.USER_AGENT
                    }
                }
            );
            const data = await response.json();
            return data?.data || null;
        } catch (error) {
            console.error(`Error fetching ${timeStep} time series for item ${itemId}:`, error);
            return null;
        }
    }

    async getLatestPrices(itemId) {
        try {
            const response = await fetch(`${this.BASE_URL}/latest?id=${itemId}`, {
                headers: {
                    'User-Agent': this.USER_AGENT
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data[itemId];
        } catch (error) {
            throw new Error(`Failed to fetch latest prices: ${error.message}`);
        }
    }

    async getAveragePrices(itemId, timeStep = '1h') {
        try {
            const timeSeriesData = await this.fetchTimeSeries(itemId, timeStep);
            
            if (!timeSeriesData || timeSeriesData.length === 0) {
                return null;
            }

            // Calculate averages from the last 24 data points (or all if less than 24)
            const dataPoints = timeSeriesData.slice(-24);
            const avgHigh = dataPoints.reduce((sum, point) => sum + point.avgHighPrice, 0) / dataPoints.length;
            const avgLow = dataPoints.reduce((sum, point) => sum + point.avgLowPrice, 0) / dataPoints.length;

            return {
                avgHighPrice: Math.round(avgHigh),
                avgLowPrice: Math.round(avgLow)
            };
        } catch (error) {
            console.error(`Error calculating average prices for item ${itemId}:`, error);
            return null;
        }
    }
}

module.exports = OSRSPriceAPI; 