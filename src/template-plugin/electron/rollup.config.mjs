// Bundles the TypeScript build output (electron/build/) into electron/dist/.
// Run via: npm run build:electron (tsc first, then rollup)

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    // Main plugin class — imported by app consumers in main-process code
    input: 'electron/build/index.js',
    output: [
      {
        file: 'electron/dist/plugin.cjs.js',
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    external: ['electron'],
  },
  {
    // Settings descriptor — read by `cap-electron sync` during code generation
    input: 'electron/build/plugin-settings.js',
    output: [
      {
        file: 'electron/dist/plugin-settings.js',
        format: 'cjs',
        sourcemap: true,
      },
    ],
    external: [],
  },
];
