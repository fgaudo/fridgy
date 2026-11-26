import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { ActivityIndicator, View as Box, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import Animated from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Expiration from '#app/programs/expiration/view.tsx'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, elevation, icon, motion, shape, type } from '#styles'
import type { Failure, FieldsShown, Message, Model } from './program.ts'

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
    paddingBottom: 15,
  },
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
  input: { ...type.bodyLarge, paddingVertical: 0, paddingRight: 40, color: color.onSurface },
  clearName: { position: 'absolute', right: 4 },
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
const appBar = (maybeClose: Opt.Option<Message>, dispatch: Tea.Dispatch<Message>) => {
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
const saveButton = (shown: FieldsShown, activity: Activity, dispatch: Tea.Dispatch<Message>) => {
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
 * the field sends it as it changes. Not focused when the page opens: the keyboard would cover the keypad, and the
 * user may have come for the date.
 */
const nameField = (shown: FieldsShown, activity: Activity, dispatch: Tea.Dispatch<Message>) => {
  const { on } = handlers(dispatch)
  const isEditing = activity._tag === 'Editing'
  const maybeClearName = isEditing ? activity.controls.maybeClearName : Opt.none()
  return (
    <Box
      key={`name-${shown.nameKey}`}
      style={[styles.field, { borderColor: isEditing ? color.outline : color.disabledContainer }]}
    >
      <Text style={[styles.label, { color: isEditing ? color.onSurfaceVariant : color.disabledContent }]}>Name</Text>
      <TextInput
        accessibilityLabel='Name'
        defaultValue={shown.name}
        editable={isEditing}
        enterKeyHint='done'
        cursorColor={color.primary}
        style={[styles.input, { color: isEditing ? color.onSurface : color.disabledContent }]}
        onChangeText={activity._tag === 'Editing'
          ? (value) => dispatch({ ...activity.controls.nameTyped, value })
          : undefined}
      />
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

/**
 * The fields read from the top, the keypad at the bottom of their column, where the thumb rests, and "Save" docked
 * under it. The column scrolls when the screen is shorter (the keyboard open, a large font): "Save" stays in sight.
 */
const fields = (shown: FieldsShown, activity: Activity, dispatch: Tea.Dispatch<Message>) => [
  <ScrollView key='fields' keyboardShouldPersistTaps='handled' contentContainerStyle={styles.column}>
    {nameField(shown, activity, dispatch)}
    {Expiration.view(shown.expiration, Tea.forwardTo(dispatch, 'Expiration'))}
  </ScrollView>,
  <Box key='dock' style={styles.dock}>{saveButton(shown, activity, dispatch)}</Box>,
]

const failureTexts: Readonly<Record<Failure, string>> = {
  SaveFailed: 'Couldn\'t save the product',
  OrderNotKept: 'Couldn\'t save the date order',
  ProductGone: 'This product no longer exists',
}

/** Material's snackbar 16dp above the docked "Save" button, keyed by its id so that the next one is drawn anew. */
const snackbar = (shown: FieldsShown['snackbar']) =>
  Opt.match(shown, {
    onNone: () => null,
    onSome: ({ id, notice, entrance }) => (
      <Animated.View
        key={`snackbar-${id}`}
        entering={motion.snackbar.entering[entrance]}
        exiting={motion.snackbar.exiting}
        accessibilityLiveRegion='polite'
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>{failureTexts[notice]}</Text>
      </Animated.View>
    ),
  })

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
