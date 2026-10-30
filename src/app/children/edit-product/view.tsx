import type { Dispatch } from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ReactNode } from 'react'
import { ActivityIndicator, View as Box, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { DateOrder } from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, elevation, icon, motion, shape, type } from '#styles'
import type { DateChoice, Digit, Failure, FieldsShown, Message, Model, OrderChoice, Snackbar } from './program.ts'

// No weekday: a date read off a package has none, and two chips must fit a row of the narrowest phone.
const formatDay = (date: Day.Day) => Day.format(date, { day: 'numeric', month: 'short', year: 'numeric' })

const keys: ReadonlyArray<Digit> = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** How the digits are read in each order: the field's placeholder and each segment's label. */
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
  bar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  title: { ...type.titleLargeEmphasized, flex: 1, paddingHorizontal: 4, color: color.onSurface },
  iconButton: { width: 48, height: 48, borderRadius: shape.full, alignItems: 'center', justifyContent: 'center' },
  column: { flexGrow: 1, gap: 8, paddingHorizontal: 24, paddingTop: 8 },
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
  input: { ...type.bodyLarge, paddingVertical: 0, paddingRight: 40, color: color.onSurface },
  clearName: { position: 'absolute', right: 4 },
  // One outline around the row, which clips the selected segment's container to its corners.
  segments: {
    minHeight: 40,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: shape.full,
    borderColor: color.outline,
    overflow: 'hidden',
  },
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
  // 8dp over "Save", not AddProducts' 16: the name field takes them, and the page must fit the reference screen.
  dock: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  save: {
    minHeight: 56,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  saveLabel: { ...type.labelLarge },
  snackbar: {
    position: 'absolute',
    right: 16,
    bottom: 88,
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

/** Whether the fields take input, and with which controls; if not, whether the product is being saved. */
type Activity = Readonly<
  { _tag: 'Editing'; controls: Model & { _tag: 'Editing' } } | { _tag: 'Saving' } | { _tag: 'Gone' }
>

/** The top app bar of Material's full-screen dialog: its close button and its title. */
const appBar = (maybeClose: Opt.Option<Message>, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  return (
    <Box key='bar' style={styles.bar}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Close'
        accessibilityState={{ disabled: Opt.isNone(maybeClose) }}
        style={styles.iconButton}
        onPress={Opt.match(maybeClose, { onNone: () => undefined, onSome: on })}
      >
        {icon('close', Opt.isNone(maybeClose) ? color.disabledContent : color.onSurface)}
      </Pressable>
      <Text accessibilityRole='header' numberOfLines={1} style={styles.title}>Edit product</Text>
    </Box>
  )
}

/**
 * Material's filled button "Save", or "Save without date" on an empty date field. The circular indicator replaces
 * its label while the product is saved.
 */
const saveButton = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeSave = activity._tag === 'Editing' ? activity.controls.maybeSave : Opt.none()
  const isEnabled = Opt.isSome(maybeSave) || activity._tag === 'Saving'
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: Opt.isNone(maybeSave), busy: activity._tag === 'Saving' }}
      style={[styles.save, { backgroundColor: isEnabled ? color.primary : color.disabledContainer }]}
      onPress={Opt.match(maybeSave, { onNone: () => undefined, onSome: on })}
    >
      {activity._tag === 'Saving'
        ? <ActivityIndicator accessibilityLabel='Saving the product' color={color.onPrimary} />
        : (
          <Text style={[styles.saveLabel, { color: isEnabled ? color.onPrimary : color.disabledContent }]}>
            {shown.withoutDate ? 'Save without date' : 'Save'}
          </Text>
        )}
    </Pressable>
  )
}

/**
 * Material's outlined text field of the name, drawn anew when it is cleared. From then on the user owns its text, and
 * the program learns it from the field's messages. Not focused when the page opens: the keyboard would cover the
 * keypad, and the user may have come for the date.
 */
const nameField = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on, onValue } = handlers(dispatch)
  const isEditing = activity._tag === 'Editing'
  const maybeClearName = isEditing ? activity.controls.maybeClearName : Opt.none()
  return (
    <Box
      key={`name-${shown.nameKey}`}
      style={[styles.field, { borderColor: isEditing ? color.outline : color.disabledContainer }]}
    >
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
      {Opt.match(maybeClearName, {
        onNone: () => null,
        onSome: (clear) => (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Clear name'
            style={[styles.iconButton, styles.clearName]}
            onPress={on(clear)}
          >
            {icon('cancel', color.onSurfaceVariant)}
          </Pressable>
        ),
      })}
    </Box>
  )
}

/** Material's segmented button of the orders. */
const orderSegments = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
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
  return <Box style={styles.segments}>{shown.orders.map(segment)}</Box>
}

/**
 * Material's outlined text field of the date: read-only, typed into with the keypad, so that the thumb stays where it
 * is. The digits are shown as they are: grouping them would read them one way.
 */
const dateField = (shown: FieldsShown, activity: Activity) => {
  // Disabled while the fields take no input; in the error's colors when the digits name no day.
  const look = activity._tag !== 'Editing' ? 'Disabled' : shown.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  const tint = look === 'Disabled' ? color.disabledContent : look === 'Wrong' ? color.error : color.onSurfaceVariant
  return (
    <Box
      accessible
      accessibilityLabel={`Expiration date, ${shown.digits === '' ? 'empty' : shown.digits}`}
      style={[styles.field, styles.dateField, {
        borderColor: look === 'Disabled' ? color.disabledContainer : look === 'Wrong' ? color.error : color.outline,
      }]}
    >
      <Text style={[styles.digits, { color: shown.digits === '' ? color.onSurfaceVariant : color.onSurface }]}>
        {shown.digits === '' ? placeholders[shown.order] : shown.digits}
      </Text>
      <Text style={[styles.label, { color: tint }]}>Expiration date</Text>
    </Box>
  )
}

/** Material's filter chip of a day the digits name. */
const chip = ({ date, choice }: DateChoice, activity: Activity, dispatch: Dispatch<Message>) => {
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
const strip = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => (
  <Box style={styles.strip}>
    {Match.valueTags(shown.strip, {
      Hint: () => <Text style={[styles.stripText, { color: color.onSurfaceVariant }]}>{hints[shown.order]}</Text>,
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
const keypad = (activity: Activity, dispatch: Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const key = (id: string, label: ReactNode | string, title: string, maybeMessage: Opt.Option<Message>) => {
    const isEnabled = Opt.isSome(maybeMessage)
    const tint = isEnabled ? color.onSurface : color.disabledContent
    return (
      <Pressable
        key={id}
        accessibilityRole='button'
        accessibilityLabel={title}
        accessibilityState={{ disabled: !isEnabled }}
        style={[styles.key, { backgroundColor: isEnabled ? color.surfaceContainerHighest : color.disabledContainer }]}
        onPress={Opt.match(maybeMessage, { onNone: () => undefined, onSome: on })}
      >
        {typeof label === 'string' ? <Text style={[styles.keyLabel, { color: tint }]}>{label}</Text> : label}
      </Pressable>
    )
  }
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  const enabledTint = (maybe: Opt.Option<Message>) => (Opt.isSome(maybe) ? color.onSurface : color.disabledContent)
  const digitKey = (digit: Digit) =>
    key(
      digit,
      digit,
      digit,
      Opt.flatMap(controls, ({ maybeTypeDigit }) => Opt.map(maybeTypeDigit, (typeDigit) => typeDigit(digit))),
    )
  const clear = Opt.flatMap(controls, ({ maybeClearDate }) => maybeClearDate)
  const erase = Opt.flatMap(controls, ({ maybeEraseDigit }) => maybeEraseDigit)
  return (
    <Box style={styles.keypad}>
      {keys.map(digitKey)}
      {key('clear', icon('cancel', enabledTint(clear)), 'Clear date', clear)}
      {digitKey('0')}
      {key('erase', icon('backspace', enabledTint(erase)), 'Backspace', erase)}
    </Box>
  )
}

/**
 * The fields read from the top, the keypad at the bottom of their column, where the thumb rests, and "Save" docked
 * under it. The column scrolls when the screen is shorter (the keyboard open, a large font): "Save" stays in sight.
 */
const fields = (shown: FieldsShown, activity: Activity, dispatch: Dispatch<Message>) => [
  <ScrollView key='fields' keyboardShouldPersistTaps='handled' contentContainerStyle={styles.column}>
    {nameField(shown, activity, dispatch)}
    {orderSegments(shown, activity, dispatch)}
    {dateField(shown, activity)}
    {strip(shown, activity, dispatch)}
    {keypad(activity, dispatch)}
  </ScrollView>,
  <Box key='dock' style={styles.dock}>{saveButton(shown, activity, dispatch)}</Box>,
]

const failureTexts: Readonly<Record<Failure, string>> = {
  SaveFailed: 'Couldn\'t save the product',
  OrderNotKept: 'Couldn\'t save the date order',
  ProductGone: 'This product no longer exists',
}

/** Material's snackbar 16dp above the docked "Save" button, keyed by its id so that the next one is drawn anew. */
const snackbar = (shown: Snackbar) =>
  shown._tag === 'None' ? null : (
    <Animated.View
      key={`snackbar-${shown.id}`}
      entering={motion.snackbar.entering[shown.entrance]}
      exiting={motion.snackbar.exiting}
      accessibilityLiveRegion='polite'
      style={styles.snackbar}
    >
      <Text style={styles.snackbarText}>{failureTexts[shown.failure]}</Text>
    </Animated.View>
  )

/** Material's full-screen dialog, as a page over the one that opened it. */
export const view: View<Model, Message> = (model, dispatch) => (
  <SafeAreaView edges={edges} style={[styles.page, { paddingBottom: model.keyboardInset }]}>
    <Box style={styles.frame}>
      {Match.valueTags(model, {
        Loading: ({ close }) => [appBar(Opt.some(close), dispatch)],
        Editing: (editing) => [
          appBar(Opt.some(editing.close), dispatch),
          ...fields(editing, { _tag: 'Editing', controls: editing }, dispatch),
          snackbar(editing.snackbar),
        ],
        Saving: (saving) => [
          appBar(Opt.none(), dispatch),
          ...fields(saving, { _tag: 'Saving' }, dispatch),
          snackbar(saving.snackbar),
        ],
        Gone: (gone) => [
          appBar(Opt.some(gone.close), dispatch),
          ...fields(gone, { _tag: 'Gone' }, dispatch),
          snackbar(gone.snackbar),
        ],
      })}
    </Box>
  </SafeAreaView>
)
