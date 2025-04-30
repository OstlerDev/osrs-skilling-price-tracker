import React from 'react';
import { EnhancedProfitData } from '../../../shared/types';
import { formatGP } from '../../../shared/utils';
import './ProfitScenarios.css';

interface ProfitScenariosProps {
  profitData: EnhancedProfitData;
}

/**
 * ProfitScenarios - Displays profit scenarios in a clean table format
 */
export const ProfitScenarios: React.FC<ProfitScenariosProps> = ({ profitData }) => {
  const scenarios = [
    { 
      name: 'Slow', 
      icon: '🐢',
      perBolt: profitData.slowProfit.profitPerItem,
      total: profitData.slowProfit.profit
    },
    { 
      name: 'Median', 
      icon: '⚖️',
      perBolt: profitData.medianProfit.profitPerItem,
      total: profitData.medianProfit.profit
    },
    { 
      name: 'Instant', 
      icon: '⚡',
      perBolt: profitData.instantProfit.profitPerItem,
      total: profitData.instantProfit.profit
    }
  ];

  return (
    <table className="profit-scenarios-table">
      <thead>
        <tr>
          <th>Strategy</th>
          <th>Per Bolt</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {scenarios.map((scenario, index) => (
          <tr 
            key={scenario.name}
            className={`scenario-row ${scenario.perBolt <= 0 ? 'negative' : ''}`}
          >
            <td className="strategy-cell">
              <span className="strategy-icon">{scenario.icon}</span>
              <span className="strategy-name">{scenario.name}</span>
            </td>
            <td className="per-bolt-cell">
              {formatGP(scenario.perBolt)}
            </td>
            <td className="total-cell">
              {formatGP(scenario.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}; 