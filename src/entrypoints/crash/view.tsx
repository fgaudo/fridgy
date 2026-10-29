import type { ReactNode } from 'react'
import { View as Box, Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { color, icon, shape, type } from '#styles'

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.surface },
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  disc: {
    width: 96,
    height: 96,
    marginBottom: 8,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.errorContainer,
  },
  title: { ...type.headlineSmall, textAlign: 'center', color: color.onSurface },
  text: { ...type.bodyLarge, textAlign: 'center', color: color.onSurfaceVariant },
  button: {
    minHeight: 56,
    marginTop: 24,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: color.primary,
  },
  label: { ...type.labelLarge, color: color.onPrimary },
})

/**
 * The screen a crash leaves: Material's empty state in the error's colors, and a filled button that restarts the
 * app. The products are on disk, so a restart finds them. Nothing of the cause is shown.
 */
export const view = (restart: () => void): ReactNode => (
  <SafeAreaView style={styles.page}>
    <Box style={styles.column}>
      <Box style={styles.disc}>{icon('error', color.onErrorContainer, { fontSize: 36, lineHeight: 36 })}</Box>
      <Text style={styles.title}>Fridgy stopped</Text>
      <Text style={styles.text}>Something went wrong inside the app. Your products are kept.</Text>
      <Pressable accessibilityRole='button' style={styles.button} onPress={restart}>
        <Text style={styles.label}>Restart Fridgy</Text>
      </Pressable>
    </Box>
  </SafeAreaView>
)
