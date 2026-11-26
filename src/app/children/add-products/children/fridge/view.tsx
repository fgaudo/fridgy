import * as Arr from 'effect/Array'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { View as Box, type ColorValue, StyleSheet, Text } from 'react-native'
import Animated, {
  type EntryAnimationsValues,
  Keyframe,
  type LayoutAnimation,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import type { Product } from '#domain/product.ts'
import * as Day from '#libs/dates/day.ts'
import type { View } from '#libs/tea-react/tea-react.ts'
import { color, duration, easing, shape, type } from '#styles'
import type { ArrivalShown, Due, Message, Model } from './program.ts'

// No weekday: a date read off a package has none.
const formatDay = (date: Day.Day) => Day.format(date, { day: 'numeric', month: 'short', year: 'numeric' })

const styles = StyleSheet.create({
  // Heard, not seen: the products' flight shows what was added.
  announcement: { position: 'absolute', opacity: 0 },
  // Centred above the FAB and its margin.
  stage: { ...StyleSheet.absoluteFill, bottom: 72, alignItems: 'center', justifyContent: 'center' },
  // 96dp tall, smaller when the keyboard leaves less room.
  fridge: { height: 96, maxHeight: '100%', aspectRatio: 5 / 8, transformOrigin: 'bottom' },
  body: { flex: 1, transformOrigin: 'bottom' },
  freezer: {
    flex: 1,
    borderWidth: 1.5,
    borderTopLeftRadius: shape.small,
    borderTopRightRadius: shape.small,
    borderColor: color.primary,
    backgroundColor: color.primaryContainer,
  },
  compartment: {
    flex: 2,
    marginTop: -1.5,
    borderWidth: 1.5,
    borderBottomLeftRadius: shape.small,
    borderBottomRightRadius: shape.small,
    borderColor: color.primary,
    // Lit: the lightest of the surfaces, under any disc.
    backgroundColor: color.surfaceContainerLowest,
  },
  // Over the compartment's border, hinged on its right.
  door: {
    position: 'absolute',
    top: -1.5,
    right: -1.5,
    bottom: -1.5,
    left: -1.5,
    borderWidth: 1.5,
    borderBottomLeftRadius: shape.small,
    borderBottomRightRadius: shape.small,
    borderColor: color.primary,
    backgroundColor: color.primaryContainer,
    transformOrigin: 'right',
  },
  handle: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 4,
    height: 16,
    borderRadius: shape.full,
    backgroundColor: color.onPrimaryContainer,
  },
  doorHandle: { top: 12, height: 24 },
  slot: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // Home's disc, without its ring. Where it rests, inside: the flight ends there, and never shows it.
  disc: {
    width: 40,
    height: 40,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transform: [{ scale: 0.2 }],
  },
  discDay: { ...type.titleSmall, lineHeight: 16 },
  discMonth: { ...type.labelSmall, lineHeight: 12 },
})

// The product entering the fridge (`docs/product-flight.md`). The fridge appears, its door opens, each product's
// disc comes in from the left edge and shrinks into it. The door closes behind the last, and the fridge settles.
const fridgeAppearing = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: easing.emphasizedDecelerate },
}).duration(duration.medium2)

const fridgeLeaving = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0, easing: easing.standardAccelerate },
}).duration(duration.short4)

const fridgeSettling = new Keyframe({
  0: { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
  30: { transform: [{ translateY: -6 }, { rotate: '-3deg' }], easing: easing.standard },
  65: { transform: [{ translateY: 0 }, { rotate: '2deg' }], easing: easing.standard },
  100: { transform: [{ translateY: 0 }, { rotate: '0deg' }], easing: easing.standard },
})
  .delay(duration.short4)
  .duration(duration.medium1)

// The door turns out of the fridge, in a perspective.
const doorClosed = [{ perspective: 300 }, { rotateY: '0deg' }]

const doorOpen = [{ perspective: 300 }, { rotateY: '100deg' }]

const doorOpening = (from: Model & { _tag: 'Open' }) => {
  const opening = new Keyframe({
    0: { transform: doorClosed },
    100: { transform: doorOpen, easing: easing.standard },
  }).duration(duration.short4)
  // Once the fridge has appeared.
  return from.opening === 'WithFridge' ? opening.delay(duration.medium2) : opening
}

const doorClosing = new Keyframe({
  0: { transform: doorOpen },
  100: { transform: doorClosed, easing: easing.standard },
}).duration(duration.short4)

/**
 * A disc's flight into the compartment, where it shrinks and fades in the last `short4`. It starts a window's width to
 * the left, past the edge: its global origin reads 0 when the fridge mounts with it. One that brings the fridge waits
 * for it to appear.
 */
const flight = (delay: number) => (values: EntryAnimationsValues): LayoutAnimation => {
  'worklet'
  const shrinking = delay + duration.long2 - duration.short4
  const shrink = { duration: duration.short4, easing: easing.emphasizedAccelerate }
  return {
    initialValues: {
      opacity: 1,
      transform: [{ translateX: -values.windowWidth }, { scale: 1 }],
    },
    animations: {
      opacity: withDelay(shrinking, withTiming(0, shrink)),
      transform: [
        {
          translateX: withDelay(
            delay,
            withTiming(0, { duration: duration.long2, easing: easing.emphasizedDecelerate }),
          ),
        },
        { scale: withDelay(shrinking, withTiming(0.2, shrink)) },
      ],
    },
  }
}

const flights = { WithFridge: flight(duration.medium2), IntoOpenFridge: flight(0) } as const

/** The last product added, heard by a screen reader from a live region, which is announced when its text changes. */
const announcement = (model: Model) => (
  <Text accessibilityLiveRegion='polite' style={styles.announcement}>
    {Match.valueTags(model, {
      Away: () => '',
      Open: ({ arrivals }) => announced(Arr.lastNonEmpty(arrivals).product),
      Closing: ({ last }) => announced(last),
    })}
  </Text>
)

const announced = ({ name, maybeExpirationDate }: Product) =>
  `${name} added. ${
    Opt.match(maybeExpirationDate, {
      onNone: () => 'No expiration',
      onSome: (date) => `Expires ${formatDay(date)}`,
    })
  }`

type Colors = Readonly<{ fill: ColorValue; text: ColorValue }>

/** The colors of Home's disc, by when the product is due (`docs/freshness.md`). */
const dueColors: Readonly<Record<Due['_tag'], Colors>> = {
  Never: { fill: color.surfaceContainerHighest, text: color.onSurface },
  Now: { fill: color.errorContainer, text: color.onErrorContainer },
  Soon: { fill: color.primaryContainer, text: color.onPrimaryContainer },
  Later: { fill: color.tertiaryContainer, text: color.onTertiaryContainer },
}

/**
 * A product's disc, as Home's list draws it: its expiration day and month, or an infinity sign when it never ends. Its
 * text keeps its size whatever the font, as Home's does.
 */
const disc = ({ entrance, due }: ArrivalShown) => {
  const { fill, text } = dueColors[due._tag]
  return (
    <Animated.View entering={flights[entrance]} style={[styles.disc, { backgroundColor: fill }]}>
      {due._tag === 'Never'
        ? <Text allowFontScaling={false} style={[type.titleMedium, { color: text }]}>∞</Text>
        : [
          <Text key='day' allowFontScaling={false} style={[styles.discDay, { color: text }]}>
            {Day.toParts(due.expirationDate).day}
          </Text>,
          <Text key='month' allowFontScaling={false} style={[styles.discMonth, { color: text }]}>
            {Day.format(due.expirationDate, { month: 'short' })}
          </Text>,
        ]}
    </Animated.View>
  )
}

/**
 * The fridge, while products enter it: each product's disc flies into its compartment, between the inside and the
 * door. Its body is drawn anew as it starts closing, which plays the settle.
 */
const fridge = (model: Model) =>
  model._tag === 'Away' ? null : (
    <Box
      key='stage'
      pointerEvents='none'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={styles.stage}
    >
      <Animated.View
        key={`fridge-${model.visit}`}
        entering={fridgeAppearing}
        exiting={fridgeLeaving}
        style={styles.fridge}
      >
        <Animated.View
          key={model._tag}
          {...(model._tag === 'Closing' ? { entering: fridgeSettling } : {})}
          style={styles.body}
        >
          <Box style={styles.freezer}>
            <Box style={styles.handle} />
          </Box>
          <Box style={styles.compartment}>
            {model._tag === 'Open'
              ? model.arrivals.map((arrival) => (
                <Box key={`product-${arrival.id}`} style={styles.slot}>{disc(arrival)}</Box>
              ))
              : null}
            <Animated.View
              entering={model._tag === 'Open' ? doorOpening(model) : doorClosing}
              style={[styles.door, { transform: model._tag === 'Open' ? doorOpen : doorClosed }]}
            >
              <Box style={[styles.handle, styles.doorHandle]} />
            </Animated.View>
          </Box>
        </Animated.View>
      </Animated.View>
    </Box>
  )

/**
 * The announcement of the last product added, and the fridge, as siblings for the room of the page that places them,
 * which they fill. It sends nothing.
 */
export const view: View<Model, Message> = (model) => (
  <>
    {announcement(model)}
    {fridge(model)}
  </>
)
