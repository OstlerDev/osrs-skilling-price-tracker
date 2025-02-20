import React from 'react';
import './PriceGrid.css';

interface PriceGridProps {
  baseBoltPrice: number;
  enchantedBoltPrice: number;
  latestBuyPrice: number;
  latestSellPrice: number;
}

export const PriceGrid: React.FC<PriceGridProps> = ({
  baseBoltPrice,
  enchantedBoltPrice,
  latestBuyPrice,
  latestSellPrice
}) => {
  const formatGP = (number: number) => `${number.toLocaleString()}`;

  return (
    <div className="price-grid">
      <div className="price-item">
        <div className="price-label">Base Bolts</div>
        <div className="price-value">{formatGP(baseBoltPrice)}</div>
      </div>
      <div className="price-item">
        <div className="price-label">Enchanted Bolts</div>
        <div className="price-value">{formatGP(enchantedBoltPrice)}</div>
      </div>
      <div className="price-item">
        <div className="price-label">Latest Instant Buy</div>
        <div className="price-value">{formatGP(latestBuyPrice)}</div>
      </div>
      <div className="price-item">
        <div className="price-label">Latest Instant Sell</div>
        <div className="price-value">{formatGP(latestSellPrice)}</div>
      </div>
    </div>
  );
}; 