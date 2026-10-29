import type { Dispatch } from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  View as Box,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import CameraPreview from '#infrastructure/barcode-camera/BarcodeCameraPreviewNativeComponent.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, elevation, icon, shape, type } from '#styles'
import type {
  DateChoice,
  DateShown,
  Digit,
  Entering,
  Failure,
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

const styles = StyleSheet.create({
  // Edge to edge: the page keeps clear of the system bars, and draws its surface under them.
  page: { flex: 1, backgroundColor: color.surface },
  // What an absolute position is measured from: inside the bars.
  frame: { flex: 1 },
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
  room: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  added: { ...type.bodyMedium, textAlign: 'center', color: color.onSurfaceVariant },
  scanFab: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 56,
    height: 56,
    borderRadius: shape.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: { gap: 12, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
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
  segments: { minHeight: 40, flexDirection: 'row' },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: color.outline,
  },
  segmentFirst: { borderTopLeftRadius: shape.full, borderBottomLeftRadius: shape.full },
  segmentLast: { borderTopRightRadius: shape.full, borderBottomRightRadius: shape.full },
  segmentNext: { marginLeft: -1 },
  segmentLabel: { ...type.labelLarge },
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
 * added). From then on the user owns its text, and the program learns it from the field's messages.
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

/**
 * What was just added, said where the fridge's animation will be, and heard by a screen reader from its live
 * region.
 */
const added = (maybeEntering: Opt.Option<Entering>) => (
  <Text accessibilityLiveRegion='polite' style={styles.added}>
    {Opt.match(maybeEntering, {
      onNone: () => '',
      onSome: ({ product: { name, maybeExpirationDate } }) =>
        `${name} added. ${
          Opt.match(maybeExpirationDate, {
            onNone: () => 'No expiration',
            onSome: (date) => `Expires ${formatDay(date)}`,
          })
        }`,
    })}
  </Text>
)

/** The first step: the name under the app bar, the two ways out docked at the bottom, the scan FAB above them. */
const nameStep = (
  shown: NameShown,
  activity: NameActivity,
  maybeEntering: Opt.Option<Entering>,
  dispatch: Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const maybeClose = activity._tag === 'Adding' ? Opt.none() : Opt.some(activity.controls.close)
  return [
    <Box key='bar'>{appBar('Add products', 'close', 'Close', maybeClose, dispatch)}</Box>,
    <ScrollView key='naming' keyboardShouldPersistTaps='handled' contentContainerStyle={styles.column}>
      {nameField(shown, activity, dispatch)}
      <Box style={styles.room}>
        {added(maybeEntering)}
        {scanFab(Opt.flatMap(controls, ({ maybeScan }) => maybeScan), dispatch)}
      </Box>
    </ScrollView>,
    <Box key='dock' style={styles.dock}>
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
    </Box>,
  ]
}

/** Material's segmented button of the orders. Its row stays empty until the order is known: nothing moves then. */
const orderSegments = (shown: DateShown, activity: DateActivity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  if (shown.order._tag === 'Unknown') {
    return <Box style={styles.segments} />
  }
  const last = shown.order.choices.length - 1
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
          index === 0 && styles.segmentFirst,
          index === last && styles.segmentLast,
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
      style={[styles.field, {
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
  return [
    <Box key='bar'>
      {appBar('Add products', 'arrow_back', 'Back', Opt.map(controls, ({ back }) => back), dispatch)}
    </Box>,
    <ScrollView key='dating' contentContainerStyle={styles.dateColumn}>
      <Box style={styles.heading}>
        <Text style={styles.headingLabel}>Product</Text>
        <Text accessibilityRole='header' numberOfLines={2} style={styles.headingName}>{shown.name}</Text>
      </Box>
      {orderSegments(shown, activity, dispatch)}
      {dateField(shown, activity)}
      {strip(shown, activity, dispatch)}
      {keypad(activity, dispatch)}
    </ScrollView>,
    <Box key='dock' style={styles.dock}>
      {button('Add', Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd), activity._tag === 'Adding', 'Filled', dispatch)}
    </Box>,
  ]
}

/**
 * Material's full-screen dialog over the first step: the camera under a frame to hold the code in, or why there is
 * none. The camera draws itself while the program reads it.
 */
const scanner = (model: Model & { _tag: 'Scanning' }, dispatch: Dispatch<Message>) => [
  <Box key='bar'>{appBar('Scan barcode', 'close', 'Close', Opt.some(model.closeScanner), dispatch)}</Box>,
  ...(model.camera === 'Available'
    ? [
      <Box key='camera' style={styles.scanner}>
        <CameraPreview style={StyleSheet.absoluteFill} />
        <Box style={styles.viewfinder} />
      </Box>,
      <Box key='hint' style={styles.scannerHint}>
        <Text style={styles.scannerText}>Point the camera at a barcode</Text>
      </Box>,
    ]
    : [
      <Box key='unavailable' style={styles.scanner}>
        {icon('no_photography', color.onSurfaceVariant, { fontSize: 36, lineHeight: 36 })}
        <Text style={styles.scannerText}>Camera not available. Type the name</Text>
      </Box>,
    ]),
]

const failureTexts: Readonly<Record<Failure, string>> = {
  AddFailed: 'Couldn\'t add the product',
  OrderNotKept: 'Couldn\'t save the date order',
}

/**
 * The heights of the controls docked at the bottom of each step, and the 16dp above them: on the first step, its two
 * buttons and the scan FAB; on the second, the "Add" button.
 */
const clearances = { Naming: 196, Dating: 88 } as const

/** Material's snackbar 16dp above the controls docked at the bottom of the step shown, drawn anew for each id. */
const snackbar = (shown: Snackbar, step: keyof typeof clearances) =>
  shown._tag === 'None' ? null : (
    <Box
      key={`snackbar-${shown.id}`}
      accessibilityLiveRegion='polite'
      style={[styles.snackbar, { bottom: clearances[step] }]}
    >
      <Text style={styles.snackbarText}>{failureTexts[shown.failure]}</Text>
    </Box>
  )

/** Material's full-screen dialog, as a page over the one that opened it: one step at a time. */
export const view: View<Model, Message> = (model, dispatch) => (
  <SafeAreaView style={styles.page}>
    <Box style={styles.frame}>
      {Match.valueTags(model, {
        Naming: (naming) => nameStep(naming, { _tag: 'Editing', controls: naming }, naming.maybeEntering, dispatch),
        LookingUp: (lookingUp) => nameStep(lookingUp, { _tag: 'LookingUp', controls: lookingUp }, Opt.none(), dispatch),
        Scanning: (scanning) => scanner(scanning, dispatch),
        Dating: (dating) => dateStep(dating, { _tag: 'Editing', controls: dating }, dispatch),
        Adding: (adding) =>
          Match.valueTags(adding.step, {
            Naming: () => nameStep(adding, { _tag: 'Adding' }, adding.maybeEntering, dispatch),
            Dating: (date) => dateStep(date, { _tag: 'Adding' }, dispatch),
          }),
      })}
      {snackbar(
        model.snackbar,
        model._tag === 'Dating' || (model._tag === 'Adding' && model.step._tag === 'Dating') ? 'Dating' : 'Naming',
      )}
    </Box>
  </SafeAreaView>
)
