import { createLogger } from '../../utils/logger';
import type { OutgoingMessage, IncomingResponse, StoredTabInfo } from '../../types';

const log = createLogger('sleeping');

/* ---------- DOM references ---------- */
const favicon = document.getElementById('favicon') as HTMLImageElement;
const tabTitle = document.getElementById('tab-title') as HTMLAnchorElement;
const tabUrl = document.getElementById('tab-url') as HTMLAnchorElement;
const sleepTime = document.getElementById('sleep-time') as HTMLParagraphElement;
const btnWake = document.getElementById('btn-wake') as HTMLButtonElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

/* ---------- State ---------- */
let hasWoken = false;
let sleepTimestamp = 0;
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

/* ---------- Query params ---------- */

function getQueryParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getStoredUuid(): string | null {
  return getQueryParam('uuid');
}

/* ---------- Time formatting ---------- */

function formatTimeSince(timestamp: number): string {
  const elapsed = Date.now() - timestamp;

  if (elapsed < 0) return 'Just now';

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ago`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m ago`;
    }
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes} min ago`;
  }
  return '< 1 min ago';
}

function startTimeUpdates(): void {
  timeUpdateInterval = setInterval(() => {
    if (sleepTimestamp > 0) {
      sleepTime.textContent = `Sleeping since: ${formatTimeSince(sleepTimestamp)}`;
    }
  }, 30000);
}

function stopTimeUpdates(): void {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

/* ---------- Message helpers ---------- */

async function sendMessage(msg: OutgoingMessage): Promise<IncomingResponse> {
  const res: unknown = await browser.runtime.sendMessage(msg);
  return res as IncomingResponse;
}

/* ---------- Favicon error fallback ---------- */

function setupFaviconFallback(): void {
  favicon.addEventListener('error', () => {
    const fallback = document.createElement('div');
    fallback.className = 'favicon-fallback';
    fallback.textContent = '\u{1F310}'; // globe
    favicon.replaceWith(fallback);
  });
}

function setPageFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

/* ---------- Wake ---------- */

async function wakeUp(source: string): Promise<void> {
  if (hasWoken) return;
  hasWoken = true;
  log.info('Wake triggered', { source });

  stopTimeUpdates();
  btnWake.disabled = true;
  btnWake.textContent = 'Waking...';

  const uuid = getStoredUuid();
  if (!uuid) {
    showError('No tab identifier found');
    return;
  }

  try {
    await sendMessage({ action: 'wakeTab', uuid });
    // The tab will navigate away on success — no further action needed.
  } catch (err) {
    log.error('wakeTab error, falling back to direct navigation:', err);
    const targetUrl = tabUrl.href;
    if (targetUrl && targetUrl !== '#' && targetUrl !== window.location.href) {
      window.location.href = targetUrl;
    } else {
      showError('Failed to wake tab — the extension may have been reloaded');
      hasWoken = false;
      btnWake.disabled = false;
      btnWake.textContent = 'WAKE UP';
    }
  }
}

function showError(message: string): void {
  errorMessage.textContent = message;
  log.warn('Sleeping page error:', message);
}

/* ---------- Initialize ---------- */

async function init(): Promise<void> {
  setupFaviconFallback();

  const uuid = getStoredUuid();

  // Fallback display from query params (before storage read)
  const fallbackTitle = getQueryParam('title');
  const fallbackUrl = getQueryParam('url');
  const fallbackFavicon = getQueryParam('favicon');

  if (fallbackTitle) {
    const decoded = safeDecode(fallbackTitle);
    tabTitle.textContent = decoded;
    document.title = `\u{1F4A4} ${decoded}`;
  }
  if (fallbackUrl) {
    const decodedUrl = safeDecode(fallbackUrl);
    tabUrl.textContent = decodedUrl;
    tabUrl.href = decodedUrl;
    tabTitle.href = decodedUrl;
  }
  if (fallbackFavicon) {
    const faviconUrl = safeDecode(fallbackFavicon);
    favicon.src = faviconUrl;
    setPageFavicon(faviconUrl);
  }

  // Fetch stored tab info
  if (!uuid) {
    showError('Tab not found — close this tab');
    btnWake.textContent = 'Close Tab';
    btnWake.addEventListener('click', () => {
      window.close();
    });
    return;
  }

  try {
    const res = await sendMessage({ action: 'getTabInfo', uuid });
    if (res.action === 'tabInfoData' && res.data) {
      populateFromStoredInfo(res.data);
    } else if (res.action === 'tabInfoData' && res.data === null) {
      // UUID not in storage — fallback to query params already displayed
      log.warn('Tab info not found in storage for uuid:', uuid);
      sleepTime.textContent = 'Sleeping since: some time ago';
      if (!fallbackTitle) {
        tabTitle.textContent = 'Unknown Tab';
      }
    }
  } catch (err) {
    log.error('Failed to fetch tab info:', err);
    // Query param fallbacks are already displayed
    sleepTime.textContent = 'Sleeping since: some time ago';
  }

  // Fallback: use LazyFox icon as page favicon if none was set
  if (!document.querySelector('link[rel="icon"]')) {
    setPageFavicon(browser.runtime.getURL('icon-32.png' as never));
  }
}

function populateFromStoredInfo(info: StoredTabInfo): void {
  tabTitle.textContent = info.title || 'Untitled';
  document.title = `\u{1F4A4} ${info.title || 'Untitled'}`;
  tabUrl.textContent = info.url;
  tabUrl.href = info.url;
  tabTitle.href = info.url;

  if (info.faviconUrl) {
    favicon.src = info.faviconUrl;
    setPageFavicon(info.faviconUrl);
  }

  sleepTimestamp = info.sleepTimestamp;
  sleepTime.textContent = `Sleeping since: ${formatTimeSince(sleepTimestamp)}`;
  startTimeUpdates();
}

/* ---------- Event bindings ---------- */

btnWake.addEventListener('click', () => {
  void wakeUp('button');
});

document.body.addEventListener('click', (e) => {
  // Don't trigger wake if clicking the wake button (handled separately)
  if (e.target === btnWake || btnWake.contains(e.target as Node)) return;
  // Don't attempt wake if no UUID (tab-not-found state)
  if (hasWoken || !getStoredUuid()) return;
  // Let anchor links navigate directly
  if (e.target instanceof HTMLAnchorElement) return;
  void wakeUp('body-click');
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !hasWoken && getStoredUuid()) {
    void wakeUp('visibility');
  }
});

btnWake.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    void wakeUp('keyboard');
  }
});

/* ---------- Bootstrap ---------- */

void init();
log.info('Sleeping page loaded');
