import type { LazyFoxConfig } from '../config';
import type { RabbitScent, StoredTabInfo } from '../types';
import { storage } from 'wxt/utils/storage';

export const configStorage = storage.defineItem<LazyFoxConfig>('sync:lazyfoxConfig', {
  fallback: {
    sleepTimeoutMinutes: 60,
    sleepMode: 'full',
    rabbitScentDurationMinutes: 60,
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

export const rabbitScentsStorage = storage.defineItem<Record<string, RabbitScent>>(
  'local:rabbitScents',
  { fallback: {} }
);

export const activityStorage = storage.defineItem<Record<number, { lastActive: number }>>(
  'local:tabActivity',
  { fallback: {} }
);

export const activeScentState = storage.defineItem<{
  tabId: number | null;
  uuid: string | null;
  expiresAt: number | null;
}>('session:activeScentState', { fallback: { tabId: null, uuid: null, expiresAt: null } });
