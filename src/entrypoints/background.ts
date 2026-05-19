import type { OutgoingMessage, StoredTabInfo, TabSummary } from '../types';
import { DEFAULT_CONFIG } from '../config';
import {
  registerCheckAlarm,
  registerRabbitScentAlarm,
  clearRabbitScentAlarm,
} from '../utils/alarms';
import { createLogger } from '../utils/logger';
import {
  configStorage,
  sleepingTabsStorage,
  rabbitScentsStorage,
  activityStorage,
} from '../utils/storage';
import { isEligible, generateUUID } from '../utils/tabEligibility';

const log = createLogger('background');

export default defineBackground(() => {
  log.info('LazyFox background service worker started');

  browser.runtime.onInstalled.addListener(async () => {
    const existing = await configStorage.getValue();
    if (existing.sleepTimeoutMinutes === undefined) {
      await configStorage.setValue(DEFAULT_CONFIG);
      log.info('Default config initialized');
    }
    const config = await configStorage.getValue();
    registerCheckAlarm(config.checkIntervalSeconds);
  });

  browser.runtime.onStartup.addListener(async () => {
    const config = await configStorage.getValue();
    registerCheckAlarm(config.checkIntervalSeconds);
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkTabs') {
      await handleCheckTabs();
      return;
    }
    if (alarm.name.startsWith('rabbitScent_')) {
      const uuid = alarm.name.slice('rabbitScent_'.length);
      const shots = await rabbitScentsStorage.getValue();
      delete shots[uuid];
      await rabbitScentsStorage.setValue(shots);
      log.info('Rabbit scent expired', { uuid });
    }
  });

  browser.runtime.onMessage.addListener((message: OutgoingMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse, (err: unknown) => {
      log.error('Message handler error', err);
      sendResponse({ action: 'ack', success: false, error: String(err) });
    });
    return true;
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const activity = await activityStorage.getValue();
    activity[activeInfo.tabId] = { lastActive: Date.now() };
    await activityStorage.setValue(activity);
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
      const activity = await activityStorage.getValue();
      activity[tabId] = { lastActive: Date.now() };
      await activityStorage.setValue(activity);
    }
  });

  browser.tabs.onRemoved.addListener(async (tabId) => {
    const activity = await activityStorage.getValue();
    delete activity[tabId];
    await activityStorage.setValue(activity);
  });
});

async function handleMessage(message: OutgoingMessage) {
  switch (message.action) {
    case 'sleepCurrentTab': {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await sleepTab(tab);
      }
      return { action: 'ack', success: true } as const;
    }
    case 'sleepAllTabs': {
      const config = await configStorage.getValue();
      const tabs = await browser.tabs.query({});
      const state = await getEligibilityState();
      let count = 0;
      for (const tab of tabs) {
        if (count >= 5) break;
        const result = isEligible(
          {
            id: tab.id,
            url: tab.url,
            title: tab.title,
            active: tab.active,
            audible: tab.audible,
            pinned: tab.pinned,
            status: tab.status,
            discarded: tab.discarded ?? false,
          },
          config,
          state
        );
        if (result.eligible) {
          await sleepTab(tab);
          count++;
        }
      }
      return { action: 'ack', success: true } as const;
    }
    case 'wakeAllTabs': {
      const sleeping = await sleepingTabsStorage.getValue();
      for (const uuid of Object.keys(sleeping)) {
        await wakeTab(uuid);
      }
      return { action: 'ack', success: true } as const;
    }
    case 'wakeTab': {
      await wakeTab(message.uuid);
      return { action: 'ack', success: true } as const;
    }
    case 'getConfig': {
      const data = await configStorage.getValue();
      return { action: 'configData', data } as const;
    }
    case 'saveConfig': {
      const prev = await configStorage.getValue();
      await configStorage.setValue({ ...prev, ...message.config });
      if (message.config.checkIntervalSeconds !== undefined) {
        registerCheckAlarm(message.config.checkIntervalSeconds);
      }
      return { action: 'ack', success: true } as const;
    }
    case 'addDenEntry': {
      const prev = await configStorage.getValue();
      await configStorage.setValue({
        ...prev,
        den: [...prev.den, { ...message.entry, id: crypto.randomUUID(), createdAt: Date.now() }],
      });
      return { action: 'ack', success: true } as const;
    }
    case 'removeDenEntry': {
      const prev = await configStorage.getValue();
      await configStorage.setValue({
        ...prev,
        den: prev.den.filter((e) => e.id !== message.id),
      });
      return { action: 'ack', success: true } as const;
    }
    case 'giveRabbitScent': {
      const tab = await browser.tabs.get(message.tabId);
      const url = tab.url ?? '';
      if (!url) return { action: 'ack', success: false, error: 'Tab has no URL' } as const;
      const config = await configStorage.getValue();
      const uuid = generateUUID(url);
      const expiresAt = Date.now() + config.rabbitScentDurationMinutes * 60 * 1000;
      const shots = await rabbitScentsStorage.getValue();
      shots[uuid] = {
        uuid,
        tabId: tab.id ?? -1,
        expiresAt,
        alarmName: `rabbitScent_${uuid}`,
      };
      await rabbitScentsStorage.setValue(shots);
      registerRabbitScentAlarm(uuid, config.rabbitScentDurationMinutes * 60 * 1000);
      log.info('Rabbit scent granted', { uuid, tabId: tab.id });
      return { action: 'ack', success: true, uuid } as const;
    }
    case 'removeRabbitScent': {
      const shots = await rabbitScentsStorage.getValue();
      delete shots[message.uuid];
      await rabbitScentsStorage.setValue(shots);
      await clearRabbitScentAlarm(message.uuid);
      return { action: 'ack', success: true } as const;
    }
    case 'getRabbitScentStatus': {
      const scents = await rabbitScentsStorage.getValue();
      const now = Date.now();
      for (const scent of Object.values(scents)) {
        if (scent.tabId === message.tabId && scent.expiresAt > now) {
          return {
            action: 'rabbitScentStatusData',
            active: true,
            remainingMs: scent.expiresAt - now,
            uuid: scent.uuid,
          } as const;
        }
      }
      return {
        action: 'rabbitScentStatusData',
        active: false,
        remainingMs: null,
        uuid: null,
      } as const;
    }
    case 'getTabInfo': {
      const sleeping = await sleepingTabsStorage.getValue();
      const data = sleeping[message.uuid] ?? null;
      return { action: 'tabInfoData', data } as const;
    }
    case 'getSleepingTabCount': {
      const sleeping = await sleepingTabsStorage.getValue();
      return { action: 'sleepingTabCount', count: Object.keys(sleeping).length } as const;
    }
    case 'getAllTabs': {
      const browserTabs = await browser.tabs.query({});
      const tabs: TabSummary[] = browserTabs.map((t) => ({
        id: t.id ?? -1,
        title: t.title ?? '',
        url: t.url ?? '',
        favIconUrl: t.favIconUrl,
        active: t.active,
        audible: t.audible ?? false,
        pinned: t.pinned,
        discarded: t.discarded ?? false,
      }));
      return { action: 'allTabsData', tabs } as const;
    }
  }
}

async function handleCheckTabs(): Promise<void> {
  const config = await configStorage.getValue();
  const tabs = await browser.tabs.query({});
  const state = await getEligibilityState();
  let count = 0;
  for (const tab of tabs) {
    if (count >= 5) break;
    try {
      const result = isEligible(
        {
          id: tab.id,
          url: tab.url,
          active: tab.active,
          audible: tab.audible,
          pinned: tab.pinned,
          status: tab.status,
          discarded: tab.discarded ?? false,
        },
        config,
        state
      );
      if (result.eligible) {
        await sleepTab(tab);
        count++;
      }
    } catch (err) {
      log.error('Error processing tab for sleep', { tabId: tab.id, error: String(err) });
    }
  }
}

interface SleepTabParams {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  windowId?: number;
  index: number;
  pinned: boolean;
  mutedInfo?: { muted?: boolean };
  discarded?: boolean;
}

async function sleepTab(tab: SleepTabParams): Promise<void> {
  if (!tab.id || !tab.url) return;
  const config = await configStorage.getValue();
  const uuid = generateUUID(tab.url);

  const tabInfo: StoredTabInfo = {
    uuid,
    url: tab.url,
    title: tab.title ?? '',
    faviconUrl: tab.favIconUrl,
    windowId: tab.windowId ?? 0,
    index: tab.index,
    isPinned: tab.pinned,
    isMuted: tab.mutedInfo?.muted ?? false,
    sleepTimestamp: Date.now(),
  };

  if (config.sleepMode === 'discardOnly') {
    await browser.tabs.discard(tab.id);
    const sleeping = await sleepingTabsStorage.getValue();
    sleeping[uuid] = tabInfo;
    await sleepingTabsStorage.setValue(sleeping);
    return;
  }

  const sleepingUrl = new URL(browser.runtime.getURL('sleeping.html' as never));
  sleepingUrl.searchParams.set('uuid', uuid);
  sleepingUrl.searchParams.set('url', encodeURIComponent(tab.url));
  sleepingUrl.searchParams.set('title', encodeURIComponent(tab.title ?? ''));
  if (tab.favIconUrl) {
    sleepingUrl.searchParams.set('favicon', encodeURIComponent(tab.favIconUrl));
  }

  await browser.tabs.update(tab.id, { url: sleepingUrl.toString() });
  const sleeping = await sleepingTabsStorage.getValue();
  sleeping[uuid] = tabInfo;
  await sleepingTabsStorage.setValue(sleeping);
}

async function wakeTab(uuid: string): Promise<void> {
  const sleeping = await sleepingTabsStorage.getValue();
  const stored = sleeping[uuid];
  if (!stored) return;

  const sleepPageUrl = browser.runtime.getURL('sleeping.html' as never);
  const tabs = await browser.tabs.query({ url: `${sleepPageUrl}*` });
  const sleepingTab = tabs.find((t) => {
    try {
      const params = new URL(t.url ?? '').searchParams;
      return params.get('uuid') === uuid;
    } catch {
      return false;
    }
  });

  if (sleepingTab?.id) {
    if (stored.url.startsWith('about:')) {
      await browser.tabs.create({ url: stored.url });
      await browser.tabs.remove(sleepingTab.id);
    } else {
      await browser.tabs.update(sleepingTab.id, {
        url: stored.url,
        pinned: stored.isPinned,
        muted: stored.isMuted,
      });
    }
  }

  delete sleeping[uuid];
  await sleepingTabsStorage.setValue(sleeping);

  const shots = await rabbitScentsStorage.getValue();
  if (shots[uuid]) {
    delete shots[uuid];
    await rabbitScentsStorage.setValue(shots);
  }

  try {
    await clearRabbitScentAlarm(uuid);
  } catch {
    // Alarm may not exist
  }
}

async function getEligibilityState() {
  const [shots, activity] = await Promise.all([
    rabbitScentsStorage.getValue(),
    activityStorage.getValue(),
  ]);
  return { rabbitScents: shots, activity };
}
