// Material 3: the color roles of `palette.generated.ts`, and here its type scale, shapes and elevation, with its
// icons. Views use only these, as Material's components do: never a hex, a font size or a radius of their own.
import { createElement, type ReactNode } from 'react'
import { type ColorValue, PlatformColor, StyleSheet, Text, type TextStyle } from 'react-native'
import { Easing } from 'react-native-reanimated'
import { roles } from './palette.generated.ts'

/**
 * Each role as Android's color resource, which holds a value per scheme: Android picks the system's theme, and a
 * change of it recreates the activity, which draws the views again in the other scheme. A view names a role, never
 * a scheme; the disabled roles are Material's, on-surface at 38% (`disabledContent`) and 12% (`disabledContainer`).
 */
export const color = Object.fromEntries(
  Object.entries(roles).map(([role, resource]) => [role, PlatformColor(`@color/${resource}`)]),
) as Readonly<Record<keyof typeof roles, ColorValue>>

/** Material's type scale, in sp: Android scales it with the user's font size. */
export const type = StyleSheet.create({
  displayLarge: { fontSize: 57, lineHeight: 64, letterSpacing: -0.25 },
  headlineLarge: { fontSize: 32, lineHeight: 40 },
  headlineMedium: { fontSize: 28, lineHeight: 36 },
  headlineMediumEmphasized: { fontSize: 28, lineHeight: 36, fontWeight: '500' },
  headlineSmall: { fontSize: 24, lineHeight: 32 },
  titleLarge: { fontSize: 22, lineHeight: 28 },
  titleLargeEmphasized: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  titleMedium: { fontSize: 16, lineHeight: 24, letterSpacing: 0.15, fontWeight: '500' },
  titleSmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1, fontWeight: '500' },
  bodyLarge: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1, fontWeight: '500' },
  labelMedium: { fontSize: 12, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' },
  labelSmall: { fontSize: 11, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' },
})

/** Material's shape scale: corner radii in dp. */
export const shape = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
} as const

/** Material's elevation levels, as Android's shadows. */
export const elevation = { level1: 1, level2: 3, level3: 6, level4: 8 } as const

/** Material's durations, in ms, for the motions of `docs/motion.md`. */
export const duration = { short1: 50, short4: 200, medium4: 400 } as const

/** Material's easing curves: what enters decelerates, what leaves accelerates. */
export const easing = {
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
  emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),
} as const

/** Material's state layer: the opacity of a pressed element's overlay. */
export const pressedOpacity = 0.1

const iconStyle = StyleSheet.create({
  // The font's family is its file's name, in the app's assets (`bun run update-icons`).
  icon: { fontFamily: 'MaterialSymbolsRounded', fontSize: 24, lineHeight: 24, includeFontPadding: false },
})

/**
 * A Material Symbol by its name, which the font draws as one glyph through a ligature. Decoration: the element that
 * holds it carries the label.
 */
export const icon = (name: string, tint: ColorValue, style?: TextStyle): ReactNode =>
  createElement(
    Text,
    {
      style: [iconStyle.icon, { color: tint }, style],
      accessible: false,
      importantForAccessibility: 'no',
    },
    name,
  )
