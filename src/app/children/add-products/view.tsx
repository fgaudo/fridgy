import * as Tea from '@fgaudo/effect-tea'
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
import Animated, { FadeOut, Keyframe } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Expiration from '#app/programs/expiration/view.tsx'
import CameraPreview from '#infrastructure/barcode-camera/BarcodeCameraPreviewNativeComponent.ts'
import { handlers, type View } from '#libs/tea-react/tea-react.ts'
import { color, duration, easing, elevation, icon, motion, shape, type } from '#styles'
import type * as FridgeProgram from './children/fridge/program.ts'
import * as Fridge from './children/fridge/view.tsx'
import type { DateShown, Failure, Message, Model, NameShown, NameTyped, SnackbarShown, Supporting } from './program.ts'

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
  input: { ...type.bodyLarge, paddingVertical: 0, paddingRight: 40 },
  trailing: { position: 'absolute', right: 4 },
  supporting: { ...type.bodySmall, minHeight: 16, paddingHorizontal: 16, color: color.onSurfaceVariant },
  link: { color: color.primary, textDecorationLine: 'underline' },
  // The FAB's margin is Material's, and leaves its shadow inside the scroll, which clips what it holds.
  room: { flex: 1, minHeight: 80 },
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
  // The dock, inside the column: its padding and gap already give the sides and 12dp of the top.
  nameDock: { gap: 12, paddingTop: 4, paddingBottom: 16 },
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
  // On one line: a long name scrolls sideways within the heading's edges, as in a field, rather than taking a second
  // line, which the reference screen has no room for.
  headingName: { ...type.titleLarge, color: color.onSurface },
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

/** What the first step is doing, and which of its controls take. */
type NameActivity =
  | { _tag: 'Editing'; controls: Model & { _tag: 'Naming' } }
  | { _tag: 'LookingUp'; controls: Model & { _tag: 'LookingUp' } }
  | { _tag: 'Adding'; canScan: boolean; nameTyped: NameTyped }

type DateActivity = Readonly<
  { _tag: 'Editing'; controls: Model & { _tag: 'Dating' } } | { _tag: 'Adding' }
>

/**
 * A control that takes a tap, or takes none. One that takes none is drawn disabled, or as it was while a product is
 * added from the first step (`Held`): the add is over in a frame or two, and controls greyed for them would flash.
 * `Running` is the button whose action runs, drawn with the circular indicator.
 */
type Control = Readonly<{ _tag: 'Takes'; message: Message } | { _tag: 'Held' } | { _tag: 'Running' } | { _tag: 'Off' }>

const held: Control = { _tag: 'Held' }

const control = (maybeMessage: Opt.Option<Message>): Control =>
  Opt.match(maybeMessage, {
    onNone: (): Control => ({ _tag: 'Off' }),
    onSome: (message) => ({ _tag: 'Takes', message }),
  })

const pressed = (shown: Control, dispatch: Tea.Dispatch<Message>) =>
  shown._tag === 'Takes' ? handlers(dispatch).on(shown.message) : undefined

/** The top app bar of Material's full-screen dialog: its leading icon button and its title. */
const appBar = (
  title: string,
  iconName: string,
  iconTitle: string,
  shown: Control,
  dispatch: Tea.Dispatch<Message>,
) => (
  <Box style={styles.bar}>
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={iconTitle}
      accessibilityState={{ disabled: shown._tag !== 'Takes' }}
      style={styles.iconButton}
      onPress={pressed(shown, dispatch)}
    >
      {icon(iconName, shown._tag === 'Off' ? color.disabledContent : color.onSurface)}
    </Pressable>
    <Text accessibilityRole='header' numberOfLines={1} style={styles.title}>{title}</Text>
  </Box>
)

/** Material's filled or text button. The circular indicator replaces the label while the action runs. */
const button = (label: string, shown: Control, kind: 'Filled' | 'Text', dispatch: Tea.Dispatch<Message>) => {
  const isEnabled = shown._tag !== 'Off'
  const tint = kind === 'Filled'
    ? (isEnabled ? color.onPrimary : color.disabledContent)
    : (isEnabled ? color.primary : color.disabledContent)
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: shown._tag !== 'Takes', busy: shown._tag === 'Running' }}
      style={[
        kind === 'Filled' ? styles.filledButton : styles.textButton,
        kind === 'Filled' && { backgroundColor: isEnabled ? color.primary : color.disabledContainer },
      ]}
      onPress={pressed(shown, dispatch)}
    >
      {shown._tag === 'Running'
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
 * Material's outlined text field of the name, drawn anew when the name is replaced (a scan, a clearing). From then on
 * the user owns its text, which the field sends as it changes. Focused whenever it is drawn anew and editable: as the
 * step opens, after a product found and a clearing. It stays editable while a product is added: a disabled field
 * would close the keyboard.
 */
const nameField = (shown: NameShown, activity: NameActivity, dispatch: Tea.Dispatch<Message>) => {
  const isEditing = activity._tag !== 'LookingUp'
  const maybeTyped = activity._tag === 'Editing'
    ? Opt.some(activity.controls.nameTyped)
    : activity._tag === 'Adding'
    ? Opt.some(activity.nameTyped)
    : Opt.none()
  // A product is added only with a name, which the clearing button stays on.
  const clearName: Control = activity._tag === 'Editing'
    ? control(activity.controls.maybeClearName)
    : activity._tag === 'Adding'
    ? held
    : { _tag: 'Off' }
  return (
    <Box key={`name-${shown.nameKey}`}>
      <Box style={[styles.field, { borderColor: isEditing ? color.outline : color.disabledContainer }]}>
        <Text style={[styles.label, { color: isEditing ? color.onSurfaceVariant : color.disabledContent }]}>Name</Text>
        <TextInput
          accessibilityLabel='Name'
          defaultValue={shown.name}
          editable={isEditing}
          autoFocus={isEditing}
          enterKeyHint='done'
          cursorColor={color.primary}
          style={[styles.input, { color: isEditing ? color.onSurface : color.disabledContent }]}
          onChangeText={Opt.match(maybeTyped, {
            onNone: () => undefined,
            onSome: (typed) => (value: string) => dispatch({ ...typed, value }),
          })}
        />
        {activity._tag === 'LookingUp'
          ? (
            <Box style={[styles.iconButton, styles.trailing]}>
              <ActivityIndicator accessibilityLabel='Looking up the product' color={color.primary} />
            </Box>
          )
          : clearName._tag === 'Off'
          ? null
          : (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Clear name'
              accessibilityState={{ disabled: clearName._tag !== 'Takes' }}
              style={[styles.iconButton, styles.trailing]}
              onPress={pressed(clearName, dispatch)}
            >
              {icon('cancel', color.onSurfaceVariant)}
            </Pressable>
          )}
      </Box>
      {supportingText(shown.supporting)}
    </Box>
  )
}

/** Material's FAB that opens the scanner: the step's secondary action, in the tertiary's color, under the thumb. */
const scanFab = (shown: Control, dispatch: Tea.Dispatch<Message>) => {
  const isEnabled = shown._tag !== 'Off'
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Scan barcode'
      accessibilityState={{ disabled: shown._tag !== 'Takes' }}
      style={[styles.scanFab, {
        backgroundColor: isEnabled ? color.tertiaryContainer : color.disabledContainer,
        // A disabled FAB lies flat: a shadow under a translucent container shows through it.
        elevation: isEnabled ? elevation.level3 : 0,
      }]}
      onPress={pressed(shown, dispatch)}
    >
      {icon('barcode_scanner', isEnabled ? color.onTertiaryContainer : color.disabledContent)}
    </Pressable>
  )
}

/**
 * The first step: the name under the app bar, the two ways out at the bottom, the scan FAB above them. The ways out
 * scroll with the name: docked, they would leave a short screen with the keyboard open no room to show it.
 */
const nameStep = (
  shown: NameShown,
  activity: NameActivity,
  fridge: FridgeProgram.Model,
  dispatch: Tea.Dispatch<Message>,
) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  // While a product is added, the controls are drawn as they were: both ways out took, since one started it.
  const editing = (maybeMessage: Opt.Option<Message>) => activity._tag === 'Adding' ? held : control(maybeMessage)
  const close = activity._tag === 'Adding' ? held : control(Opt.some(activity.controls.close))
  const scan = activity._tag === 'Adding'
    ? (activity.canScan ? held : control(Opt.none()))
    : control(Opt.flatMap(controls, ({ maybeScan }) => maybeScan))
  return (
    <Animated.View key='naming' exiting={heldUnder} style={styles.step}>
      {appBar('Add products', 'close', 'Close', close, dispatch)}
      <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.column}>
        {nameField(shown, activity, dispatch)}
        <Box style={styles.room}>
          {Fridge.view(fridge, Tea.forwardTo(dispatch, 'Fridge'))}
          {scanFab(scan, dispatch)}
        </Box>
        <Box style={styles.nameDock}>
          {button(
            'Set expiration',
            editing(Opt.flatMap(controls, ({ maybeRequestDate }) => maybeRequestDate)),
            'Filled',
            dispatch,
          )}
          {activity._tag === 'LookingUp'
            ? button('Cancel', control(Opt.some(activity.controls.cancelLookup)), 'Text', dispatch)
            : button('Add without date', editing(Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd)), 'Text', dispatch)}
        </Box>
      </ScrollView>
    </Animated.View>
  )
}

/** The second step, laid out as a dialer: the fields read from the top, the keypad and the button at the bottom. */
const dateStep = (shown: DateShown, activity: DateActivity, dispatch: Tea.Dispatch<Message>) => {
  const controls = activity._tag === 'Editing' ? Opt.some(activity.controls) : Opt.none()
  // The surface and the controls are siblings. An exit inside another exit holds back every change above them
  // until both end: the page's room for a keyboard rising as the name step comes back.
  return (
    <>
      <Animated.View key='dating-surface' {...sharedAxis.surface} style={styles.step} />
      <Animated.View key='dating' {...sharedAxis.controls} style={styles.layer}>
        {appBar('Add products', 'arrow_back', 'Back', control(Opt.map(controls, ({ back }) => back)), dispatch)}
        <ScrollView contentContainerStyle={styles.dateColumn}>
          <Box style={styles.heading}>
            <Text style={styles.headingLabel}>Product</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text accessibilityRole='header' style={styles.headingName}>{shown.name}</Text>
            </ScrollView>
          </Box>
          {Expiration.view(shown.expiration, Tea.forwardTo(dispatch, 'Expiration'))}
        </ScrollView>
        <Box style={styles.dock}>
          {button(
            'Add',
            activity._tag === 'Adding'
              ? { _tag: 'Running' }
              : control(Opt.flatMap(controls, ({ maybeAdd }) => maybeAdd)),
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
const scanner = (model: Model & { _tag: 'Scanning' }, dispatch: Tea.Dispatch<Message>) => (
  <Animated.View key='scanner' {...motion.fullScreenDialog} style={styles.step}>
    {appBar('Scan barcode', 'close', 'Close', control(Opt.some(model.closeScanner)), dispatch)}
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
 * The heights of the controls at the bottom of each step, and the 16dp above them: on the first step, its two buttons
 * (140) and the scan FAB, 16dp over them; on the second, the "Add" button.
 */
const clearances = { Naming: 140 + 16 + 56 + 16, Dating: 88 } as const

/**
 * Material's snackbar 16dp above the controls at the bottom of the step shown, drawn anew for each id. One that leaves
 * stays where it stood.
 */
const snackbar = (shown: SnackbarShown, step: keyof typeof clearances) =>
  Opt.match(shown, {
    onNone: () => null,
    onSome: ({ id, notice, entrance }) => (
      <Animated.View
        key={`snackbar-${id}`}
        entering={motion.snackbar.entering[entrance]}
        exiting={motion.snackbar.exiting}
        accessibilityLiveRegion='polite'
        style={[styles.snackbar, { bottom: clearances[step] }]}
      >
        <Text style={styles.snackbarText}>{failureTexts[notice]}</Text>
      </Animated.View>
    ),
  })

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
      naming: nameStep(lookingUp, { _tag: 'LookingUp', controls: lookingUp }, lookingUp.fridge, dispatch),
    }),
    Scanning: (scanning) => ({ ...nothing, scanner: scanner(scanning, dispatch) }),
    Dating: (dating) => ({ ...nothing, dating: dateStep(dating, { _tag: 'Editing', controls: dating }, dispatch) }),
    Adding: (adding) =>
      Match.valueTags(adding.step, {
        Naming: ({ fridge, canScan, nameTyped }) => ({
          ...nothing,
          naming: nameStep(adding, { _tag: 'Adding', canScan, nameTyped }, fridge, dispatch),
        }),
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
