interface PriceResponse {
    data: {
        [key: string]: {
            high: number;
            low: number;
            highTime: number;
            lowTime: number;
        };
    };
}

export class OSRSPriceAPI {
    private baseUrl = 'https://prices.runescape.wiki/api/v1/osrs';

    async getLatestPrice(itemId: number): Promise<PriceResponse> {
        const response = await fetch(`${this.baseUrl}/latest?id=${itemId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async getHistoricalData(itemId: number, timestep: string): Promise<PriceResponse> {
        const response = await fetch(`${this.baseUrl}/timeseries?id=${itemId}&timestep=${timestep}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
} 