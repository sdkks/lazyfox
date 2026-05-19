import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  manifest: {
    name: 'LazyFox',
    short_name: 'LazyFox',
    description: 'Save energy by automatically putting inactive tabs to sleep.',
    action: {
      default_title: 'LazyFox',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        96: 'icon-96.png',
        128: 'icon-128.png',
      },
    },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      96: 'icon-96.png',
      128: 'icon-128.png',
    },
    permissions: ['storage', 'tabs', 'alarms'],
    host_permissions: [],
    browser_specific_settings: {
      gecko: {
        id: 'lazyfox@tabber.local',
        strict_min_version: '115.0',
        data_collection_permissions: {
          required: [],
          // @ts-expect-error — Firefox requires 'usage', WXT types haven't added it
          usage: false,
          technical_interaction: false,
          technical_data: false,
        },
      },
    },
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  zip: {
    excludeSources: ['tests/', '*.test.ts', '.husky/', '.git/', 'node_modules/'],
  },
});
