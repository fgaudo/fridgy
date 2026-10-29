// Preloaded by `bun test` (bunfig.toml). React Native's own modules are Flow, which Bun cannot load: the tests draw
// the views without rendering them, so host components are their names and the platform's modules do nothing.
import { mock } from 'bun:test'

mock.module('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  BackHandler: { addEventListener: () => ({ remove: () => {} }) },
  codegenNativeComponent: (name: string) => name,
  Linking: { openURL: () => Promise.resolve() },
  PlatformColor: (resource: string) => resource,
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StatusBar: { currentHeight: 24 },
  StyleSheet: {
    absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
    create: <A>(styles: A) => styles,
    hairlineWidth: 1,
  },
  Text: 'Text',
  TextInput: 'TextInput',
  TurboModuleRegistry: { getEnforcing: (name: string) => ({ name }) },
  Vibration: { vibrate: () => {} },
  View: 'View',
}))

mock.module('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))
