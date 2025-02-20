import React from 'react';
import './LastUpdated.css';

interface LastUpdatedProps {
  timestamp: number | null;
  isUpdating: boolean;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ timestamp, isUpdating }) => {
  const formatTimestamp = (time: number) => {
    return new Date(time).toLocaleTimeString();
  };

  return (
    <div className="last-updated">
      <span className={`refresh-indicator ${isUpdating ? 'updating' : ''}`} />
      <span>
        {isUpdating 
          ? 'Updating prices...' 
          : timestamp 
            ? `Last updated: ${formatTimestamp(timestamp)}` 
            : 'Checking...'}
      </span>
    </div>
  );
}; 