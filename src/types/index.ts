import type { LazyFoxConfig } from '../config';

export interface StoredTabInfo {
  uuid: string;
  url: string;
  title: string;
  faviconUrl?: string;
  windowId: number;
  index: number;
  isPinned: boolean;
  isMuted: boolean;
  sleepTimestamp: number;
}

export interface DenEntry {
  id: string;
  pattern: string;
  type: 'exact' | 'domain' | 'wildcard';
  createdAt: number;
}

export interface RabbitScent {
  uuid: string;
  tabId: number;
  expiresAt: number;
  alarmName: string;
}

export interface TabSummary {
  id: number;
  title: string;
  url: string;
  favIconUrl: string | undefined;
  active: boolean;
  audible: boolean;
  pinned: boolean;
  discarded: boolean;
}

export type OutgoingMessage =
  | { action: 'sleepCurrentTab' }
  | { action: 'sleepAllTabs' }
  | { action: 'wakeAllTabs' }
  | { action: 'wakeTab'; uuid: string }
  | { action: 'getConfig' }
  | { action: 'saveConfig'; config: Partial<LazyFoxConfig> }
  | { action: 'addDenEntry'; entry: Omit<DenEntry, 'id' | 'createdAt'> }
  | { action: 'removeDenEntry'; id: string }
  | { action: 'giveRabbitScent'; tabId: number }
  | { action: 'removeRabbitScent'; uuid: string }
  | { action: 'getTabInfo'; uuid: string }
  | { action: 'getSleepingTabCount' }
  | { action: 'getAllTabs' };

export type IncomingResponse =
  | { action: 'configData'; data: LazyFoxConfig }
  | { action: 'tabInfoData'; data: StoredTabInfo | null }
  | { action: 'sleepingTabCount'; count: number }
  | { action: 'allTabsData'; tabs: TabSummary[] }
  | { action: 'ack'; success: boolean; error?: string };
