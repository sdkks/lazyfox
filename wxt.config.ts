import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  manifest: {
    name: 'LazyFox',
    short_name: 'LazyFox',
    description: 'Save energy by automatically putting inactive tabs to sleep.',
    permissions: ['storage', 'tabs', 'alarms'],
    host_permissions: [],
  },
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  zip: {
    excludeSources: ['tests/', '*.test.ts', '.husky/', '.git/', 'node_modules/'],
  },
});
