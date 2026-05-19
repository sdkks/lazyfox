export function registerCheckAlarm(intervalSeconds: number): void {
  void browser.alarms.create('checkTabs', { periodInMinutes: intervalSeconds / 60 });
}

export function registerRabbitScentAlarm(uuid: string, durationMs: number): void {
  void browser.alarms.create(`rabbitScent_${uuid}`, { delayInMinutes: durationMs / 60000 });
}

export async function clearRabbitScentAlarm(uuid: string): Promise<void> {
  await browser.alarms.clear(`rabbitScent_${uuid}`);
}
