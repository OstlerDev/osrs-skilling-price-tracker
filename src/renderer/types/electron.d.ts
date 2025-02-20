import { BoltType, ProfitData } from '../../shared/types';

export {};

declare global {
  interface Window {
    electron: {
      setLimit: (type: BoltType) => void;
      clearLimit: (type: BoltType) => void;
      onProfitUpdate: (callback: (data: { 
        rubyProfit: ProfitData | null; 
        diamondProfit: ProfitData | null; 
        lastUpdateTime: number 
      }) => void) => void;
      onUpdatingPrices: (callback: () => void) => void;
      onError: (callback: (error: string) => void) => void;
      removeListeners: () => void;
    };
  }
} 