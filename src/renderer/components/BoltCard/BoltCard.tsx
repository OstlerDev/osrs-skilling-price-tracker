import React from 'react';
import { BoltType, EnhancedProfitData } from '../../../shared/types';
import { LimitControls } from '../LimitControls/LimitControls';
import { formatGP } from '../../../shared/utils';
import { PriceSummary } from './PriceSummary';
import { ProfitScenarios } from './ProfitScenarios';
import { BOLT_CONFIGS } from '../../../shared/constants';
import './BoltCard.css';

// Types
interface BoltCardProps {
  type: BoltType;
  profitData?: EnhancedProfitData;
  targetMargin: number;
  onSetLimit: (type: BoltType) => void;
  onClearLimit: (type: BoltType) => void;
}

/**
 * BoltCard - An improved UI component for displaying bolt enchanting profit information
 */
export const BoltCard: React.FC<BoltCardProps> = ({
  type,
  profitData,
  targetMargin,
  onSetLimit,
  onClearLimit
}) => {
  // Constants
  const title = type === 'ruby' ? 'Ruby Dragon Bolts' : 'Diamond Dragon Bolts';
  const boltConfig = BOLT_CONFIGS[type];
  
  // Helper Functions
  const getProfitClass = () => {
    if (!profitData) return '';
    // Use median profit for coloring
    if (profitData.medianProfit.profitPerItem >= targetMargin) return 'profit';
    if (profitData.medianProfit.profitPerItem > 0) return 'neutral';
    return 'loss';
  };

  // Get the most profitable strategy based on per-item profit
  const getRecommendedStrategy = () => {
    if (!profitData) return null;
    
    const strategies = [
      { name: 'Slow', profit: profitData.slowProfit.profitPerItem },
      { name: 'Median', profit: profitData.medianProfit.profitPerItem },
      { name: 'Instant', profit: profitData.instantProfit.profitPerItem }
    ];
    
    return strategies.reduce((best, current) => 
      current.profit > best.profit ? current : best, strategies[0]);
  };

  const recommendedStrategy = getRecommendedStrategy();

  return (
    <div className={`bolt-card ${getProfitClass()} ${profitData?.limitReached ? 'limit-reached' : ''}`}>
      {/* Card Header */}
      <div className="bolt-card-header">
        <h2>{title}</h2>
        <span 
          className="info-icon" 
          title="SLOW BUY: Higher price but slower transactions. INSTANT BUY: Lower price but immediate transactions. GE Tax: 1% on sales for items over 100gp. Click on any item row to view its price history."
        >
          ℹ️
        </span>
      </div>
      
      {profitData ? (
        <>
          {/* Recommendation Banner */}
          {recommendedStrategy && recommendedStrategy.profit > 0 && (
            <div className="recommendation-banner">
              <span className="star-icon">⭐</span>
              <span className="recommendation-text">
                RECOMMENDED: {recommendedStrategy.name} Profit ({formatGP(recommendedStrategy.profit)}/bolt)
              </span>
            </div>
          )}

          {/* Content Wrapper */}
          <div className="card-content">
            {/* Price Summary Section */}
            <div className="section price-summary-section">
              <h3 className="section-header">
                <span className="section-icon">📊</span>
                PRICE SUMMARY
              </h3>
              <PriceSummary 
                baseBoltPrices={profitData.baseBoltPrices}
                enchantedBoltPrices={profitData.enchantedBoltPrices}
                baseItemId={boltConfig.baseItemId}
                enchantedItemId={boltConfig.enchantedItemId}
              />
            </div>

            {/* Profit Scenarios Section */}
            <div className="section profit-scenarios-section">
              <h3 className="section-header">
                <span className="section-icon">📈</span>
                PROFIT SCENARIOS
              </h3>
              <ProfitScenarios profitData={profitData} />
            </div>

            {/* Materials Section */}
            <div className="section materials-section">
              <h3 className="section-header">
                <span className="section-icon">🧪</span>
                MATERIALS
              </h3>
              <div className="materials-content">
                {profitData.runes.map(rune => `${rune.quantity}x ${rune.name}`).join(', ')}
              </div>
            </div>

            {/* Limit Controls */}
            <div className="limit-controls-container">
              <LimitControls
                type={type}
                limitReached={profitData.limitReached}
                resetTime={profitData.resetTime}
                onSetLimit={onSetLimit}
                onClearLimit={onClearLimit}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="calculating-message">Calculating...</div>
      )}
    </div>
  );
}; 