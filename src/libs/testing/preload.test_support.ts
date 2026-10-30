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

// A layout animation's builder chains its settings; the tests draw no frame, so every setting returns it again.
const builder: object = new Proxy({}, { get: () => () => builder })

mock.module('react-native-reanimated', () => ({
  default: { View: 'Animated.View' },
  Easing: { bezier: () => ({ factory: () => (x: number) => x }) },
  FadeIn: builder,
  FadeInRight: builder,
  FadeInUp: builder,
  FadeOut: builder,
  FadeOutDown: builder,
  FadeOutRight: builder,
  // A function that returns an object gives that object to `new`.
  Keyframe: function Keyframe() {
    return builder
  },
  LayoutAnimationConfig: 'LayoutAnimationConfig',
  LinearTransition: builder,
  withTiming: (to: number) => to,
}))

mock.module('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))
