import React from 'react';
import { PricePoint } from '../../../shared/types';
import { formatGP } from '../../../shared/utils';
import './PriceSummary.css';

interface PriceSummaryProps {
  baseBoltPrices: PricePoint;
  enchantedBoltPrices: PricePoint;
  baseItemId: number;
  enchantedItemId: number;
}

/**
 * PriceSummary - Displays a table of prices with slow buy and instant buy columns
 */
export const PriceSummary: React.FC<PriceSummaryProps> = ({
  baseBoltPrices,
  enchantedBoltPrices,
  baseItemId,
  enchantedItemId
}) => {
  const createPriceTrackerUrl = (itemId: number) => {
    return `https://prices.osrs.cloud/item/${itemId}?utm_source=plugin`;
  };

  const handleRowClick = (itemId: number) => {
    window.open(createPriceTrackerUrl(itemId), '_blank');
  };

  return (
    <table className="price-summary-table">
      <thead>
        <tr>
          <th></th>
          <th>SLOW BUY</th>
          <th>INSTANT BUY</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          className="clickable-row"
          onClick={() => handleRowClick(baseItemId)}
          title={`View price history for base bolts (ID: ${baseItemId})`}
        >
          <td>
            <div className="item-name-with-link">
              Base Bolts
              <span className="link-icon">🔗</span>
            </div>
          </td>
          <td>{formatGP(baseBoltPrices.avgHighPrice)}</td>
          <td>{formatGP(baseBoltPrices.avgLowPrice)}</td>
        </tr>
        <tr 
          className="clickable-row"
          onClick={() => handleRowClick(enchantedItemId)}
          title={`View price history for enchanted bolts (ID: ${enchantedItemId})`}
        >
          <td>
            <div className="item-name-with-link">
              Enchanted
              <span className="link-icon">🔗</span>
            </div>
          </td>
          <td>{formatGP(enchantedBoltPrices.avgHighPrice)}</td>
          <td>{formatGP(enchantedBoltPrices.avgLowPrice)}</td>
        </tr>
      </tbody>
    </table>
  );
}; 