import type { Dispatch } from '@fgaudo/effect-tea'
import type * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import { Fragment, type ReactNode } from 'react'
import { View as Box, type ColorValue, Pressable, StyleSheet, Text } from 'react-native'
import Animated, {
  type EntryAnimationsValues,
  FadeOut,
  type LayoutAnimation,
  LayoutAnimationConfig,
  type LayoutAnimationsValues,
  LinearTransition,
  withTiming,
} from 'react-native-reanimated'
import * as Day from '#libs/dates/day.ts'
import { type Handlers, handlers } from '#libs/tea-react/tea-react.ts'
import { color, duration, easing, elevation, icon, motion, shape, type } from '#styles'
import type {
  ItemSelection,
  ListModel,
  Message,
  Model,
  Presence,
  ProductModel,
  ProductStatus,
  Settling,
} from './program.ts'

type Look = 'Plain' | 'Error'

const styles = StyleSheet.create({
  row: { overflow: 'hidden' },
  rowClosed: { height: 0, opacity: 0 },
  avatar: { width: 40, height: 40, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  avatarDay: { ...type.titleSmall, lineHeight: 16 },
  avatarMonth: { ...type.labelSmall, lineHeight: 12 },
  item: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 24,
  },
  itemText: { flex: 1 },
  headline: { ...type.bodyLarge },
  supporting: { ...type.bodyMedium },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  snackbar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: shape.extraSmall,
    backgroundColor: color.inverseSurface,
    elevation: elevation.level3,
  },
  snackbarText: { ...type.bodyMedium, flex: 1, paddingVertical: 14, color: color.inverseOnSurface },
  snackbarAction: { height: 40, paddingHorizontal: 12, justifyContent: 'center' },
  snackbarActionText: { ...type.labelLarge, color: color.inversePrimary },
  emptyLayer: { position: 'absolute', top: 0, right: 0, left: 0 },
  emptyState: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 128 },
  emptyDisc: {
    width: 96,
    height: 96,
    marginBottom: 8,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...type.headlineSmall, textAlign: 'center', color: color.onSurface },
  emptyText: { ...type.bodyLarge, textAlign: 'center', color: color.onSurfaceVariant },
  list: { paddingBottom: 96 },
})

type Colors = Readonly<{ fill: ColorValue; text: ColorValue }>

const neutral: Colors = { fill: color.surfaceContainerHighest, text: color.onSurface }

const errorColors: Colors = { fill: color.errorContainer, text: color.onErrorContainer }

/**
 * The colors of a product's freshness, green through orange to red: the role nearest to its life left, where the
 * web build mixed the two around it. The green holds through the first quarter, the red from the last.
 */
const freshnessColors = (freshness: number): Colors =>
  freshness >= 0.625
    ? { fill: color.tertiaryContainer, text: color.onTertiaryContainer }
    : freshness >= 0.375
    ? { fill: color.primaryContainer, text: color.onPrimaryContainer }
    : errorColors

/** A disc, the list item's leading avatar. */
const disc = ({ fill, text }: Colors, content: (tint: ColorValue) => ReactNode) => (
  <Box style={[styles.avatar, { backgroundColor: fill }]}>{content(text)}</Box>
)

/** The expiration day and month. */
const expirationDay = (expirationDate: Day.Day) => (tint: ColorValue) => [
  <Text key='day' style={[styles.avatarDay, { color: tint }]}>{Day.toParts(expirationDate).day}</Text>,
  <Text key='month' style={[styles.avatarMonth, { color: tint }]}>
    {Day.format(expirationDate, { month: 'short' })}
  </Text>,
]

/** The expiration day on a disc colored by the life left; an infinity sign on a neutral disc when it never ends. */
const freshnessBadge = (status: ProductStatus): ReactNode => {
  switch (status._tag) {
    case 'Everlasting':
      return disc(neutral, (tint) => <Text style={[type.titleMedium, { color: tint }]}>∞</Text>)
    case 'Stale':
    case 'ExpiredYesterday':
      return disc(freshnessColors(0), expirationDay(status.expirationDate))
    case 'ExpiringToday':
    case 'ExpiringTomorrow':
    case 'Fresh':
      return disc(freshnessColors(status.freshness), expirationDay(status.expirationDate))
  }
}

const supportingText = (status: ProductStatus) => {
  switch (status._tag) {
    case 'Everlasting':
      return 'No expiration'
    case 'Stale':
      return `Expired ${status.daysAgo} days ago`
    case 'ExpiredYesterday':
      return 'Expired yesterday'
    case 'ExpiringToday':
      return 'Expires today'
    case 'ExpiringTomorrow':
      return 'Expires tomorrow'
    case 'Fresh':
      return `Expires in ${status.inDays} days`
  }
}

/** The list item's leading avatar, which turns into a check once the item is selected, as Material's lists do. */
const avatar = (selection: ItemSelection, badge: ReactNode) =>
  selection.isSelected
    ? disc({ fill: color.primary, text: color.onPrimary }, (tint) => icon('check', tint))
    : badge

const opening = { duration: duration.medium4, easing: easing.emphasizedDecelerate }

const closing = { duration: duration.short4, easing: easing.emphasizedAccelerate }

// The choreography of Home's rows, in `docs/motion.md`. A row's frame clips its item, so its height uncovers it.
const rowMotion = {
  arriving: (values: EntryAnimationsValues): LayoutAnimation => {
    'worklet'
    return {
      initialValues: { height: 0, opacity: 0 },
      animations: { height: withTiming(values.targetHeight, opening), opacity: withTiming(1, opening) },
    }
  },
  leaving: (values: LayoutAnimationsValues): LayoutAnimation => {
    'worklet'
    return {
      initialValues: {
        originX: values.currentOriginX,
        originY: values.currentOriginY,
        width: values.currentWidth,
        height: values.currentHeight,
        opacity: 1,
      },
      animations: {
        originX: withTiming(values.targetOriginX, closing),
        originY: withTiming(values.targetOriginY, closing),
        width: withTiming(values.targetWidth, closing),
        height: withTiming(values.targetHeight, closing),
        opacity: withTiming(0, closing),
      },
    }
  },
  // A layout animation moves its own view only: the rows that stay follow the one that opens or closes.
  staying: {
    Still: {},
    Opening: { layout: LinearTransition.duration(opening.duration).easing(opening.easing) },
    Closing: { layout: LinearTransition.duration(closing.duration).easing(closing.easing) },
  },
} as const

/** What fades out of the list's place: the list over the empty state, the empty state under the rows put back. */
const fadingOut = FadeOut.duration(duration.short4).easing(easing.emphasizedAccelerate)

/**
 * Material's two-line list item, with a leading avatar: 72dp at least, taller when a large font wraps the supporting
 * text. A long press selects it; a tap does what the model says. A row leaving is drawn closed, its frame and
 * opacity at 0, and its layout transition plays the change.
 */
const item = (
  key: string,
  selection: ItemSelection,
  presence: Presence,
  settling: Settling,
  badge: ReactNode,
  headline: string,
  supporting: string,
  look: Look,
  { on }: Handlers<Message>,
) => (
  <Animated.View
    key={key}
    {...(presence === 'Leaving' ? { layout: rowMotion.leaving } : rowMotion.staying[settling])}
    {...(presence === 'Arriving' ? { entering: rowMotion.arriving } : {})}
    style={[styles.row, presence === 'Leaving' ? styles.rowClosed : undefined]}
  >
    <Pressable
      accessibilityState={{ selected: selection.isSelected }}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: selection.isSelected
            ? color.secondaryContainer
            : pressed
            ? color.surfaceContainerHighest
            : color.surface,
        },
      ]}
      onLongPress={Opt.match(selection.maybeToggle, { onNone: () => undefined, onSome: on })}
      onPress={Opt.match(selection.maybeTap, { onNone: () => undefined, onSome: on })}
    >
      {avatar(selection, badge)}
      <Box style={styles.itemText}>
        <Text
          numberOfLines={1}
          style={[styles.headline, { color: selection.isSelected ? color.onSecondaryContainer : color.onSurface }]}
        >
          {headline}
        </Text>
        <Text style={[styles.supporting, { color: look === 'Error' ? color.error : color.onSurfaceVariant }]}>
          {supporting}
        </Text>
      </Box>
    </Pressable>
  </Animated.View>
)

/** The avatar of stored data that is not a product: an icon, in the error's tonal colors. */
const errorBadge = (name: string) => disc(errorColors, (tint) => icon(name, tint))

/** Stored data that is not a product: it can still be selected and deleted, so that the list can be cleaned. */
const invalidItem = (
  product: Data.TaggedEnum.Value<ProductModel, 'Invalid'>,
  settling: Settling,
  events: Handlers<Message>,
) =>
  item(
    product.id,
    product.selection,
    product.presence,
    settling,
    errorBadge('error'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Not a valid product',
    'Error',
    events,
  )

/** Stored data that cannot even be referenced: nothing can be done with it. */
const corruptItem = (
  product: Data.TaggedEnum.Value<ProductModel, 'Corrupt'>,
  index: number,
  settling: Settling,
  events: Handlers<Message>,
) =>
  item(
    `corrupt-${index}`,
    { isSelected: false, maybeToggle: Opt.none(), maybeTap: Opt.none() },
    'Listed',
    settling,
    errorBadge('broken_image'),
    Opt.getOrElse(product.maybeName, () => 'Unnamed product'),
    'Cannot be read',
    'Error',
    events,
  )

const validItem = (
  product: Data.TaggedEnum.Value<ProductModel, 'Valid'>,
  settling: Settling,
  events: Handlers<Message>,
) =>
  item(
    product.id,
    product.selection,
    product.presence,
    settling,
    freshnessBadge(product.status),
    product.name,
    supportingText(product.status),
    product.status._tag === 'Stale' || product.status._tag === 'ExpiredYesterday' ? 'Error' : 'Plain',
    events,
  )

const iconButton = (name: string, label: string, message: Message | undefined, { on }: Handlers<Message>) => (
  <Pressable
    accessibilityRole='button'
    accessibilityLabel={label}
    accessibilityState={{ disabled: message === undefined }}
    style={styles.iconButton}
    onPress={message === undefined ? undefined : on(message)}
  >
    {icon(name, message === undefined ? color.onSurfaceVariant : color.onSecondaryContainer)}
  </Pressable>
)

/** The pieces of the contextual top app bar: its leading and trailing icon buttons, and its title. */
export type SelectionBar = Readonly<{ leading: ReactNode; title: string; trailing: ReactNode }>

/** Material's contextual top app bar, as pieces Home draws in its bar's shape. Nothing while no product is selected. */
export const selectionBar = (model: Model, dispatch: Dispatch<Message>): SelectionBar | undefined => {
  if (model.list._tag !== 'Available' || model.list.deletion._tag === 'NothingSelected') {
    return undefined
  }
  const events = handlers(dispatch)
  const { deletion } = model.list
  return {
    leading: iconButton(
      'close',
      'Clear selection',
      deletion._tag === 'Possible' ? deletion.clearSelection : undefined,
      events,
    ),
    title: deletion._tag === 'Possible' ? `${deletion.count} selected` : 'Deleting…',
    trailing: iconButton(
      'delete',
      'Delete',
      deletion._tag === 'Possible' ? deletion.deleteSelected : undefined,
      events,
    ),
  }
}

type Notice = Data.TaggedEnum.Value<Model['snackbar'], 'Shown'>['notice']

const noticeText = (notice: Notice) => {
  switch (notice._tag) {
    case 'Deleted':
      return notice.count === 1 ? 'Product deleted' : `${notice.count} products deleted`
    case 'DeleteFailed':
      return 'Couldn\'t delete the products'
    case 'RestoreFailed':
      return 'Couldn\'t put the products back'
  }
}

/** Material's snackbar, keyed by what it tells so that the next one is drawn anew. */
export const snackbar = (model: Model, dispatch: Dispatch<Message>): ReactNode | undefined => {
  if (model.snackbar._tag === 'None') {
    return undefined
  }
  const { on } = handlers(dispatch)
  const { at, notice, entrance } = model.snackbar
  return (
    <Animated.View
      key={`${notice._tag}-${DateTime.toEpochMillis(at)}`}
      entering={motion.snackbar.entering[entrance]}
      exiting={motion.snackbar.exiting}
      accessibilityLiveRegion='polite'
      style={styles.snackbar}
    >
      <Text style={styles.snackbarText}>{noticeText(notice)}</Text>
      {notice._tag === 'Deleted'
        ? Opt.match(notice.maybeUndo, {
          onNone: () => null,
          onSome: (undo) => (
            <Pressable accessibilityRole='button' style={styles.snackbarAction} onPress={on(undo)}>
              <Text style={styles.snackbarActionText}>Undo</Text>
            </Pressable>
          ),
        })
        : null}
    </Animated.View>
  )
}

/** Material's empty state: what is missing, as an icon on a disc in a role's container colors, and what to do about it. */
const emptyState = (key: string, colors: Colors, name: string, title: string, text: string) => (
  <Animated.View key={key} exiting={fadingOut} style={styles.emptyState}>
    <Box style={[styles.emptyDisc, { backgroundColor: colors.fill }]}>
      {icon(name, colors.text, { fontSize: 36, lineHeight: 36 })}
    </Box>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </Animated.View>
)

const subtitleOf = (list: Data.TaggedEnum.Value<ListModel, 'Available'>) =>
  list.total === 1 ? '1 item' : `${list.total} items`

/** The top app bar's subtitle, in the bar so that it stays in view while the list scrolls. Nothing without a list. */
export const subtitle = (model: Model): string | undefined =>
  model.list._tag === 'Available' ? subtitleOf(model.list) : undefined

/** The rows of the list, wrapped so that a row arriving opens its place even as Home enters. */
const rows = (list: Data.TaggedEnum.Value<ListModel, 'Available'>, events: Handlers<Message>) => (
  <LayoutAnimationConfig skipEntering={false}>
    <Animated.View key='list' exiting={fadingOut} style={styles.list}>
      {list.products.map((product, index) => {
        switch (product._tag) {
          case 'Valid':
            return validItem(product, list.settling, events)
          case 'Invalid':
            return invalidItem(product, list.settling, events)
          case 'Corrupt':
            return corruptItem(product, index, list.settling, events)
        }
      })}
    </Animated.View>
  </LayoutAnimationConfig>
)

const missing = (list: ListModel) => {
  switch (list._tag) {
    case 'Initial':
    case 'Available':
      return null
    case 'Error':
      return emptyState('error', errorColors, 'error', 'Could not load the products', 'Try opening Fridgy again.')
    case 'Empty':
      return emptyState(
        'empty',
        { fill: color.primaryContainer, text: color.onPrimaryContainer },
        'kitchen',
        'Nothing in the fridge',
        'Add what you buy with the button below.',
      )
  }
}

/**
 * The list, or why there is none. Each is a layer, the list over the empty state: what leaves stays in its layer,
 * over or under what takes its place.
 */
export const list = (model: Model, dispatch: Dispatch<Message>): ReactNode => (
  <Fragment>
    <Box key='missing' collapsable={false} pointerEvents='box-none' style={styles.emptyLayer}>
      {missing(model.list)}
    </Box>
    <Box key='rows' collapsable={false}>
      {model.list._tag === 'Available' ? rows(model.list, handlers(dispatch)) : null}
    </Box>
  </Fragment>
)
