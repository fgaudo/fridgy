import type * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import type { ReactNode } from 'react'
import { View as Box, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import type { DateOrder } from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, icon, shape, type } from '#styles'
import type { DateChoice, Digit, Message, Model, OrderChoice } from './program.ts'

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
  field: {
    minHeight: 56,
    justifyContent: 'center',
    borderRadius: shape.extraSmall,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  // Room for the label, which rises 9dp above the outline, under the segments.
  dateField: { marginTop: 8 },
  // Above the text, in the flow: a large font grows the field instead of covering the text. It rises 9dp over the
  // outline, which its surface hides.
  label: {
    ...type.bodySmall,
    alignSelf: 'flex-start',
    marginTop: -9,
    marginBottom: 8,
    marginLeft: -4,
    paddingHorizontal: 4,
    backgroundColor: color.surface,
  },
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
})

/** Material's segmented button of the orders. Its row stays empty until the order is known: nothing moves then. */
const orderSegments = (model: Model, dispatch: Tea.Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  if (model.order._tag === 'Unknown') {
    return <Box style={styles.noSegments} />
  }
  const isLocked = Opt.isNone(model.maybeKeys)
  const segment = ({ order, choice }: OrderChoice, index: number) => {
    const maybePick = choice._tag === 'Offered' ? choice.maybePick : Opt.none()
    const isCurrent = choice._tag === 'Current'
    const tint = isLocked ? color.disabledContent : isCurrent ? color.onSecondaryContainer : color.onSurface
    return (
      <Pressable
        key={order}
        accessibilityRole='button'
        accessibilityLabel={orderTitles[order]}
        accessibilityState={{ selected: isCurrent, disabled: isLocked }}
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
  return <Box style={styles.segments}>{model.order.choices.map(segment)}</Box>
}

/**
 * Material's outlined text field of the date: read-only, typed into with the keypad, so that the thumb stays where it
 * is. The digits are shown as they are: grouping them would read them one way.
 */
const dateField = (model: Model) => {
  // Disabled while the page's form is locked; in the error's colors when the digits name no day.
  const look = Opt.isNone(model.maybeKeys) ? 'Disabled' : model.strip._tag === 'NamingNothing' ? 'Wrong' : 'Plain'
  const tint = look === 'Disabled' ? color.disabledContent : look === 'Wrong' ? color.error : color.onSurfaceVariant
  const placeholder = model.order._tag === 'Known' ? placeholders[model.order.order] : ''
  return (
    <Box
      accessible
      accessibilityLabel={`Expiration date, ${model.digits === '' ? 'empty' : model.digits}`}
      style={[styles.field, styles.dateField, {
        borderColor: look === 'Disabled' ? color.disabledContainer : look === 'Wrong' ? color.error : color.outline,
      }]}
    >
      <Text style={[styles.label, { color: tint }]}>Expiration date</Text>
      <Text style={[styles.digits, { color: model.digits === '' ? color.onSurfaceVariant : color.onSurface }]}>
        {model.digits === '' ? placeholder : model.digits}
      </Text>
    </Box>
  )
}

/** Material's filter chip of a day the digits name. */
const chip = ({ date, choice }: DateChoice, isLocked: boolean, dispatch: Tea.Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const maybeChoose = choice._tag === 'Offered' ? choice.maybeChoose : Opt.none()
  const isChosen = choice._tag === 'Chosen'
  const tint = isLocked ? color.disabledContent : isChosen ? color.onSecondaryContainer : color.onSurfaceVariant
  return (
    <Pressable
      key={date}
      accessibilityRole='button'
      accessibilityState={{ selected: isChosen, disabled: isLocked }}
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
const strip = (model: Model, dispatch: Tea.Dispatch<Message>) => (
  <Box style={styles.strip}>
    {Match.valueTags(model.strip, {
      Hint: () => (
        <Text style={[styles.stripText, { color: color.onSurfaceVariant }]}>
          {model.order._tag === 'Known' ? hints[model.order.order] : ''}
        </Text>
      ),
      Naming: ({ choices }) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {choices.map((choice) =>
            chip(choice, Opt.isNone(model.maybeKeys), dispatch)
          )}
        </ScrollView>
      ),
      NamingNothing: () => <Text style={[styles.stripText, { color: color.error }]}>Not an upcoming date</Text>,
    })}
  </Box>
)

/** A keypad of the app's own, always where the thumb expects it: Material's tonal buttons in a button group's pills. */
const keypad = (model: Model, dispatch: Tea.Dispatch<Message>) => {
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
  const tintOf = (maybe: Opt.Option<unknown>) => (Opt.isSome(maybe) ? color.onSurface : color.disabledContent)
  const digitKey = (digit: Digit) => {
    const maybeMessage = Opt.flatMap(
      model.maybeKeys,
      ({ maybeTypeDigit }) => Opt.map(maybeTypeDigit, (typeDigit) => typeDigit[digit]),
    )
    return key(
      digit,
      <Text style={[styles.keyLabel, { color: tintOf(maybeMessage) }]}>{digit}</Text>,
      digit,
      maybeMessage,
    )
  }
  const clear = Opt.flatMap(model.maybeKeys, ({ maybeClearDate }) => maybeClearDate)
  const erase = Opt.flatMap(model.maybeKeys, ({ maybeEraseDigit }) => maybeEraseDigit)
  return (
    <Box style={styles.keypad}>
      {keys.map(digitKey)}
      {key('clear', icon('cancel', tintOf(clear)), 'Clear date', clear)}
      {digitKey('0')}
      {key('erase', icon('backspace', tintOf(erase)), 'Backspace', erase)}
    </Box>
  )
}

/**
 * The segmented button of the orders, the date's field, the strip under it and the keypad, as siblings for the
 * column of the page that places them. The keypad takes the room left at the bottom of that column.
 */
export const view: View<Model, Message> = (model, dispatch) => (
  <>
    {orderSegments(model, dispatch)}
    {dateField(model)}
    {strip(model, dispatch)}
    {keypad(model, dispatch)}
  </>
)
