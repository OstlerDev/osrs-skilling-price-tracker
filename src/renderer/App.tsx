import React from 'react';
import { BoltCard } from './components/BoltCard';
import { LastUpdated } from './components/LastUpdated/LastUpdated';
import { useBoltData } from './hooks/useBoltData';
import './styles/global.css';

const App: React.FC = () => {
  const {
    rubyProfit,
    diamondProfit,
    lastUpdateTime,
    isUpdating,
    setLimit,
    clearLimit
  } = useBoltData();

  return (
    <div className="app-container">
      <LastUpdated timestamp={lastUpdateTime} isUpdating={isUpdating} />
      <div className="bolt-container">
        <BoltCard
          type="ruby"
          profitData={rubyProfit || undefined}
          targetMargin={75}
          onSetLimit={setLimit}
          onClearLimit={clearLimit}
        />
        <BoltCard
          type="diamond"
          profitData={diamondProfit || undefined}
          targetMargin={75}
          onSetLimit={setLimit}
          onClearLimit={clearLimit}
        />
      </div>
    </div>
  );
};

export default App; 