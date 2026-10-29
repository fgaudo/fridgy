/** @jsxImportSource react */
// The root view on React Native, for the prototype: About whole, Home only as its list and its menu.
import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View as Box } from 'react-native'
import type * as About from '#app/children/about/program.ts'
import type { ProductModel } from '#app/children/home/children/products/program.ts'
import type * as Home from '#app/children/home/program.ts'
import type { Message, Model } from '#app/program.ts'
import { send, type View } from './renderer.tsx'

// The light scheme of `src/palette.generated.css`.
const color = {
  surface: '#fff5ed',
  surfaceContainer: '#ffe4c7',
  surfaceContainerHighest: '#ffd6a6',
  onSurface: '#442900',
  onSurfaceVariant: '#785525',
  outlineVariant: '#d2a56e',
  primary: '#894c00',
}

const styles = StyleSheet.create({
  // Edge to edge: the page starts under the status bar, and the bar is drawn below it.
  page: { flex: 1, paddingTop: StatusBar.currentHeight ?? 0, backgroundColor: color.surface },
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24, color: color.onSurface },
  title: { flex: 1, paddingHorizontal: 4, fontSize: 22, color: color.onSurface },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  header: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  appName: { fontSize: 28, color: color.onSurface },
  label: { fontSize: 14, color: color.onSurfaceVariant },
  body: { fontSize: 16, color: color.onSurface },
  bodyVariant: { fontSize: 16, color: color.onSurfaceVariant, textAlign: 'center' },
  filledCard: { borderRadius: 12, backgroundColor: color.surfaceContainerHighest },
  row: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.outlineVariant },
  outlinedCard: { gap: 4, borderRadius: 12, borderWidth: 1, borderColor: color.outlineVariant, padding: 16 },
  cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '500', color: color.onSurface },
  small: { fontSize: 12, color: color.onSurfaceVariant },
  link: { color: color.primary, textDecorationLine: 'underline' },
  menu: {
    position: 'absolute',
    top: 56,
    right: 8,
    borderRadius: 4,
    backgroundColor: color.surfaceContainer,
    paddingVertical: 8,
    elevation: 3,
  },
  menuItem: { minWidth: 160, height: 48, paddingHorizontal: 12, justifyContent: 'center' },
  product: { minHeight: 56, paddingHorizontal: 16, justifyContent: 'center' },
})

const link = (href: string, text: string): ReactNode => (
  <Text
    key={href}
    style={styles.link}
    accessibilityRole='link'
    onPress={() => Linking.openURL(href)}
  >
    {text}
  </Text>
)

const row = (key: string, content: ReadonlyArray<ReactNode>, isFirst = false): ReactNode => (
  <Box key={key} style={[styles.row, isFirst ? undefined : styles.divider]}>
    <Text style={styles.body}>{content}</Text>
  </Box>
)

const card = (card: About.LicenseCard): ReactNode => (
  <Box key={card.key} style={styles.outlinedCard}>
    <Box style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={styles.cardTitle}>{card.title}</Text>
      {Opt.match(card.maybeLicenses, {
        onNone: () => null,
        onSome: (licenses) => <Text style={styles.small}>{licenses}</Text>,
      })}
    </Box>
    {Opt.match(card.maybeDescription, {
      onNone: () => null,
      onSome: (description) => <Text style={styles.body}>{description}</Text>,
    })}
    {card.lines.map((line) => <Text key={line} style={styles.small}>{line}</Text>)}
    {Opt.match(card.maybeRepository, {
      onNone: () => null,
      onSome: (url) => <Text style={[styles.small, styles.link]} numberOfLines={1}>{url}</Text>,
    })}
  </Box>
)

export const about: View<About.Model, About.Message> = (model, dispatch) => {
  const on = send(dispatch)
  return (
    <Box style={styles.page}>
      <Box style={[styles.bar, { backgroundColor: model.isAtTop ? color.surface : color.surfaceContainer }]}>
        <Pressable style={styles.iconButton} accessibilityLabel='Back' onPress={on(model.back)}>
          <Text style={styles.icon}>←</Text>
        </Pressable>
        <Text accessibilityRole='header' style={styles.title}>About</Text>
      </Box>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => on(model.scroll(event.nativeEvent.contentOffset.y))()}
      >
        <Box style={styles.header}>
          <Text style={styles.appName}>Fridgy</Text>
          {model.version._tag === 'Loading' ? null : <Text style={styles.label}>Version {model.version.version}</Text>}
          <Text style={styles.bodyVariant}>Keep track of what is in your fridge and when it expires.</Text>
        </Box>
        <Box style={styles.filledCard}>
          {row('license', [
            'Free software, released under the ',
            link('https://spdx.org/licenses/AGPL-3.0-or-later.html', 'AGPL-3.0-or-later'),
            ' license.',
          ], true)}
          {row('code', ['The source code is on ', link('https://github.com/fgaudo/fridgy', 'GitHub'), '.'])}
          {row('barcode', [
            'Product names from ',
            link('https://openfoodfacts.org', 'Open Food Facts'),
            ', under the ',
            link('https://opendatacommons.org/licenses/odbl/1-0/', 'Open Database License'),
            '.',
          ])}
          {row('privacy', [
            'Your products stay on your phone: read the ',
            link('https://github.com/fgaudo/fridgy/blob/main/PRIVACY.md', 'privacy policy'),
            '.',
          ])}
        </Box>
        <Text style={[styles.small, { textAlign: 'center' }]}>© 2024–2026 Francesco Gaudenzi</Text>
        <Text accessibilityRole='header' style={[styles.title, { paddingHorizontal: 0 }]}>
          Open source libraries
        </Text>
        {model.licenses._tag === 'Loading' ? null : model.licenses.cards.map(card)}
      </ScrollView>
    </Box>
  )
}

const productName = Match.typeTags<ProductModel>()({
  Corrupt: ({ maybeName }) => Opt.getOrElse(maybeName, () => '(corrupt)'),
  Invalid: ({ maybeName }) => Opt.getOrElse(maybeName, () => '(invalid)'),
  Valid: ({ name }) => name,
})

const home: View<Home.Model, Home.Message> = (model, dispatch) => {
  const on = send(dispatch)
  const { list } = model.products
  return (
    <Box style={styles.page}>
      <Box style={styles.bar}>
        <Text accessibilityRole='header' style={[styles.title, { paddingHorizontal: 12 }]}>Fridgy</Text>
        <Pressable
          style={styles.iconButton}
          accessibilityLabel='Menu'
          onPress={on(model.menu._tag === 'Closed' ? model.menu.open : model.menu.close)}
        >
          <Text style={styles.icon}>⋮</Text>
        </Pressable>
      </Box>
      <ScrollView>
        {list._tag === 'Available'
          ? list.products.map((product, index) => (
            <Box key={index} style={styles.product}>
              <Text style={styles.body}>{productName(product)}</Text>
            </Box>
          ))
          : <Text style={[styles.bodyVariant, { padding: 32 }]}>{list._tag}</Text>}
      </ScrollView>
      {model.menu._tag === 'Open'
        ? (
          <Box style={styles.menu}>
            <Pressable style={styles.menuItem} accessibilityRole='menuitem' onPress={on(model.menu.requestInfo)}>
              <Text style={styles.body}>About</Text>
            </Pressable>
          </Box>
        )
        : null}
    </Box>
  )
}

export const view: View<Model, Message> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => home(model, Tea.dispatchTo(dispatch, 'Home')),
    About: ({ model }) => about(model, Tea.dispatchTo(dispatch, 'About')),
    AddProducts: () => <Text>Not in the prototype</Text>,
    EditProduct: () => <Text>Not in the prototype</Text>,
  })
