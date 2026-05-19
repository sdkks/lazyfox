import type { LazyFoxConfig } from '../config';
import type { AmphetamineShot, StoredTabInfo } from '../types';
import { storage } from 'wxt/utils/storage';

export const configStorage = storage.defineItem<LazyFoxConfig>('sync:lazyfoxConfig', {
  fallback: {
    sleepTimeoutMinutes: 60,
    sleepMode: 'full',
    amphetamineDurationMinutes: 60,
    den: [],
    preservePinnedTabs: true,
    sleepAudibleTabs: false,
    sleepLoadingTabs: false,
    autoRestore: true,
    checkIntervalSeconds: 15,
  },
});

export const sleepingTabsStorage = storage.defineItem<Record<string, StoredTabInfo>>(
  'local:sleepingTabs',
  { fallback: {} }
);

export const amphetamineShotsStorage = storage.defineItem<Record<string, AmphetamineShot>>(
  'local:amphetamineShots',
  { fallback: {} }
);

export const activityStorage = storage.defineItem<Record<number, { lastActive: number }>>(
  'local:tabActivity',
  { fallback: {} }
);
