import type { OutgoingMessage, IncomingResponse, DenEntry } from '../../types';
import type { LazyFoxConfig } from '../../config';
import { createLogger } from '../../utils/logger';

const log = createLogger('popup');

/* ---------- DOM references ---------- */
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

function getInput(id: string): HTMLInputElement {
  return $(id) as HTMLInputElement;
}

function getButton(id: string): HTMLButtonElement {
  return $(id) as HTMLButtonElement;
}

function getSelect(id: string): HTMLSelectElement {
  return $(id) as HTMLSelectElement;
}

const btnSleepCurrent = getButton('btn-sleep-current');
const btnSleepAll = getButton('btn-sleep-all');
const btnWakeAll = getButton('btn-wake-all');
const btnRabbitScent = getButton('btn-rabbit-scent');
const scentTimer = $('scent-timer') as HTMLParagraphElement;

const timeoutSlider = getInput('timeout-slider');
const timeoutValue = $('timeout-value');
const intervalSlider = getInput('interval-slider');
const intervalValue = $('interval-value');

const preservePinnedTabs = getInput('preservePinnedTabs');
const sleepAudibleTabs = getInput('sleepAudibleTabs');
const sleepLoadingTabs = getInput('sleepLoadingTabs');
const autoRestore = getInput('autoRestore');

const denInput = getInput('den-input');
const denType = getSelect('den-type');
const btnDenAdd = getButton('btn-den-add');
const denList = $('den-list');

const sleepingCount = $('sleeping-count');
const errorContainer = $('error-container');

/* ---------- State ---------- */
let errorTimer: ReturnType<typeof setTimeout> | null = null;
let scentExpiry: number | null = null;
let scentUuid: string | null = null;
let scentCountdownInterval: ReturnType<typeof setInterval> | null = null;
let settingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let settingsSaveGeneration = 0;

/* ---------- Message helpers ---------- */

async function sendMessage(msg: OutgoingMessage): Promise<IncomingResponse> {
  const res: unknown = await browser.runtime.sendMessage(msg);
  return res as IncomingResponse;
}

/** Send a command and expect an ack response. Throws on non-ack. */
async function sendCommand(msg: OutgoingMessage): Promise<{ success: boolean; error?: string }> {
  const res = await sendMessage(msg);
  if (res.action === 'ack') return res;
  throw new Error(`Unexpected response action: ${res.action}`);
}

function showError(message: string): void {
  if (errorTimer) clearTimeout(errorTimer);
  errorContainer.textContent = message;
  errorContainer.classList.add('visible');
  log.warn('Popup error:', message);
  errorTimer = setTimeout(() => {
    errorContainer.classList.remove('visible');
    errorTimer = null;
  }, 3000);
}

function setButtonLoading(btn: HTMLButtonElement, loading: boolean): void {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ---------- Sleep / Wake / Rabbit Scent actions ---------- */

async function handleSleepCurrent(): Promise<void> {
  setButtonLoading(btnSleepCurrent, true);
  try {
    const res = await sendCommand({ action: 'sleepCurrentTab' });
    if (!res.success) showError(res.error ?? 'Failed to sleep tab');
    await updateSleepingCount();
  } catch (err) {
    showError('Failed to sleep tab');
    log.error('sleepCurrentTab error:', err);
  } finally {
    setButtonLoading(btnSleepCurrent, false);
  }
}

async function handleSleepAll(): Promise<void> {
  setButtonLoading(btnSleepAll, true);
  try {
    const res = await sendCommand({ action: 'sleepAllTabs' });
    if (!res.success) showError(res.error ?? 'Failed to sleep tabs');
    await updateSleepingCount();
  } catch (err) {
    showError('Failed to sleep tabs');
    log.error('sleepAllTabs error:', err);
  } finally {
    setButtonLoading(btnSleepAll, false);
  }
}

async function handleWakeAll(): Promise<void> {
  setButtonLoading(btnWakeAll, true);
  try {
    const res = await sendCommand({ action: 'wakeAllTabs' });
    if (!res.success) showError(res.error ?? 'Failed to wake tabs');
    await updateSleepingCount();
  } catch (err) {
    showError('Failed to wake tabs');
    log.error('wakeAllTabs error:', err);
  } finally {
    setButtonLoading(btnWakeAll, false);
  }
}

async function handleRabbitScent(): Promise<void> {
  setButtonLoading(btnRabbitScent, true);
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showError('No active tab found');
      return;
    }

    // Toggle: if scent is active, remove it
    if (scentUuid) {
      await sendCommand({ action: 'removeRabbitScent', uuid: scentUuid });
      stopScentCountdown();
      scentTimer.textContent = '';
      btnRabbitScent.textContent = 'Rabbit Scent';
      return;
    }

    const res = await sendMessage({ action: 'giveRabbitScent', tabId: tab.id });
    if (res.action !== 'ack' || !res.success) {
      showError('Failed to give rabbit scent');
      return;
    }
    if ('uuid' in res && typeof res.uuid === 'string') {
      scentUuid = res.uuid;
    }

    const configRes = await sendMessage({ action: 'getConfig' });
    const duration =
      configRes.action === 'configData' ? configRes.data.rabbitScentDurationMinutes : 60;

    scentExpiry = Date.now() + duration * 60 * 1000;
    updateScentCountdown();
    startScentCountdown();
  } catch (err) {
    showError('Failed to update rabbit scent');
    log.error('handleRabbitScent error:', err);
  } finally {
    setButtonLoading(btnRabbitScent, false);
  }
}

function updateScentCountdown(): void {
  if (scentExpiry === null) return;
  const remaining = scentExpiry - Date.now();
  if (remaining <= 0) {
    scentTimer.textContent = '';
    btnRabbitScent.textContent = 'Rabbit Scent';
    stopScentCountdown();
    return;
  }
  const minutes = Math.ceil(remaining / 60000);
  scentTimer.textContent = `Scent active: ${minutes} min remaining`;
  btnRabbitScent.textContent = 'Remove Rabbit Scent';
}

function startScentCountdown(): void {
  stopScentCountdown();
  scentCountdownInterval = setInterval(() => {
    updateScentCountdown();
    if (scentExpiry && scentExpiry <= Date.now()) {
      stopScentCountdown();
      scentTimer.textContent = '';
    }
  }, 30000);
}

function stopScentCountdown(): void {
  if (scentCountdownInterval) {
    clearInterval(scentCountdownInterval);
    scentCountdownInterval = null;
  }
  scentExpiry = null;
  scentUuid = null;
}

/* ---------- Settings ---------- */

function populateConfig(config: LazyFoxConfig): void {
  timeoutSlider.value = String(config.sleepTimeoutMinutes);
  timeoutValue.textContent = `${config.sleepTimeoutMinutes} min`;

  const modeRadio = document.querySelector<HTMLInputElement>(
    `input[name="sleepMode"][value="${config.sleepMode}"]`
  );
  if (modeRadio) modeRadio.checked = true;

  preservePinnedTabs.checked = config.preservePinnedTabs;
  sleepAudibleTabs.checked = config.sleepAudibleTabs;
  sleepLoadingTabs.checked = config.sleepLoadingTabs;
  autoRestore.checked = config.autoRestore;

  intervalSlider.value = String(config.checkIntervalSeconds);
  intervalValue.textContent = `${config.checkIntervalSeconds} sec`;
}

function readSettingsDiff(): Partial<LazyFoxConfig> {
  const diff: Partial<LazyFoxConfig> = {};

  const timeout = Number(timeoutSlider.value);
  diff.sleepTimeoutMinutes = timeout;

  const modeInput = document.querySelector<HTMLInputElement>('input[name="sleepMode"]:checked');
  if (modeInput) {
    diff.sleepMode = modeInput.value as 'full' | 'discardOnly';
  }

  diff.preservePinnedTabs = preservePinnedTabs.checked;
  diff.sleepAudibleTabs = sleepAudibleTabs.checked;
  diff.sleepLoadingTabs = sleepLoadingTabs.checked;
  diff.autoRestore = autoRestore.checked;

  const interval = Number(intervalSlider.value);
  diff.checkIntervalSeconds = interval;

  return diff;
}

function scheduleSettingsSave(): void {
  if (settingsDebounceTimer) clearTimeout(settingsDebounceTimer);
  const config = readSettingsDiff();
  const generation = ++settingsSaveGeneration;
  settingsDebounceTimer = setTimeout(() => {
    void (async () => {
      if (generation !== settingsSaveGeneration) return;
      try {
        await sendCommand({ action: 'saveConfig', config });
      } catch (err) {
        showError('Failed to save settings');
        log.error('saveConfig error:', err);
      }
      settingsDebounceTimer = null;
    })();
  }, 250);
}

function bindSettingsListeners(): void {
  timeoutSlider.addEventListener('input', () => {
    timeoutValue.textContent = `${timeoutSlider.value} min`;
    scheduleSettingsSave();
  });

  intervalSlider.addEventListener('input', () => {
    intervalValue.textContent = `${intervalSlider.value} sec`;
    scheduleSettingsSave();
  });

  const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="sleepMode"]');
  modeRadios.forEach((radio) => {
    radio.addEventListener('change', scheduleSettingsSave);
  });

  const checkboxes = [preservePinnedTabs, sleepAudibleTabs, sleepLoadingTabs, autoRestore];
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', scheduleSettingsSave);
  });
}

/* ---------- Den ---------- */

function populateDen(den: DenEntry[]): void {
  denList.innerHTML = '';
  if (den.length === 0) {
    denList.innerHTML = '<span class="den-empty">No protected patterns</span>';
    return;
  }
  for (const entry of den) {
    const pill = document.createElement('span');
    pill.className = 'den-pill';

    const typeSpan = document.createElement('span');
    typeSpan.className = 'den-pill-type';
    typeSpan.textContent = entry.type;

    const patternSpan = document.createElement('span');
    patternSpan.className = 'den-pill-pattern';
    patternSpan.textContent = entry.pattern;
    patternSpan.title = entry.pattern;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'den-pill-remove';
    removeBtn.innerHTML = '&#x2715;';
    removeBtn.setAttribute('aria-label', `Remove ${entry.pattern}`);
    removeBtn.addEventListener('click', () => handleDenRemove(entry.id));

    pill.appendChild(typeSpan);
    pill.appendChild(patternSpan);
    pill.appendChild(removeBtn);
    denList.appendChild(pill);
  }
}

async function handleDenAdd(): Promise<void> {
  const pattern = denInput.value.trim();
  if (!pattern) return;

  const type = denType.value as DenEntry['type'];

  setButtonLoading(btnDenAdd, true);
  try {
    await sendCommand({ action: 'addDenEntry', entry: { pattern, type } });
    denInput.value = '';
    await refreshDen();
  } catch (err) {
    showError('Failed to add den entry');
    log.error('addDenEntry error:', err);
  } finally {
    setButtonLoading(btnDenAdd, false);
  }
}

async function handleDenRemove(id: string): Promise<void> {
  try {
    await sendCommand({ action: 'removeDenEntry', id });
    await refreshDen();
  } catch (err) {
    showError('Failed to remove den entry');
    log.error('removeDenEntry error:', err);
  }
}

async function refreshDen(): Promise<void> {
  try {
    const res = await sendMessage({ action: 'getConfig' });
    if (res.action === 'configData') {
      populateDen(res.data.den);
    }
  } catch (err) {
    showError('Failed to refresh den');
    log.error('refreshDen error:', err);
  }
}

/* ---------- Sleeping count ---------- */

async function updateSleepingCount(): Promise<void> {
  try {
    const res = await sendMessage({ action: 'getSleepingTabCount' });
    if (res.action === 'sleepingTabCount') {
      const count = res.count;
      sleepingCount.textContent = count === 1 ? '1 tab sleeping' : `${count} tabs sleeping`;
    }
  } catch (err) {
    log.error('updateSleepingCount error:', err);
  }
}

/* ---------- Initialization ---------- */

async function init(): Promise<void> {
  try {
    const [configRes, countRes, tabRes] = await Promise.all([
      sendMessage({ action: 'getConfig' }),
      sendMessage({ action: 'getSleepingTabCount' }),
      browser.tabs.query({ active: true, currentWindow: true }),
    ]);

    if (configRes.action === 'configData') {
      populateConfig(configRes.data);
      populateDen(configRes.data.den);
    }
    if (countRes.action === 'sleepingTabCount') {
      sleepingCount.textContent =
        countRes.count === 1 ? '1 tab sleeping' : `${countRes.count} tabs sleeping`;
    }

    // Restore rabbit scent countdown if active for current tab
    const activeTab = tabRes[0];
    if (activeTab?.id) {
      const scentRes = await sendMessage({ action: 'getRabbitScentStatus', tabId: activeTab.id });
      if (scentRes.action === 'rabbitScentStatusData' && scentRes.active && scentRes.remainingMs) {
        scentUuid = scentRes.uuid;
        scentExpiry = Date.now() + scentRes.remainingMs;
        updateScentCountdown();
        startScentCountdown();
      }
    }
  } catch (err) {
    showError('Failed to load popup data');
    log.error('init error:', err);
  }
}

/* ---------- Event bindings ---------- */

btnSleepCurrent.addEventListener('click', () => void handleSleepCurrent());
btnSleepAll.addEventListener('click', () => void handleSleepAll());
btnWakeAll.addEventListener('click', () => void handleWakeAll());
btnRabbitScent.addEventListener('click', () => void handleRabbitScent());
btnDenAdd.addEventListener('click', () => void handleDenAdd());
denInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    void handleDenAdd();
  }
});

bindSettingsListeners();

document.addEventListener('DOMContentLoaded', () => void init());

log.info('Popup loaded');
