import type { Dispatch } from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  View as Box,
  type ColorValue,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native'
import Animated, {
  type EntryAnimationsValues,
  FadeOut,
  Keyframe,
  type LayoutAnimation,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Product } from '#domain/product.ts'
import CameraPreview from '#infrastructure/barcode-camera/BarcodeCameraPreviewNativeComponent.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, duration, easing, elevation, icon, motion, shape, type } from '#styles'
import type {
  ArrivalShown,
  DateChoice,
  DateShown,
  Digit,
  Due,
  Failure,
  FridgeShown,
  Message,
  Model,
  NameShown,
  OrderChoice,
  Snackbar,
  Supporting,
} from './program.ts'

// No weekday: a date read off a package has none, and two chips must fit a row of the narrowest phone.
const formatDay = (date: Day.Day) => Day.format(date, { day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** How the digits are read in each order: the field's placeholder, the strip's hint and each segment's label. */
const placeholders: Readonly<Record<DateOrder, string>> = { DMY: 'DDMMYY', MDY: 'MMDDYY', YMD: 'YYMMDD' }

const hints: Readonly<Record<DateOrder, string>> = {
  DMY: 'Day and month, then year if needed',
  MDY: 'Month and day, then year if needed',
  YMD: 'Year if needed, then month and day',
}

const orderTitles: Readonly<Record<DateOrder, string>> = {
  DMY: 'Day, month, year',
  MDY: 'Month, day, year',
  YMD: 'Year, month, day',
}

// The page's bottom is held clear of the keyboard or of the navigation bar, whichever reaches further up: the
// keyboard's inset is the window's own, and covers the bar. The other edges only keep clear of their bar.
const edges = { top: 'additive', right: 'additive', bottom: 'maximum', left: 'additive' } as const

const styles = StyleSheet.create({
  // Edge to edge: the page keeps clear of the system bars, and draws its surface under them.
  page: { flex: 1, backgroundColor: color.surface },
  // What an absolute position is measured from: inside what the page keeps clear of.
  frame: { flex: 1 },
  layer: StyleSheet.absoluteFill,
  // Opaque: it covers the step under it.
  step: { ...StyleSheet.absoluteFill, backgroundColor: color.surface },
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  title: { ...type.titleLargeEmphasized, flex: 1, paddingHorizontal: 4, color: color.onSurface },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  column: { flexGrow: 1, gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  dateColumn: { flexGrow: 1, gap: 8, paddingHorizontal: 24 },
  field: {
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: shape.extraSmall,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  label: {
    ...type.bodySmall,
    position: 'absolute',
    top: -9,
    left: 12,
    paddingHorizontal: 4,
    backgroundColor: color.surface,
  },
  input: { ...type.bodyLarge, paddingVertical: 0, paddingRight: 40 },
  trailing: { position: 'absolute', right: 4 },
  supporting: { ...type.bodySmall, minHeight: 16, paddingHorizontal: 16, color: color.onSurfaceVariant },
  link: { color: color.primary, textDecorationLine: 'underline' },
  // The FAB's margin is Material's, and leaves its shadow inside the scroll, which clips what it holds.
  room: { flex: 1, minHeight: 80 },
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
  scanFab: {
    position: 'absolute',
    right: 0,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: shape.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: { gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  filledButton: {
    minHeight: 56,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  textButton: {
    minHeight: 40,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonLabel: { ...type.labelLarge },
  heading: { paddingHorizontal: 16, paddingBottom: 8 },
  headingLabel: { ...type.labelMedium, color: color.onSurfaceVariant },
  headingName: { ...type.titleLarge, color: color.onSurface },
  // One outline around the row, which clips the selected segment's container to its corners.
  segments: {
    minHeight: 40,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: shape.full,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  noSegments: { minHeight: 40 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  segmentNext: { borderLeftWidth: 1, borderLeftColor: color.outline },
  segmentLabel: { ...type.labelLarge },
  // Room for the label, which rises 9dp above the outline, under the segments.
  dateField: { marginTop: 8 },
  digits: { ...type.bodyLarge },
  strip: { minHeight: 32 },
  stripText: { ...type.bodySmall, paddingHorizontal: 16 },
  chips: { gap: 8 },
  chip: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: shape.small,
    borderWidth: 1,
  },
  chipLabel: { ...type.labelLarge },
  keypad: {
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    borderRadius: shape.extraLarge,
    backgroundColor: color.surfaceContainerLow,
  },
  key: {
    height: 56,
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { ...type.headlineSmall },
  scanner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  scannerText: { ...type.bodyMedium, textAlign: 'center', color: color.onSurfaceVariant },
  viewfinder: {
    width: 288,
    maxWidth: '100%',
    height: 176,
    borderRadius: shape.large,
    borderWidth: 2,
    borderColor: color.inverseOnSurface,
  },
  cover: { ...StyleSheet.absoluteFill, opacity: 0, backgroundColor: color.surface },
  scannerHint: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 24 },
  snackbar: {
    position: 'absolute',
    right: 16,
    left: 16,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: shape.extraSmall,
    backgroundColor: color.inverseSurface,
    elevation: elevation.level3,
  },
  snackbarText: { ...type.bodyMedium, paddingVertical: 14, color: color.inverseOnSurface },
})

// The choreographies of `docs/motion.md`. The name step is held under the date step or the scanner until it covers it.
const heldUnder = FadeOut.delay(duration.medium4).duration(duration.short1)

// Material's shared axis X: forward as the date step enters, backward as it leaves. The two steps never show
// together. The date step's surface covers the name step by 35% of the way, and only then do its controls appear;
// leaving, its controls are gone by then, and its surface uncovers the name step.
const sharedAxis = {
  surface: {
    entering: new Keyframe({
      0: { opacity: 0 },
      35: { opacity: 1, easing: easing.standard },
      100: { opacity: 1 },
    }).duration(duration.medium4),
    exiting: new Keyframe({
      0: { opacity: 1 },
      35: { opacity: 1 },
      100: { opacity: 0, easing: easing.standard },
    }).duration(duration.short4),
  },
  controls: {
    entering: new Keyframe({
      0: { opacity: 0, transform: [{ translateX: 32 }] },
      35: { opacity: 0 },
      100: { opacity: 1, transform: [{ translateX: 0 }], easing: easing.emphasizedDecelerate },
    }).duration(duration.medium4),
    exiting: new Keyframe({
      0: { opacity: 1, transform: [{ translateX: 0 }] },
      35: { opacity: 0, easing: easing.standard },
      100: { transform: [{ translateX: 32 }], easing: easing.emphasizedAccelerate },
    }).duration(duration.short4),
  },
}

// The scanner rises opaque, then shows the camera.
const reveal = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0, easing: easing.standard },
})
  .delay(duration.medium4)
  .duration(duration.short4)

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

const doorOpening = (from: FridgeShown & { _tag: 'Open' }) => {
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

/** What the first step is doing, and which of its controls take. */
type NameActivity =
  | { _tag: 'Editing'; controls: Model & { _tag: 'Naming' } }
  | { _tag: 'LookingUp'; controls: Model & { _tag: 'LookingUp' } }
  | { _tag: 'Adding' }

type DateActivity = Readonly<
  { _tag: 'Editing'; controls: Model & { _tag: 'Dating' } } | { _tag: 'Adding' }
>

/** The top app bar of Material's full-screen dialog: its leading icon button and its title. */
const appBar = (
  title: string,
  iconName: string,
  iconTitle: string,
  maybeMessage: Opt.Option<Message>,
  dispatch: Dispatch<Message>,
) => {
  const { on } = handlers(dispatch)
  return (
    <Box style={styles.bar}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={iconTitle}
        accessibilityState={{ disabled: Opt.isNone(maybeMessage) }}
        style={styles.iconButton}
        onPress={Opt.match(maybeMessage, { onNone: () => undefined, onSome: on })}
      >
        {icon(iconName, Opt.isNone(maybeMessage) ? color.disabledContent : color.onSurface)}
      </Pressable>
      <Text accessibilityRole='header' numberOfLines={1} style={styles.title}>{title}</Text>
    </Box>
  )
}

/** Material's filled or text button. The circular indicator replaces the label while the action runs. */
const button = (
  label: string,
  maybeMessage: Opt.Option<Message>,
  isRunning: boolean,
  kind: 'Filled' | 'Text',
  dispatch: Dispatch<Message>,
) => {
  const { on } = handlers(dispatch)
  const isEnabled = Opt.isSome(maybeMessage) || isRunning
  const tint = kind === 'Filled'
    ? (isEnabled ? color.onPrimary : color.disabledContent)
    : (isEnabled ? color.primary : color.disabledContent)
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: Opt.isNone(maybeMessage), busy: isRunning }}
      style={[
        kind === 'Filled' ? styles.filledButton : styles.textButton,
        kind === 'Filled' && { backgroundColor: isEnabled ? color.primary : color.disabledContainer },
      ]}
      onPress={Opt.match(maybeMessage, { onNone: () => undefined, onSome: on })}
    >
      {isRunning
        ? <ActivityIndicator accessibilityLabel='Adding the product' color={tint} />
        : <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>}
    </Pressable>
  )
}

/** The field's supporting text. The line is there even when empty, so that a text appearing moves nothing. */
const supportingText = (supporting: Supporting) => (
  <Text style={styles.supporting}>
    {Match.valueTags(supporting, {
      Nothing: () => '',
      CameraUnavailable: () => 'Camera not available. Type the name',
      LookingUp: ({ barcode }) => `Looking up ${barcode}…`,
      // The attribution Open Food Facts' licence asks for, with the product's page.
      FromOpenFoodFacts: ({ url }) => [
        'From ',
        <Text key='link' style={styles.link} accessibilityRole='link' onPress={() => Linking.openURL(url)}>
          Open Food Facts
        </Text>,
      ],
      NotOnOpenFoodFacts: ({ barcode }) => `${barcode} isn't on Open Food Facts. Type the name`,
      LookupFailed: () => 'Couldn\'t reach Open Food Facts. Type the name',
    })}
  </Text>
)

/**
 * Material's outlined text field of the name, drawn anew when the name is replaced (a scan, a clearing, a product
 * added). From then on the user owns its text, and the program learns it from the field's messages. Focused whenever
 * it is drawn anew and editable: as the step opens, after a product found, a clearing and an add.
 */
const nameField = (shown: NameShown, activity: NameActivity, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const isEditing = activity._tag === 'Editing'
  const maybeClearName = isEditing ? activity.controls.maybeClearName : Opt.none()
  return (
    <Box key={`name-${shown.nameKey}`}>
      <Box style={[styles.field, { borderColor: isEditing ? color.outline : color.disabledContainer }]}>
        <TextInput
          accessibilityLabel='Name'
          defaultValue={shown.name}
          editable={isEditing}
          autoFocus={isEditing}
          enterKeyHint='done'
          cursorColor={color.primary}
          style={[styles.input, { color: isEditing ? color.onSurface : color.disabledContent }]}
          onChangeText={isEditing ? onValue(activity.controls.changeName) : undefined}
        />
        <Text style={[styles.label, { color: isEditing ? color.onSurfaceVariant : color.disabledContent }]}>Name</Text>
        {activity._tag === 'LookingUp'
          ? (
            <Box style={[styles.iconButton, styles.trailing]}>
              <ActivityIndicator accessibilityLabel='Looking up the product' color={color.primary} />
            </Box>
          )
          : Opt.match(maybeClearName, {
            onNone: () => null,
            onSome: (clear) => (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Clear name'
                style={[styles.iconButton, styles.trailing]}
                onPress={on(clear)}
              >
                {icon('cancel', color.onSurfaceVariant)}
              </Pressable>
            ),
          })}
      </Box>
      {supportingText(shown.supporting)}
    </Box>
  )
}

/** Material's FAB that opens the scanner: the step's secondary action, in the tertiary's color, under the thumb. */
const scanFab = (maybeScan: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Scan barcode'
      accessibilityState={{ disabled: Opt.isNone(maybeScan) }}
      style={[styles.scanFab, {
        backgroundColor: Opt.isSome(maybeScan) ? color.tertiaryContainer : color.disabledContainer,
        // A disabled FAB lies flat: a shadow under a translucent container shows through it.
        elevation: Opt.isSome(maybeScan) ? elevation.level3 : 0,
      }]}
      onPress={Opt.match(maybeScan, { onNone: () => undefined, onSome: on })}
    >
      {icon('barcode_scanner', Opt.isSome(maybeScan) ? color.onTertiaryContainer : color.disabledContent)}
    </Pressable>
  )
}

/** The last product added, heard by a screen reader from a live region, which is announced when its text changes. */
const announcement = (fridge: FridgeShown) => (
  <Text accessibilityLiveRegion='polite' style={styles.announcement}>
    {Match.valueTags(fridge, {
      Away: () => '',
      Open: ({ arrivals }) => announced(Arr.lastNonEmpty(arrivals).product),
      Closing: ({ last }) => announced(last.product),
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

/**
 * The fridge, while products enter it: each product's disc flies into its compartment, between the inside and the
 * door. Its body is drawn anew as it starts closing, which plays the settle.
 */
type Colors = Readonly<{ fill: ColorValue; text: ColorValue }>

/** The colors of Home's disc, by when the product is due (`docs/freshness.md`). */
const dueColors: Readonly<Record<Due['_tag'], Colors>> = {
  Never: { fill: color.surfaceContainerHighest, text: color.onSurface },
  Now: { fill: color.errorContainer, text: color.onErrorContainer },
  Soon: { fill: color.primaryContainer, text: color.onPrimaryContainer },
  Later: { fill: color.tertiaryContainer, text: color.onTertiaryContainer },
}

/** A product's disc, as Home's list draws it: its expiration day and month, or an infinity sign when it never ends. */
const disc = ({ entrance, due }: ArrivalShown) => {
  const { fill, text } = dueColors[due._tag]
  return (
    <Animated.View entering={flights[entrance]} style={[styles.disc, { backgroundColor: fill }]}>
      {due._tag === 'Never'
        ? <Text style={[type.titleMedium, { color: text }]}>∞</Text>
        : [
          <Text key='day' style={[styles.discDay, { color: text }]}>{Day.toParts(due.expirationDate).day}</Text>,
          <Text key='month' style={[styles.discMonth, { color: text }]}>
            {Day.format(due.expirationDate, { month: 'short' })}
          </Text>,
        ]}
    </Animated.View>
  )
}

const fridge = (shown: FridgeShown) =>
  shown._tag === 'Away' ? null : (
    <Box
      key='stage'
      pointerEvents='none'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={styles.stage}
    >
      <Animated.View
        key={`fridge-${shown.visit}`}
        entering={fridgeAppearing}
        exiting={fridgeLeaving}
        style={styles.fridge}
      >
        <Animated.View
          key={shown._tag}
          {...(shown._tag === 'Closing' ? { entering: fridgeSettling } : {})}
          style={styles.body}
        >
          <Box style={styles.freezer}>
            <Box style={styles.handle} />
          </Box>
          <Box style={styles.compartment}>
            {shown._tag === 'Open'
              ? shown.arrivals.map((arrival) => (
                <Box key={`product-${arrival.id}`} style={styles.slot}>{disc(arrival)}</Box>
              ))
              : null}
            <Animated.View
              entering={shown._tag === 'Open' ? doorOpening(shown) : doorClosing}
              style={[styles.door, { transform: shown._tag === 'Open' ? doorOpen : doorClosed }]}
            >
              <Box style={[styles.handle, styles.doorHandle]} />
            </Animated.View>
          </Box>
        </Animated.View>
      </Animated.View>
    </Box>
  )

/** The first step: the name under the app bar, the two ways out docked at the bottom, the scan FAB above them. */
const nameStep = (
  shown: NameShown,
  activity: NameActivity,
  fridgeShown: FridgeShown,
  dispatch: Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const maybeClose = activity._tag === 'Adding' ? Opt.none() : Opt.some(activity.controls.close)
  return (
    <Animated.View key='naming' exiting={heldUnder} style={styles.step}>
      {appBar('Add products', 'close', 'Close', maybeClose, dispatch)}
      <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.column}>
        {nameField(shown, activity, dispatch)}
        <Box style={styles.room}>
          {announcement(fridgeShown)}
          {fridge(fridgeShown)}
          {scanFab(Opt.flatMap(controls, ({ maybeScan }) => maybeScan), dispatch)}
        </Box>
      </ScrollView>
      <Box style={styles.dock}>
        {button(
          'Set expiration',
          Opt.flatMap(controls, ({ maybeRequestDate }) => maybeRequestDate),
          false,
          'Filled',
          dispatch,
        )}
        {activity._tag === 'LookingUp'
          ? button('Cancel', Opt.some(activity.controls.cancelLookup), false, 'Text', dispatch)
          : button(
            'Add without date',
            Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
            activity._tag === 'Adding',
            'Text',
            dispatch,
          )}
      </Box>
    </Animated.View>
  )
}

/** Material's segmented button of the orders. Its row stays empty until the order is known: nothing moves then. */
const orderSegments = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  if (shown.order._tag === 'Unknown') {
    return <Box style={styles.noSegments} />
  }
  const segment = ({ order, choice }: OrderChoice, index: number) => {
    const maybePick = choice._tag === 'Offered' && activity._tag === 'Editing' ? choice.maybePick : Opt.none()
    const isCurrent = choice._tag === 'Current'
    const tint = activity._tag === 'Editing'
      ? (isCurrent ? color.onSecondaryContainer : color.onSurface)
      : color.disabledContent
    return (
      <Pressable
        key={order}
        accessibilityRole='button'
        accessibilityLabel={orderTitles[order]}
        accessibilityState={{ selected: isCurrent, disabled: activity._tag !== 'Editing' }}
        style={[
          styles.segment,
          index > 0 && styles.segmentNext,
          isCurrent && { backgroundColor: color.secondaryContainer },
        ]}
        onPress={Opt.match(maybePick, { onNone: () => undefined, onSome: on })}
      >
        {isCurrent ? icon('check', tint, { fontSize: 18, lineHeight: 18 }) : null}
        <Text style={[styles.segmentLabel, { color: tint }]}>{order}</Text>
      </Pressable>
    )
  }
  return <Box style={styles.segments}>{shown.order.choices.map(segment)}</Box>
}

/**
 * Material's outlined text field of the date: read-only, typed into with the keypad, so that the thumb stays where it
 * is. The digits are shown as they are: grouping them would read them one way.
 */
const dateField = (shown: DateShown, activity: DateActivity) => {
  // Disabled while the step takes no input; in the error's colors when the digits name no day.
  const look = activity._tag === 'Adding' ? 'Disabled' : shown.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  const tint = look === 'Disabled' ? color.disabledContent : look === 'Wrong' ? color.error : color.onSurfaceVariant
  const placeholder = shown.order._tag === 'Known' ? placeholders[shown.order.order] : ''
  return (
    <Box
      accessible
      accessibilityLabel={`Expiration date, ${shown.digits === '' ? 'empty' : shown.digits}`}
      style={[styles.field, styles.dateField, {
        borderColor: look === 'Disabled' ? color.disabledContainer : look === 'Wrong' ? color.error : color.outline,
      }]}
    >
      <Text style={[styles.digits, { color: shown.digits === '' ? color.onSurfaceVariant : color.onSurface }]}>
        {shown.digits === '' ? placeholder : shown.digits}
      </Text>
      <Text style={[styles.label, { color: tint }]}>Expiration date</Text>
    </Box>
  )
}

/** Material's filter chip of a day the digits name. */
const chip = ({ date, choice }: DateChoice, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeChoose = choice._tag === 'Offered' && activity._tag === 'Editing' ? choice.maybeChoose : Opt.none()
  const isChosen = choice._tag === 'Chosen'
  const tint = activity._tag === 'Editing'
    ? (isChosen ? color.onSecondaryContainer : color.onSurfaceVariant)
    : color.disabledContent
  return (
    <Pressable
      key={date}
      accessibilityRole='button'
      accessibilityState={{ selected: isChosen, disabled: activity._tag !== 'Editing' }}
      style={[styles.chip, {
        borderColor: isChosen ? color.secondaryContainer : color.outlineVariant,
        backgroundColor: isChosen ? color.secondaryContainer : 'transparent',
      }]}
      onPress={Opt.match(maybeChoose, { onNone: () => undefined, onSome: on })}
    >
      {icon(isChosen ? 'check' : 'event', tint, { fontSize: 18, lineHeight: 18 })}
      <Text style={[styles.chipLabel, { color: isChosen ? color.onSecondaryContainer : color.onSurface }]}>
        {formatDay(date)}
      </Text>
    </Pressable>
  )
}

/** Under the field, what it means: the hint, the chips on one line that scrolls sideways, or the error. */
const strip = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => (
  <Box style={styles.strip}>
    {Match.valueTags(shown.strip, {
      Hint: () => (
        <Text style={[styles.stripText, { color: color.onSurfaceVariant }]}>
          {shown.order._tag === 'Known' ? hints[shown.order.order] : ''}
        </Text>
      ),
      Naming: ({ choices }) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {choices.map((choice) =>
            chip(choice, activity, dispatch)
          )}
        </ScrollView>
      ),
      NamingNothing: () => <Text style={[styles.stripText, { color: color.error }]}>Not an upcoming date</Text>,
    })}
  </Box>
)

/** A keypad of the app's own, always where the thumb expects it: Material's tonal buttons in a button group's pills. */
const keypad = (activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const key = (id: string, label: ReactNode, title: string, maybeMessage: Opt.Option<Message>) => {
    const isEnabled = Opt.isSome(maybeMessage)
    return (
      <Pressable
        key={id}
        accessibilityRole='button'
        accessibilityLabel={title}
        accessibilityState={{ disabled: !isEnabled }}
        style={[styles.key, { backgroundColor: isEnabled ? color.surfaceContainerHighest : color.disabledContainer }]}
        onPress={Opt.match(maybeMessage, { onNone: () => undefined, onSome: on })}
      >
        {label}
      </Pressable>
    )
  }
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const tintOf = (maybe: Opt.Option<unknown>) => (Opt.isSome(maybe) ? color.onSurface : color.disabledContent)
  const digitKey = (digit: Digit) => {
    const maybeMessage = Opt.flatMap(
      controls,
      ({ maybeTypeDigit }) => Opt.map(maybeTypeDigit, (typeDigit) => typeDigit(digit)),
    )
    return key(
      digit,
      <Text style={[styles.keyLabel, { color: tintOf(maybeMessage) }]}>{digit}</Text>,
      digit,
      maybeMessage,
    )
  }
  const clear = Opt.flatMap(controls, ({ maybeClearDate }) => maybeClearDate)
  const erase = Opt.flatMap(controls, ({ maybeEraseDigit }) => maybeEraseDigit)
  return (
    <Box style={styles.keypad}>
      {keys.map(digitKey)}
      {key('clear', icon('cancel', tintOf(clear)), 'Clear date', clear)}
      {digitKey('0')}
      {key('erase', icon('backspace', tintOf(erase)), 'Backspace', erase)}
    </Box>
  )
}

/** The second step, laid out as a dialer: the fields read from the top, the keypad and the button at the bottom. */
const dateStep = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  // The surface and the controls are siblings. An exit inside another exit holds back every change above them
  // until both end: the page's room for a keyboard rising as the name step comes back.
  return (
    <>
      <Animated.View key='dating-surface' {...sharedAxis.surface} style={styles.step} />
      <Animated.View key='dating' {...sharedAxis.controls} style={styles.layer}>
        {appBar('Add products', 'arrow_back', 'Back', Opt.map(controls, ({ back }) => back), dispatch)}
        <ScrollView contentContainerStyle={styles.dateColumn}>
          <Box style={styles.heading}>
            <Text style={styles.headingLabel}>Product</Text>
            <Text accessibilityRole='header' numberOfLines={2} style={styles.headingName}>{shown.name}</Text>
          </Box>
          {orderSegments(shown, activity, dispatch)}
          {dateField(shown, activity)}
          {strip(shown, activity, dispatch)}
          {keypad(activity, dispatch)}
        </ScrollView>
        <Box style={styles.dock}>
          {button(
            'Add',
            Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd),
            activity._tag === 'Adding',
            'Filled',
            dispatch,
          )}
        </Box>
      </Animated.View>
    </>
  )
}

/**
 * Material's full-screen dialog over the first step: the camera under a frame to hold the code in, or why there is
 * none. The camera draws itself while the program reads it, under a cover that fades once the dialog is in place.
 */
const scanner = (model: Model & { _tag: 'Scanning' }, dispatch: Dispatch<Message>) => (
  <Animated.View key='scanner' {...motion.fullScreenDialog} style={styles.step}>
    {appBar('Scan barcode', 'close', 'Close', Opt.some(model.closeScanner), dispatch)}
    {model.camera === 'Available'
      ? [
        <Box key='camera' style={styles.scanner}>
          <CameraPreview style={StyleSheet.absoluteFill} />
          <Animated.View entering={reveal} pointerEvents='none' style={styles.cover} />
          <Box style={styles.viewfinder} />
        </Box>,
        <Box key='hint' style={styles.scannerHint}>
          <Text style={styles.scannerText}>Point the camera at a barcode</Text>
        </Box>,
      ]
      : (
        <Box key='unavailable' style={styles.scanner}>
          {icon('no_photography', color.onSurfaceVariant, { fontSize: 36, lineHeight: 36 })}
          <Text style={styles.scannerText}>Camera not available. Type the name</Text>
        </Box>
      )}
  </Animated.View>
)

const failureTexts: Readonly<Record<Failure, string>> = {
  AddFailed: 'Couldn\'t add the product',
  OrderNotKept: 'Couldn\'t save the date order',
}

/**
 * The heights of the controls docked at the bottom of each step, and the 16dp above them: on the first step, its two
 * buttons and the scan FAB; on the second, the "Add" button.
 */
const clearances = { Naming: 196, Dating: 88 } as const

/**
 * Material's snackbar 16dp above the controls docked at the bottom of the step shown, drawn anew for each id. One
 * that leaves stays where it stood.
 */
const snackbar = (shown: Snackbar, step: keyof typeof clearances) =>
  shown._tag === 'None' ? null : (
    <Animated.View
      key={`snackbar-${shown.id}`}
      entering={motion.snackbar.entering[shown.entrance]}
      exiting={motion.snackbar.exiting}
      accessibilityLiveRegion='polite'
      style={[styles.snackbar, { bottom: clearances[step] }]}
    >
      <Text style={styles.snackbarText}>{failureTexts[shown.failure]}</Text>
    </Animated.View>
  )

/** What each layer of the page draws: a step, or the scanner. */
type Layers = Readonly<Record<'naming' | 'dating' | 'scanner', ReactNode>>

const nothing: Layers = { naming: null, dating: null, scanner: null }

// What leaves stays where it was in the native tree, under what is drawn in its place. In a layer of its own, a step
// leaving to the name step stays above it. Fabric drops a view that only lays out: `collapsable` keeps them.
const layer = (name: keyof Layers, drawn: ReactNode) => (
  <Box key={name} collapsable={false} pointerEvents='box-none' style={styles.layer}>{drawn}</Box>
)

/** Material's full-screen dialog, as a page over the one that opened it: one step at a time. */
export const view: View<Model, Message> = (model, dispatch) => {
  const layers: Layers = Match.valueTags(model, {
    Naming: (naming) => ({
      ...nothing,
      naming: nameStep(naming, { _tag: 'Editing', controls: naming }, naming.fridge, dispatch),
    }),
    LookingUp: (lookingUp) => ({
      ...nothing,
      naming: nameStep(lookingUp, { _tag: 'LookingUp', controls: lookingUp }, { _tag: 'Away' }, dispatch),
    }),
    Scanning: (scanning) => ({ ...nothing, scanner: scanner(scanning, dispatch) }),
    Dating: (dating) => ({ ...nothing, dating: dateStep(dating, { _tag: 'Editing', controls: dating }, dispatch) }),
    Adding: (adding) =>
      Match.valueTags(adding.step, {
        Naming: ({ fridge }) => ({ ...nothing, naming: nameStep(adding, { _tag: 'Adding' }, fridge, dispatch) }),
        Dating: (date) => ({ ...nothing, dating: dateStep(date, { _tag: 'Adding' }, dispatch) }),
      }),
  })
  return (
    <SafeAreaView edges={edges} style={[styles.page, { paddingBottom: model.keyboardInset }]}>
      <Box style={styles.frame}>
        {layer('naming', layers.naming)}
        {layer('dating', layers.dating)}
        {layer('scanner', layers.scanner)}
        {snackbar(
          model.snackbar,
          model._tag === 'Dating' || (model._tag === 'Adding' && model.step._tag === 'Dating') ? 'Dating' : 'Naming',
        )}
      </Box>
    </SafeAreaView>
  )
}
