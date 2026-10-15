// Preloaded by `bun test` (see bunfig.toml). Tests run without a DOM, but
// snabbdom's style module reads the global `window` as soon as it is loaded:
// declaring it as `undefined` lets views be built and inspected in tests,
// without pretending there is a browser.
Object.assign(globalThis, { window: undefined })
