// Material 3: the color roles of `palette.generated.ts`, and here its type scale, shapes and elevation, with its
// icons. Views use only these, as Material's components do: never a hex, a font size or a radius of their own.
import { createElement, type ReactNode } from 'react'
import { type ColorValue, StyleSheet, Text, type TextStyle } from 'react-native'
import { light } from './palette.generated.ts'

/**
 * The light scheme only, for now. The dark one waits for the system's scheme to reach the views as a fact of the
 * platform, as the back button does.
 */
export const color = light

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
