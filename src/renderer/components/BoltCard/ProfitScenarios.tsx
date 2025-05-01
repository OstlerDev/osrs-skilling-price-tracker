import React from 'react';
import { Tooltip } from '@mui/material';
import { EnhancedProfitData } from '../../../shared/types';
import { formatGP } from '../../../shared/utils';
import { ProfitBreakdown } from './ProfitBreakdown';
import { BOLT_CONFIGS } from '../../../shared/constants';
import './ProfitScenarios.css';

interface ProfitScenariosProps {
  profitData: EnhancedProfitData;
}

/**
 * ProfitScenarios - Displays profit scenarios in a clean table format
 * Now with tooltip hover functionality showing detailed breakdown
 */
export const ProfitScenarios: React.FC<ProfitScenariosProps> = ({ profitData }) => {
  // Use 10k as default batch size but ruby/diamond are both 11k
  // We'll default to 11000 since that's what the codebase uses
  const batchSize = 11000;

  const scenarios = [
    { 
      name: 'Slow', 
      icon: '🐢',
      perBolt: profitData.slowProfit.profitPerItem,
      total: profitData.slowProfit.profit,
      profitCalc: profitData.slowProfit
    },
    { 
      name: 'Median', 
      icon: '⚖️',
      perBolt: profitData.medianProfit.profitPerItem,
      total: profitData.medianProfit.profit,
      profitCalc: profitData.medianProfit
    },
    { 
      name: 'Instant', 
      icon: '⚡',
      perBolt: profitData.instantProfit.profitPerItem,
      total: profitData.instantProfit.profit,
      profitCalc: profitData.instantProfit
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
        {scenarios.map((scenario) => (
          <Tooltip 
            key={scenario.name}
            title={
              <ProfitBreakdown 
                name={scenario.name}
                icon={scenario.icon}
                profitCalc={scenario.profitCalc}
                batchSize={batchSize}
                runes={profitData.runes}
              />
            }
            arrow
            placement="right"
            enterDelay={500}
            leaveDelay={200}
          >
            <tr 
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
          </Tooltip>
        ))}
      </tbody>
    </table>
  );
}; 