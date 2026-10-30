import * as Opt from 'effect/Option'
import type { ReactElement, ReactNode } from 'react'
import { View as Box, FlatList, Linking, Pressable, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, icon, shape, type } from '#styles'
import type { LicenseCard, Message, Model } from './program.ts'

const styles = StyleSheet.create({
  // Edge to edge: the page keeps clear of the system bars, and draws its surface under them.
  page: { flex: 1, backgroundColor: color.surface },
  // What an absolute position is measured from: inside the bars.
  frame: { flex: 1 },
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.titleLargeEmphasized, paddingHorizontal: 4, color: color.onSurface },
  content: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 32, gap: 16 },
  intro: { gap: 16 },
  header: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  appName: { ...type.headlineMedium, marginTop: 8, color: color.onSurface },
  version: { ...type.labelLarge, color: color.onSurfaceVariant },
  tagline: { ...type.bodyLarge, marginTop: 8, textAlign: 'center', color: color.onSurfaceVariant },
  filledCard: { borderRadius: shape.medium, backgroundColor: color.surfaceContainerHighest },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.outlineVariant },
  rowText: { ...type.bodyLarge, flex: 1, color: color.onSurface },
  link: { color: color.primary, textDecorationLine: 'underline' },
  copyright: { ...type.bodySmall, textAlign: 'center', color: color.onSurfaceVariant },
  heading: { ...type.titleLarge, marginTop: 16, color: color.onSurface },
  headingText: { ...type.bodyMedium, color: color.onSurfaceVariant },
  outlinedCard: { gap: 4, borderRadius: shape.medium, borderWidth: 1, borderColor: color.outlineVariant, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  cardTitle: { ...type.titleMedium, flexShrink: 1, color: color.onSurface },
  cardLicenses: { ...type.labelMedium, color: color.onSurfaceVariant },
  cardDescription: { ...type.bodyMedium, color: color.onSurface },
  cardLine: { ...type.bodySmall, color: color.onSurfaceVariant },
})

const link = (href: string, text: string): ReactNode => (
  <Text key={href} style={styles.link} accessibilityRole='link' onPress={() => Linking.openURL(href)}>
    {text}
  </Text>
)

/** A list item of the project's card: a leading icon, then a sentence. */
const row = (iconName: string, content: ReadonlyArray<ReactNode>, isFirst = false): ReactNode => (
  <Box key={iconName} style={[styles.row, isFirst ? undefined : styles.divider]}>
    {icon(iconName, color.onSurfaceVariant)}
    <Text style={styles.rowText}>{content}</Text>
  </Box>
)

/** Material's outlined card: a long list of them stays light. */
const card = (card: LicenseCard): ReactNode => (
  <Box key={card.key} style={styles.outlinedCard}>
    <Box style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{card.title}</Text>
      {Opt.match(card.maybeLicenses, {
        onNone: () => null,
        onSome: (licenses) => <Text style={styles.cardLicenses}>{licenses}</Text>,
      })}
    </Box>
    {Opt.match(card.maybeDescription, {
      onNone: () => null,
      onSome: (description) => <Text style={styles.cardDescription}>{description}</Text>,
    })}
    {card.lines.map((line) => <Text key={line} style={styles.cardLine}>{line}</Text>)}
    {Opt.match(card.maybeRepository, {
      onNone: () => null,
      onSome: (url) => (
        <Text
          style={[styles.cardLine, styles.link]}
          numberOfLines={1}
          onPress={() => Linking.openURL(url)}
        >
          {url}
        </Text>
      ),
    })}
  </Box>
)

/**
 * The page: Material's small top app bar over a scrolling column, the bar filled once the page scrolls under it.
 * The cards are a list that mounts only what is near the screen (`docs/motion.md`, "The frames").
 */
export const view: View<Model, Message> = (model, dispatch) => {
  const { on, onValue } = handlers(dispatch)
  const scrolled = onValue((top: number) => model.scroll(top))
  return (
    <SafeAreaView style={styles.page}>
      <Box style={styles.frame}>
        <Box style={[styles.bar, { backgroundColor: model.isAtTop ? color.surface : color.surfaceContainer }]}>
          <Pressable
            style={styles.iconButton}
            accessibilityRole='button'
            accessibilityLabel='Back'
            onPress={on(model.back)}
          >
            {icon('arrow_back', color.onSurface)}
          </Pressable>
          <Text accessibilityRole='header' style={styles.title}>About</Text>
        </Box>
        <FlatList
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
          overScrollMode='never'
          onScroll={(event) => scrolled(event.nativeEvent.contentOffset.y)}
          data={model.licenses._tag === 'Loading' ? [] : model.licenses.cards}
          keyExtractor={(licenseCard) => licenseCard.key}
          renderItem={({ item }) => card(item)}
          // A screen above and below. The default, ten of each, still mounted most cards as the page rose.
          windowSize={3}
          ListHeaderComponent={intro(model)}
        />
      </Box>
    </SafeAreaView>
  )
}

/** What comes before the cards: the app, the project's card, and the heading of the cards. */
const intro = (model: Model): ReactElement => (
  <Box style={styles.intro}>
    <Box style={styles.header}>
      <Text style={styles.appName}>Fridgy</Text>
      {model.version._tag === 'Loading'
        ? null
        : <Text style={styles.version}>Version {model.version.version}</Text>}
      <Text style={styles.tagline}>Keep track of what is in your fridge and when it expires.</Text>
    </Box>
    {/* Material's filled card, holding a list. */}
    <Box style={styles.filledCard}>
      {row('balance', [
        'Free software, released under the ',
        link('https://spdx.org/licenses/AGPL-3.0-or-later.html', 'AGPL-3.0-or-later'),
        ' license.',
      ], true)}
      {row('code', ['The source code is on ', link('https://github.com/fgaudo/fridgy', 'GitHub'), '.'])}
      {/* The attribution Open Food Facts' licence asks for: the licenses below come from npm and cannot carry it. */}
      {row('barcode', [
        'Product names from ',
        link('https://openfoodfacts.org', 'Open Food Facts'),
        ', under the ',
        link('https://opendatacommons.org/licenses/odbl/1-0/', 'Open Database License'),
        '.',
      ])}
      {row('privacy_tip', [
        'Your products stay on your phone: read the ',
        link('https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md', 'privacy policy'),
        '.',
      ])}
      {row('bug_report', [
        'Found a bug, or have an idea? ',
        link('https://github.com/fgaudo/fridgy/issues', 'Open an issue'),
        '.',
      ])}
    </Box>
    <Text style={styles.copyright}>© 2024–2026 Francesco Gaudenzi</Text>
    <Box>
      <Text accessibilityRole='header' style={styles.heading}>Open source libraries</Text>
      <Text style={styles.headingText}>Fridgy is built with these libraries, under their own licenses.</Text>
    </Box>
  </Box>
)
