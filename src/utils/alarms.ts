export function registerCheckAlarm(intervalSeconds: number): void {
  void browser.alarms.create('checkTabs', { periodInMinutes: intervalSeconds / 60 });
}

export function registerAmphetamineAlarm(uuid: string, durationMs: number): void {
  void browser.alarms.create(`amphetamine_${uuid}`, { delayInMinutes: durationMs / 60000 });
}

export async function clearAmphetamineAlarm(uuid: string): Promise<void> {
  await browser.alarms.clear(`amphetamine_${uuid}`);
}
