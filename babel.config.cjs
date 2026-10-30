// Only Metro reads it, for the React Native prototype: Bun and tsgo have their own transforms.

// Hermes rejects `import.meta`, which Effect's `ConfigProvider.fromEnv` reads (`import.meta?.env`): a bundle has
// no module URL and no environment, so it becomes an empty object.
const importMetaAsEmpty = ({ types }) => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
        path.replaceWith(types.objectExpression([]))
      }
    },
  },
})

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Effect's modules re-export namespaces (`export * as Model from …`), which React Native's preset leaves out.
  // Worklets' plugin goes last, as its docs ask: it compiles the worklets of Reanimated's layout animations.
  plugins: ['@babel/plugin-transform-export-namespace-from', importMetaAsEmpty, 'react-native-worklets/plugin'],
}
