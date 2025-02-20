import React from 'react';
import { PriceGrid } from '../PriceGrid/PriceGrid';
import { LimitControls } from '../LimitControls/LimitControls';
import { BoltType, ProfitData } from '../../../shared/types';
import './BoltSection.css';

interface BoltSectionProps {
  type: BoltType;
  profitData?: ProfitData;
  targetMargin: number;
  onSetLimit: (type: BoltType) => void;
  onClearLimit: (type: BoltType) => void;
}

export const BoltSection: React.FC<BoltSectionProps> = ({ type, profitData, targetMargin, onSetLimit, onClearLimit }) => {
  const title = type === 'ruby' ? 'Ruby Dragon Bolts' : 'Diamond Dragon Bolts';
  
  const getProfitClass = () => {
    if (!profitData) return '';
    if (profitData.profitPerItem >= targetMargin) return 'profit';
    if (profitData.profitPerItem > 0) return 'neutral';
    return 'loss';
  };

  const formatGP = (number: number) => `${number.toLocaleString()} GP`;

  return (
    <div className={`bolt-section ${getProfitClass()} ${profitData?.limitReached ? 'limit-reached' : ''}`}>
      <h2>{title}</h2>
      {profitData ? (
        <>
          <div className="profit-info total-profit">
            Profit: {formatGP(profitData.profit)}
          </div>
          <div className="profit-info per-item">
            Profit per bolt: {formatGP(profitData.profitPerItem)}
          </div>
          
          <PriceGrid
            baseBoltPrice={profitData.baseBoltPrice}
            enchantedBoltPrice={profitData.enchantedBoltPrice}
            latestBuyPrice={profitData.latestBuyPrice}
            latestSellPrice={profitData.latestSellPrice}
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