// The React Native prototype's bundler: the project is the repository's root, and the entry is `rn/index.js`.
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

module.exports = mergeConfig(getDefaultConfig(__dirname), {})
