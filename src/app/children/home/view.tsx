import * as Tea from '@fgaudo/effect-tea'
import { View as Box, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, Keyframe, LinearTransition } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type Handlers, handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, duration, easing, elevation, icon, shape, type } from '#styles'
import * as Products from './children/products/view.tsx'
import type { Message, Model } from './program.ts'

const styles = StyleSheet.create({
  // Edge to edge: the page keeps clear of the system bars, and draws its surface under them.
  page: { flex: 1, backgroundColor: color.surface },
  // What an absolute position is measured from: inside the bars.
  frame: { flex: 1 },
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, zIndex: 2 },
  scrolled: { ...StyleSheet.absoluteFill, backgroundColor: color.surfaceContainer },
  titles: { flex: 1, paddingHorizontal: 12 },
  title: { ...type.titleLargeEmphasized },
  subtitle: { ...type.labelMedium },
  // The medium bar's lower row: as tall as its text, which grows with the user's font size.
  headline: { minHeight: 48, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 20 },
  headlineTitle: { ...type.headlineMediumEmphasized },
  headlineSubtitle: { ...type.labelLarge },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFill, zIndex: 1 },
  menu: {
    position: 'absolute',
    top: 56,
    right: 4,
    zIndex: 2,
    minWidth: 112,
    paddingVertical: 8,
    // It grows from the icon button that opens it.
    transformOrigin: 'top right',
    borderRadius: shape.extraSmall,
    backgroundColor: color.surfaceContainer,
    elevation: elevation.level2,
  },
  menuItem: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 24 },
  menuItemText: { ...type.labelLarge, color: color.onSurface },
  // 16dp above the FAB. Its size never changes: a snackbar that leaves keeps its place in it.
  snackbarLayer: { position: 'absolute', top: 0, right: 0, bottom: 88, left: 0, justifyContent: 'flex-end' },
  fabSlot: { position: 'absolute', right: 0, bottom: 16 },
  fab: {
    marginRight: 16,
    overflow: 'hidden',
    borderRadius: shape.large,
    backgroundColor: color.primaryContainer,
    elevation: elevation.level3,
  },
  fabContent: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  fabLabel: { ...type.labelLarge, marginLeft: 12, color: color.onPrimaryContainer },
})

// The curves of Compose's medium top app bar: its small title shows late, its color darkens early.
const titleAlpha = Easing.bezier(0.8, 0, 0.8, 0.15).factory()

const containerAlpha = Easing.bezier(0.4, 0, 1, 1).factory()

const labelEntering = FadeIn.duration(duration.short4).easing(easing.standardDecelerate).delay(duration.short2)

const labelExiting = FadeOut.duration(duration.short2).easing(easing.standardAccelerate)

const fabGrowing = LinearTransition.duration(duration.medium4).easing(easing.emphasizedDecelerate)

const fabShrinking = LinearTransition.duration(duration.short4).easing(easing.emphasizedAccelerate)

/**
 * Material's extended FAB: an icon and its action. While the list scrolls it is the icon alone, to leave the products
 * in view.
 */
const addButton = (model: Model, { on }: Handlers<Message>) => (
  <Animated.View layout={model.fab._tag === 'Icon' ? fabShrinking : fabGrowing} style={styles.fab}>
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Add products'
      style={styles.fabContent}
      onPress={on(model.add)}
    >
      {icon('barcode_scanner', color.onPrimaryContainer)}
      {model.fab._tag === 'Icon' ? null : (
        <Animated.View key='label' entering={labelEntering} exiting={labelExiting}>
          <Text numberOfLines={1} style={styles.fabLabel}>Add products</Text>
        </Animated.View>
      )}
    </Pressable>
  </Animated.View>
)

const menuEntering = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.8 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: easing.emphasizedDecelerate },
}).duration(duration.medium4)

const menuExiting = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.8 }], easing: easing.emphasizedAccelerate },
}).duration(duration.short4)

/** Material's menu, under the bar's trailing icon button; a tap anywhere else closes it. */
const menu = (menu: Model['menu'], { on }: Handlers<Message>) =>
  menu._tag === 'Open'
    ? [
      <Pressable key='scrim' accessible={false} style={styles.scrim} onPress={on(menu.close)} />,
      <Animated.View key='menu' entering={menuEntering} exiting={menuExiting} style={styles.menu}>
        <Pressable accessibilityRole='menuitem' style={styles.menuItem} onPress={on(menu.requestInfo)}>
          {icon('info', color.onSurfaceVariant)}
          <Text style={styles.menuItemText}>About</Text>
        </Pressable>
      </Animated.View>,
    ]
    : []

/**
 * The page: Material's medium top app bar over the products' list, and the FAB with the snackbar above it. The bar's
 * lower row, the headline, is the top of the list: it fades as it scrolls out from under the small bar, whose title
 * and color fade in (`docs/motion.md`). The contextual bar of the selected products takes the bar's shape, in its
 * own colors.
 */
export const view: View<Model, Message> = (model, dispatch) => {
  const events = handlers(dispatch)
  const { on, onValue } = events
  const toProducts = Tea.dispatchTo(dispatch, 'Products')
  const selection = Products.selectionBar(model.products, toProducts)
  const subtitle = Products.subtitle(model.products)
  const snackbar = Products.snackbar(model.products, toProducts)
  const title = selection === undefined ? 'Fridgy' : selection.title
  const container = selection === undefined ? color.surface : color.secondaryContainer
  const onBar = selection === undefined ? color.onSurface : color.onSecondaryContainer
  const onBarVariant = selection === undefined ? color.onSurfaceVariant : onBar
  const layOutHeadline = onValue((height: number) => model.layOutHeadline(height))
  const layOutList = onValue((height: number) => model.layOutList(height))
  const sizeContent = onValue((height: number) => model.sizeContent(height))
  const scrolled = onValue((top: number) => model.scroll(top))
  // Over both rows of the bar, which are one surface. The selection's color does not change.
  const scrolledColor = selection === undefined
    ? <Box style={[styles.scrolled, { opacity: containerAlpha(model.collapse) }]} />
    : null
  return (
    <SafeAreaView style={styles.page}>
      <Box style={styles.frame}>
        <Box style={[styles.bar, { backgroundColor: container }]}>
          {scrolledColor}
          {selection === undefined ? null : selection.leading}
          {/* It repeats the headline, which a screen reader reads. */}
          <Box importantForAccessibility='no-hide-descendants' style={styles.titles}>
            <Box style={{ opacity: titleAlpha(model.collapse) }}>
              <Text numberOfLines={1} style={[styles.title, { color: onBar }]}>{title}</Text>
              {subtitle === undefined
                ? null
                : <Text numberOfLines={1} style={[styles.subtitle, { color: onBarVariant }]}>{subtitle}</Text>}
            </Box>
          </Box>
          {selection === undefined
            ? (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='More options'
                style={styles.iconButton}
                onPress={model.menu._tag === 'Closed' ? on(model.menu.open) : undefined}
              >
                {icon('more_vert', color.onSurface)}
              </Pressable>
            )
            : selection.trailing}
        </Box>
        <ScrollView
          key={model.listKey}
          overScrollMode='never'
          scrollEnabled={model.menu._tag === 'Closed'}
          scrollEventThrottle={16}
          snapToOffsets={model.snap._tag === 'Snapping' ? model.snap.offsets : undefined}
          snapToEnd={false}
          onLayout={(event) => layOutList(event.nativeEvent.layout.height)}
          onContentSizeChange={(_width, height) => sizeContent(height)}
          onScroll={(event) => scrolled(event.nativeEvent.contentOffset.y)}
          onScrollBeginDrag={on(model.startScroll)}
          onMomentumScrollEnd={on(model.endScroll)}
        >
          <Box
            style={[styles.headline, { backgroundColor: container }]}
            onLayout={(event) => layOutHeadline(event.nativeEvent.layout.height)}
          >
            {scrolledColor}
            <Box style={{ opacity: 1 - model.collapse }}>
              <Text accessibilityRole='header' numberOfLines={1} style={[styles.headlineTitle, { color: onBar }]}>
                {title}
              </Text>
              {subtitle === undefined
                ? null
                : <Text numberOfLines={1} style={[styles.headlineSubtitle, { color: onBarVariant }]}>{subtitle}</Text>}
            </Box>
          </Box>
          {Products.list(model.products, toProducts)}
        </ScrollView>
        <Box collapsable={false} pointerEvents='box-none' style={styles.snackbarLayer}>{snackbar}</Box>
        <Box style={styles.fabSlot}>{addButton(model, events)}</Box>
        {menu(model.menu, events)}
      </Box>
    </SafeAreaView>
  )
}
