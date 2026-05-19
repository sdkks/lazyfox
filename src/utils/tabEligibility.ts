import type { LazyFoxConfig } from '../config';
import type { RabbitScent, DenEntry } from '../types';

const RESTRICTED_PROTOCOLS = [
  'chrome:',
  'chrome-extension:',
  'about:',
  'edge:',
  'moz-extension:',
  'file:',
  'javascript:',
  'data:',
];

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  active: boolean;
  audible?: boolean;
  pinned: boolean;
  status?: string;
  discarded: boolean;
}

export interface EligibilityState {
  rabbitScents: Record<string, RabbitScent>;
  activity: Record<number, { lastActive: number }>;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function isEligible(
  tab: TabInfo,
  config: LazyFoxConfig,
  state: EligibilityState
): EligibilityResult {
  if (tab.id === undefined) {
    return { eligible: false, reason: 'No tab ID' };
  }

  if (!tab.url || tab.url === '') {
    return { eligible: false, reason: 'No URL' };
  }

  if (tab.url.includes('sleeping.html')) {
    return { eligible: false, reason: 'Already sleeping' };
  }

  if (tab.discarded) {
    return { eligible: false, reason: 'Already discarded' };
  }

  const protocol = new URL(tab.url).protocol;
  if (RESTRICTED_PROTOCOLS.includes(protocol)) {
    return { eligible: false, reason: `Restricted protocol: ${protocol}` };
  }

  if (tab.active) {
    return { eligible: false, reason: 'Tab is active' };
  }

  if (config.preservePinnedTabs && tab.pinned) {
    return { eligible: false, reason: 'Pinned tab preserved' };
  }

  if (!config.sleepAudibleTabs && tab.audible === true) {
    return { eligible: false, reason: 'Tab is playing audio' };
  }

  if (!config.sleepLoadingTabs && tab.status === 'loading') {
    return { eligible: false, reason: 'Tab is loading' };
  }

  const activity = state.activity[tab.id];
  if (activity) {
    const inactiveMs = Date.now() - activity.lastActive;
    const timeoutMs = config.sleepTimeoutMinutes * 60 * 1000;
    if (inactiveMs < timeoutMs) {
      return { eligible: false, reason: 'Within timeout threshold' };
    }
  }

  const uuid = generateUUID(tab.url);
  if (isInDen(tab.url, config.den)) {
    return { eligible: false, reason: 'URL in den' };
  }

  if (hasActiveRabbitScent(uuid, state.rabbitScents)) {
    return { eligible: false, reason: 'Active rabbit scent' };
  }

  return { eligible: true };
}

function generateUUID(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function isInDen(url: string, den: DenEntry[]): boolean {
  return den.some((entry) => matchesPattern(url, entry));
}

export function matchesPattern(url: string, entry: DenEntry): boolean {
  switch (entry.type) {
    case 'exact':
      return url === entry.pattern;
    case 'domain':
      try {
        const hostname = new URL(url).hostname;
        return hostname === entry.pattern || hostname.endsWith('.' + entry.pattern);
      } catch {
        return false;
      }
    case 'wildcard':
      return wildcardMatch(url, entry.pattern);
  }
}

function wildcardMatch(str: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
  );
  return regex.test(str);
}

function hasActiveRabbitScent(uuid: string, shots: Record<string, RabbitScent>): boolean {
  const shot = shots[uuid];
  if (!shot) return false;
  return shot.expiresAt > Date.now();
}

export { generateUUID };
