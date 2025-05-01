import React from 'react';
import { formatGP } from '../../../shared/utils';
import { PricePoint } from '../../../shared/types';
import './PriceGrid.css';

interface PriceGridProps {
  baseBoltPrices: PricePoint;
  enchantedBoltPrices: PricePoint;
}

export const PriceGrid: React.FC<PriceGridProps> = ({
  baseBoltPrices,
  enchantedBoltPrices
}) => {
  return (
    <table className="price-table">
      <thead>
        <tr>
          <th>Item Type</th>
          <th>Instant Buy Price</th>
          <th>Instant Sell Price</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Bolts</td>
          <td>{formatGP(baseBoltPrices.avgHighPrice)}</td>
          <td>{formatGP(baseBoltPrices.avgLowPrice)}</td>
        </tr>
        <tr>
          <td>Enchanted Bolts</td>
          <td>{formatGP(enchantedBoltPrices.avgHighPrice)}</td>
          <td>{formatGP(enchantedBoltPrices.avgLowPrice)}</td>
        </tr>
      </tbody>
    </table>
  );
}; 