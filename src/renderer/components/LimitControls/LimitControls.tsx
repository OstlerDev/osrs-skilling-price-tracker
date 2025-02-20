import React, { useEffect, useState } from 'react';
import { BoltType } from '../../../shared/types';
import { formatTimeRemaining } from '../../../shared/utils';
import './LimitControls.css';

interface LimitControlsProps {
  type: BoltType;
  limitReached: boolean;
  resetTime: number | null;
  onSetLimit: (type: BoltType) => void;
  onClearLimit: (type: BoltType) => void;
}

export const LimitControls: React.FC<LimitControlsProps> = ({
  type,
  limitReached,
  resetTime,
  onSetLimit,
  onClearLimit
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (limitReached && resetTime) {
      interval = setInterval(() => {
        const remaining = resetTime - Date.now();
        if (remaining <= 0) {
          setTimeRemaining('');
          if (interval) clearInterval(interval);
          return;
        }

        setTimeRemaining(formatTimeRemaining(resetTime));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [limitReached, resetTime]);

  return (
    <div className="limit-section">
      <button
        className="limit-button"
        onClick={() => onSetLimit(type)}
        disabled={limitReached}
      >
        Set Purchase Limit
      </button>
      <button
        className="limit-button clear"
        onClick={() => onClearLimit(type)}
        style={{ display: limitReached ? 'inline-block' : 'none' }}
      >
        Clear Limit
      </button>
      <div className="limit-timer">{timeRemaining}</div>
    </div>
  );
}; 