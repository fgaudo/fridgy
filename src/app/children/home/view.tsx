import * as Tea from '@fgaudo/effect-tea'
import { View as Box, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type Handlers, handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, elevation, icon, shape, type } from '#styles'
import * as Products from './children/products/view.tsx'
import type { Message, Model } from './program.ts'

const styles = StyleSheet.create({
  // Edge to edge: the page keeps clear of the system bars, and draws its surface under them.
  page: { flex: 1, backgroundColor: color.surface },
  // What an absolute position is measured from: inside the bars.
  frame: { flex: 1 },
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, zIndex: 2 },
  titles: { flex: 1, paddingHorizontal: 12 },
  title: { ...type.titleLargeEmphasized },
  subtitle: { ...type.labelMedium },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFill, zIndex: 1 },
  menu: {
    position: 'absolute',
    top: 56,
    right: 4,
    zIndex: 2,
    minWidth: 112,
    paddingVertical: 8,
    borderRadius: shape.extraSmall,
    backgroundColor: color.surfaceContainer,
    elevation: elevation.level2,
  },
  menuItem: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 24 },
  menuItemText: { ...type.labelLarge, color: color.onSurface },
  bottom: { position: 'absolute', right: 0, bottom: 16, left: 0, gap: 16, alignItems: 'flex-end' },
  snackbarSlot: { alignSelf: 'stretch' },
  fab: {
    height: 56,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: shape.large,
    backgroundColor: color.primaryContainer,
    elevation: elevation.level3,
  },
  fabLabel: { ...type.labelLarge, color: color.onPrimaryContainer },
})

/**
 * Material's extended FAB: an icon and its action. While the list scrolls it is the icon alone, to leave the products
 * in view.
 */
const addButton = (model: Model, { on }: Handlers<Message>) => (
  <Pressable accessibilityRole='button' accessibilityLabel='Add products' style={styles.fab} onPress={on(model.add)}>
    {icon('barcode_scanner', color.onPrimaryContainer)}
    {model.isInteracting ? null : <Text style={styles.fabLabel}>Add products</Text>}
  </Pressable>
)

/** Material's menu, under the bar's trailing icon button; a tap anywhere else closes it. */
const menu = (menu: Model['menu'], { on }: Handlers<Message>) =>
  menu._tag === 'Open'
    ? [
      <Pressable key='scrim' accessible={false} style={styles.scrim} onPress={on(menu.close)} />,
      <Box key='menu' style={styles.menu}>
        <Pressable accessibilityRole='menuitem' style={styles.menuItem} onPress={on(menu.requestInfo)}>
          {icon('info', color.onSurfaceVariant)}
          <Text style={styles.menuItemText}>About</Text>
        </Pressable>
      </Box>,
    ]
    : []

/**
 * The page: Material's small top app bar, the products' list under it, and the FAB with the snackbar above it. The
 * contextual bar of the selected products takes the bar's place, in its own colors.
 */
export const view: View<Model, Message> = (model, dispatch) => {
  const events = handlers(dispatch)
  const { on } = events
  const toProducts = Tea.dispatchTo(dispatch, 'Products')
  const selection = Products.selectionBar(model.products, toProducts)
  const subtitle = Products.subtitle(model.products)
  const snackbar = Products.snackbar(model.products, toProducts)
  const onBar = selection === undefined ? color.onSurface : color.onSecondaryContainer
  return (
    <SafeAreaView style={styles.page}>
      <Box style={styles.frame}>
        <Box
          style={[styles.bar, { backgroundColor: selection === undefined ? color.surface : color.secondaryContainer }]}
        >
          {selection === undefined ? null : selection.leading}
          <Box style={styles.titles}>
            <Text accessibilityRole='header' numberOfLines={1} style={[styles.title, { color: onBar }]}>
              {selection === undefined ? 'Fridgy' : selection.title}
            </Text>
            {subtitle === undefined ? null : (
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: selection === undefined ? color.onSurfaceVariant : onBar }]}
              >
                {subtitle}
              </Text>
            )}
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
        <ScrollView overScrollMode='never' scrollEnabled={model.menu._tag === 'Closed'}>
          {Products.list(model.products, toProducts)}
        </ScrollView>
        <Box pointerEvents='box-none' style={styles.bottom}>
          {snackbar === undefined ? null : <Box style={styles.snackbarSlot}>{snackbar}</Box>}
          {addButton(model, events)}
        </Box>
        {menu(model.menu, events)}
      </Box>
    </SafeAreaView>
  )
}
