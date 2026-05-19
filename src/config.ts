export interface LazyFoxConfig {
  sleepTimeoutMinutes: number;
  sleepMode: 'full' | 'discardOnly';
  amphetamineDurationMinutes: number;
  den: DenEntry[];
  preservePinnedTabs: boolean;
  sleepAudibleTabs: boolean;
  sleepLoadingTabs: boolean;
  autoRestore: boolean;
  checkIntervalSeconds: number;
}

import type { DenEntry } from './types';

export const DEFAULT_CONFIG: LazyFoxConfig = {
  sleepTimeoutMinutes: 60,
  sleepMode: 'full',
  amphetamineDurationMinutes: 60,
  den: [],
  preservePinnedTabs: true,
  sleepAudibleTabs: false,
  sleepLoadingTabs: false,
  autoRestore: true,
  checkIntervalSeconds: 15,
};
