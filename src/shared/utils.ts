export const formatGP = (number: number): string => {
  return `${number.toLocaleString()} GP`;
};

export const formatTimeRemaining = (resetTime: number): string => {
  const remaining = resetTime - Date.now();
  if (remaining <= 0) return '';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  
  return `Available in ${hours || ''}${hours > 0 ? 'h ' : ''}${minutes || ''}${
    minutes > 0 ? 'm ' : ''
  }${seconds}s`;
}; 