import React from 'react';
import { BoltSection } from './components/BoltSection/BoltSection';
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
        <BoltSection
          type="ruby"
          profitData={rubyProfit || undefined}
          targetMargin={75}
          onSetLimit={setLimit}
          onClearLimit={clearLimit}
        />
        <BoltSection
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