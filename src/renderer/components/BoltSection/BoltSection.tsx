import React from 'react';
import { PriceGrid } from '../PriceGrid/PriceGrid';
import { LimitControls } from '../LimitControls/LimitControls';
import { BoltType, EnhancedProfitData } from '../../../shared/types';
import './BoltSection.css';

interface BoltSectionProps {
  type: BoltType;
  profitData?: EnhancedProfitData;
  targetMargin: number;
  onSetLimit: (type: BoltType) => void;
  onClearLimit: (type: BoltType) => void;
}

export const BoltSection: React.FC<BoltSectionProps> = ({ 
  type, 
  profitData, 
  targetMargin,
  onSetLimit,
  onClearLimit 
}) => {
  const title = type === 'ruby' ? 'Ruby Dragon Bolts' : 'Diamond Dragon Bolts';
  
  const getProfitClass = () => {
    if (!profitData) return '';
    // Use median profit for coloring
    if (profitData.medianProfit.profitPerItem >= targetMargin) return 'profit';
    if (profitData.medianProfit.profitPerItem > 0) return 'neutral';
    return 'loss';
  };

  const formatGP = (number: number) => `${number.toLocaleString()} GP`;

  return (
    <div className={`bolt-section ${getProfitClass()} ${profitData?.limitReached ? 'limit-reached' : ''}`}>
      <h2>{title}</h2>
      {profitData ? (
        <>
          <div className="profit-sections">
            
            <div className="profit-section slow">
              <h3>Slow Profit</h3>
              <div className="profit-info">
                Total: {formatGP(profitData.slowProfit.profit)}
              </div>
              <div className="profit-info">
                Per bolt: {formatGP(profitData.slowProfit.profitPerItem)}
              </div>
            </div>

            <div className="profit-section median">
              <h3>Median Profit</h3>
              <div className="profit-info">
                Total: {formatGP(profitData.medianProfit.profit)}
              </div>
              <div className="profit-info">
                Per bolt: {formatGP(profitData.medianProfit.profitPerItem)}
              </div>
            </div>
          </div>

          <div className="profit-section instant">
            <h3>Instant Profit</h3>
            <div className="profit-info">
              Total: {formatGP(profitData.instantProfit.profit)}
            </div>
            <div className="profit-info">
              Per bolt: {formatGP(profitData.instantProfit.profitPerItem)}
            </div>
          </div>
          
          <PriceGrid
            baseBoltPrices={profitData.baseBoltPrices}
            enchantedBoltPrices={profitData.enchantedBoltPrices}
          />

          <div className="materials">
            Materials: {profitData.runes.map(rune => 
              `${rune.quantity}x ${rune.name} (${formatGP(rune.price)})`
            ).join(', ')}
          </div>

          <LimitControls
            type={type}
            limitReached={profitData.limitReached}
            resetTime={profitData.resetTime}
            onSetLimit={onSetLimit}
            onClearLimit={onClearLimit}
          />
        </>
      ) : (
        <div className="profit-info">Calculating...</div>
      )}
    </div>
  );
}; 