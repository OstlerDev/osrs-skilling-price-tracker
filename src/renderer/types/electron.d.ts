import { BoltType, EnhancedProfitData } from '../../shared/types';

export {};

declare global {
  interface Window {
    electron: {
      setLimit: (type: BoltType) => void;
      clearLimit: (type: BoltType) => void;
      onProfitUpdate: (callback: (data: { 
        rubyProfit: EnhancedProfitData | null; 
        diamondProfit: EnhancedProfitData | null; 
        lastUpdateTime: number 
      }) => void) => void;
      onUpdatingPrices: (callback: () => void) => void;
      onError: (callback: (error: string) => void) => void;
      removeListeners: () => void;
    };
  }
} 