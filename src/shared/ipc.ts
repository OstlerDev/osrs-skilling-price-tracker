import { LimitData, ProfitData } from "./types";

import { BoltType } from "./types";

export const IPC_CHANNELS = {
  SET_PURCHASE_LIMIT: 'set-purchase-limit',
  CLEAR_PURCHASE_LIMIT: 'clear-purchase-limit',
  PRICE_UPDATE: 'price-update',
  LIMIT_UPDATE: 'limit-update'
} as const;

export interface IPCEvents {
  'set-purchase-limit': BoltType;
  'clear-purchase-limit': BoltType;
  'price-update': {
    type: BoltType;
    data: ProfitData;
  };
  'limit-update': {
    type: BoltType;
    data: LimitData;
  };
} 