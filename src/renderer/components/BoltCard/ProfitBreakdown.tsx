import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { ProfitCalculation, RuneInfo } from '../../../shared/types';
import { formatGP } from '../../../shared/utils';
import { GE_TAX_RATE, GE_TAX_THRESHOLD } from '../../../shared/constants';

interface ProfitBreakdownProps {
  name: string;
  icon: string;
  profitCalc: ProfitCalculation;
  batchSize: number;
  runes: RuneInfo[];
}

/**
 * Simple component to display a profit breakdown for a specific strategy
 */
export const ProfitBreakdown: React.FC<ProfitBreakdownProps> = ({
  name,
  icon,
  profitCalc,
  batchSize,
  runes
}) => {
  // Calculate total costs and revenues
  const baseBoltCost = profitCalc.buyPrice * batchSize;
  const runesCost = runes.reduce((total, rune) => total + (rune.price * rune.quantity), 0);
  const totalCost = baseBoltCost + runesCost;
  
  const enchantedBoltRevenue = profitCalc.sellPrice * batchSize;
  const showTax = profitCalc.sellPrice > GE_TAX_THRESHOLD;
  const taxAmount = showTax ? enchantedBoltRevenue * GE_TAX_RATE : 0;
  const netRevenue = enchantedBoltRevenue - taxAmount;
  
  return (
    <Box sx={{ minWidth: '250px' }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon} {name} Strategy
      </Typography>
      
      <Divider sx={{ my: 1 }} />
      
      <Typography variant="body2" sx={{ mb: 0.5 }}>Costs:</Typography>
      <Typography variant="body1">
        Base Bolts: {formatGP(profitCalc.buyPrice)} × {batchSize} = {formatGP(baseBoltCost)}
      </Typography>
      <Typography variant="body1">
        Runes: {formatGP(runesCost)}
      </Typography>
      
      <Divider sx={{ my: 1 }} />
      
      <Typography variant="body2" sx={{ mb: 0.5 }}>Revenue:</Typography>
      <Typography variant="body1">
        Enchanted Bolts: {formatGP(profitCalc.sellPrice)} × {batchSize} = {formatGP(enchantedBoltRevenue)}
      </Typography>
      {showTax && (
        <Typography variant="body1" color="error">
          GE Tax (1%): -{formatGP(taxAmount)}
        </Typography>
      )}
      
      <Divider sx={{ my: 1 }} />
      
      <Typography variant="body1" fontWeight="bold">
        Total Cost: {formatGP(totalCost)}
      </Typography>
      <Typography variant="body1" fontWeight="bold">
        Total Revenue: {formatGP(netRevenue)}
      </Typography>
      
      <Divider sx={{ my: 1 }} />
      
      <Typography variant="body1" fontWeight="bold" color={profitCalc.profit <= 0 ? 'secondary.main' : 'primary.main'}>
        Profit: {formatGP(profitCalc.profit)} ({formatGP(profitCalc.profitPerItem)} per bolt)
      </Typography>
    </Box>
  );
}; 