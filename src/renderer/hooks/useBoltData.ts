import { useEffect, useState } from 'react';
import { BoltType, ProfitData } from '../../shared/types';

interface BoltDataState {
  rubyProfit: ProfitData | null;
  diamondProfit: ProfitData | null;
  lastUpdateTime: number | null;
  isUpdating: boolean;
  error: string | null;
}

export function useBoltData() {
  const [state, setState] = useState<BoltDataState>({
    rubyProfit: null,
    diamondProfit: null,
    lastUpdateTime: null,
    isUpdating: false,
    error: null
  });

  useEffect(() => {
    if (!window.electron) {
      console.error('Electron API not found');
      setState(prev => ({ ...prev, error: 'Electron API not available' }));
      return;
    }

    const handleProfitUpdate = (data: {
      rubyProfit: ProfitData | null;
      diamondProfit: ProfitData | null;
      lastUpdateTime: number;
    }) => {
      setState(prev => ({
        ...prev,
        rubyProfit: data.rubyProfit,
        diamondProfit: data.diamondProfit,
        lastUpdateTime: data.lastUpdateTime,
        isUpdating: false,
        error: null
      }));
    };

    const handleUpdatingPrices = () => {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));
    };

    const handleError = (error: string) => {
      setState(prev => ({ ...prev, isUpdating: false, error }));
    };

    window.electron.onProfitUpdate(handleProfitUpdate);
    window.electron.onUpdatingPrices(handleUpdatingPrices);
    window.electron.onError(handleError);

    return () => {
      window.electron.removeListeners();
    };
  }, []);

  const setLimit = (boltType: BoltType) => {
    try {
      window.electron.setLimit(boltType);
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to set limit: ${error.message}` 
      }));
    }
  };

  const clearLimit = (boltType: BoltType) => {
    try {
      window.electron.clearLimit(boltType);
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to clear limit: ${error.message}` 
      }));
    }
  };

  return {
    ...state,
    setLimit,
    clearLimit
  };
} 