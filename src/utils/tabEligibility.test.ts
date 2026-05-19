import { describe, it, expect } from 'vitest';
import { isEligible, matchesPattern, generateUUID } from './tabEligibility';
import type { LazyFoxConfig } from '../config';
import type { EligibilityState } from './tabEligibility';

function makeConfig(overrides?: Partial<LazyFoxConfig>): LazyFoxConfig {
  return {
    sleepTimeoutMinutes: 60,
    sleepMode: 'full',
    amphetamineDurationMinutes: 60,
    den: [],
    preservePinnedTabs: true,
    sleepAudibleTabs: false,
    sleepLoadingTabs: false,
    autoRestore: true,
    checkIntervalSeconds: 15,
    ...overrides,
  };
}

function makeState(overrides?: Partial<EligibilityState>): EligibilityState {
  return {
    amphetamineShots: {},
    activity: {},
    ...overrides,
  };
}

const baseTab = {
  id: 1,
  url: 'https://example.com/page',
  title: 'Example',
  active: false,
  audible: false,
  pinned: false,
  status: 'complete',
  discarded: false,
};

describe('isEligible', () => {
  it('eligible tab', () => {
    const result = isEligible(baseTab, makeConfig(), makeState());
    expect(result.eligible).toBe(true);
  });

  it('no tab ID', () => {
    const tabWithoutId = { ...baseTab };
    delete (tabWithoutId as { id?: number }).id;
    const result = isEligible(tabWithoutId, makeConfig(), makeState());
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('No tab ID');
  });

  it('no URL', () => {
    const result = isEligible({ ...baseTab, url: '' }, makeConfig(), makeState());
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('No URL');
  });

  it('restricted protocol: chrome://', () => {
    const result = isEligible(
      { ...baseTab, url: 'chrome://extensions' },
      makeConfig(),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Restricted protocol');
  });

  it('restricted protocol: about:', () => {
    const result = isEligible({ ...baseTab, url: 'about:blank' }, makeConfig(), makeState());
    expect(result.eligible).toBe(false);
  });

  it('restricted protocol: moz-extension://', () => {
    const result = isEligible(
      { ...baseTab, url: 'moz-extension://foo/bar' },
      makeConfig(),
      makeState()
    );
    expect(result.eligible).toBe(false);
  });

  it('already discarded', () => {
    const result = isEligible({ ...baseTab, discarded: true }, makeConfig(), makeState());
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Already discarded');
  });

  it('already sleeping', () => {
    const result = isEligible(
      { ...baseTab, url: 'chrome-extension://abc/sleeping.html?uuid=test' },
      makeConfig(),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Already sleeping');
  });

  it('active tab', () => {
    const result = isEligible({ ...baseTab, active: true }, makeConfig(), makeState());
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Tab is active');
  });

  it('pinned tab preserved', () => {
    const result = isEligible(
      { ...baseTab, pinned: true },
      makeConfig({ preservePinnedTabs: true }),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Pinned tab preserved');
  });

  it('pinned tab not preserved when setting off', () => {
    const result = isEligible(
      { ...baseTab, pinned: true },
      makeConfig({ preservePinnedTabs: false }),
      makeState()
    );
    expect(result.eligible).toBe(true);
  });

  it('audible tab not slept by default', () => {
    const result = isEligible(
      { ...baseTab, audible: true },
      makeConfig({ sleepAudibleTabs: false }),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Tab is playing audio');
  });

  it('audible tab slept when setting on', () => {
    const result = isEligible(
      { ...baseTab, audible: true },
      makeConfig({ sleepAudibleTabs: true }),
      makeState()
    );
    expect(result.eligible).toBe(true);
  });

  it('loading tab not slept by default', () => {
    const result = isEligible(
      { ...baseTab, status: 'loading' },
      makeConfig({ sleepLoadingTabs: false }),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Tab is loading');
  });

  it('within timeout threshold', () => {
    const result = isEligible(
      baseTab,
      makeConfig({ sleepTimeoutMinutes: 60 }),
      makeState({
        activity: { 1: { lastActive: Date.now() - 30 * 60 * 1000 } },
      })
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Within timeout threshold');
  });

  it('past timeout threshold', () => {
    const result = isEligible(
      baseTab,
      makeConfig({ sleepTimeoutMinutes: 30 }),
      makeState({
        activity: { 1: { lastActive: Date.now() - 60 * 60 * 1000 } },
      })
    );
    expect(result.eligible).toBe(true);
  });

  it('den exact match', () => {
    const result = isEligible(
      { ...baseTab, url: 'https://example.com/page' },
      makeConfig({
        den: [{ id: '1', pattern: 'https://example.com/page', type: 'exact', createdAt: 0 }],
      }),
      makeState()
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('URL in den');
  });

  it('den domain match', () => {
    const result = isEligible(
      { ...baseTab, url: 'https://youtube.com/watch?v=123' },
      makeConfig({
        den: [{ id: '1', pattern: 'youtube.com', type: 'domain', createdAt: 0 }],
      }),
      makeState()
    );
    expect(result.eligible).toBe(false);
  });

  it('active amphetamine shot', () => {
    const uuid = generateUUID('https://example.com/page');
    const result = isEligible(
      baseTab,
      makeConfig(),
      makeState({
        amphetamineShots: {
          [uuid]: {
            uuid,
            tabId: 1,
            expiresAt: Date.now() + 60 * 60 * 1000,
            alarmName: `amphetamine_${uuid}`,
          },
        },
      })
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Active amphetamine shot');
  });

  it('expired amphetamine shot', () => {
    const uuid = generateUUID('https://example.com/page');
    const result = isEligible(
      baseTab,
      makeConfig(),
      makeState({
        amphetamineShots: {
          [uuid]: {
            uuid,
            tabId: 1,
            expiresAt: Date.now() - 60 * 60 * 1000,
            alarmName: `amphetamine_${uuid}`,
          },
        },
      })
    );
    expect(result.eligible).toBe(true);
  });

  it('no activity yet (new tab)', () => {
    const result = isEligible(baseTab, makeConfig(), makeState({ activity: {} }));
    expect(result.eligible).toBe(true);
  });
});

describe('matchesPattern', () => {
  it('exact match', () => {
    expect(
      matchesPattern('https://example.com', {
        id: '1',
        pattern: 'https://example.com',
        type: 'exact',
        createdAt: 0,
      })
    ).toBe(true);
  });

  it('exact no match', () => {
    expect(
      matchesPattern('https://example.com/other', {
        id: '1',
        pattern: 'https://example.com',
        type: 'exact',
        createdAt: 0,
      })
    ).toBe(false);
  });

  it('domain match exact hostname', () => {
    expect(
      matchesPattern('https://youtube.com/watch', {
        id: '1',
        pattern: 'youtube.com',
        type: 'domain',
        createdAt: 0,
      })
    ).toBe(true);
  });

  it('domain match subdomain', () => {
    expect(
      matchesPattern('https://mail.google.com/inbox', {
        id: '1',
        pattern: 'google.com',
        type: 'domain',
        createdAt: 0,
      })
    ).toBe(true);
  });

  it('wildcard match', () => {
    expect(
      matchesPattern('https://example.com/admin/dashboard', {
        id: '1',
        pattern: 'https://example.com/admin/*',
        type: 'wildcard',
        createdAt: 0,
      })
    ).toBe(true);
  });

  it('wildcard no match', () => {
    expect(
      matchesPattern('https://example.com/user/profile', {
        id: '1',
        pattern: 'https://example.com/admin/*',
        type: 'wildcard',
        createdAt: 0,
      })
    ).toBe(false);
  });
});

describe('generateUUID', () => {
  it('generates same UUID for same URL', () => {
    expect(generateUUID('https://example.com')).toBe(generateUUID('https://example.com'));
  });

  it('generates different UUID for different URL', () => {
    expect(generateUUID('https://example.com')).not.toBe(generateUUID('https://other.com'));
  });
});
