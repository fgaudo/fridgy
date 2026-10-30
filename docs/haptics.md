# Design: vibrations

Implemented on 2026-10-28, in `src/infrastructure/haptics` and in the programs that vibrate; not yet felt on
Android (see "Verified, and not"). Read [`AGENTS.md`](../AGENTS.md), the `add-service` skill and the "Guide" of
`node_modules/@fgaudo/effect-tea/README.md` before changing it.

## Decisions

- **Few vibrations, each with one meaning.** Material defers to Android's haptics principles: less is more, the
  same effect for the same kind of event, and no haptics rather than buzzy ones. The app has three, named after
  Android's `HapticFeedbackConstants` (`Feedback` in `src/infrastructure/haptics/haptics.ts`): `LongPress`,
  `Confirm` and `Reject`.
- **A vibration is a command, started by `update`.** Its transition decides it, as it decides a snackbar, so the
  programs' tests check it. A program lists `Haptics`, a service of the infrastructure, directly: a feedback means
  the same to every page.
- **React Native's `Vibration` plays it**, as patterns (`haptics.react-native.ts`): a short pulse for `Confirm`,
  a longer one for `LongPress`, two for `Reject`. React Native has no access to the system's constants
  (`View.performHapticFeedback`), which would respect "Touch feedback" on every version and give the keypad a
  key click; a small native module would. Until then the patterns stand for the constants, and the app
  declares `VIBRATE`. A vibration the platform refuses is a `HapticsError`, which the programs log as a warning and go past.
- **The web build played them through Capacitor's `Haptics`** (the heavy impact, the medium one, the error's two
  pulses); what "Verified, and not" says of its waveforms is that plugin's.

## What vibrates

| Feedback    | When                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `LongPress` | a long press on a row of Home's list, whether it selects the row or deselects it                     |
| `Confirm`   | a product added; a product edited and saved; the selected products deleted; a barcode read           |
| `Reject`    | every failure a snackbar tells (add, save, delete, undo, date order, product gone); the camera fails |

A barcode read vibrates because the phone is then pointed at the product, not looked at. A product that is gone
when saved is a `Reject`: the save did not happen.

## What does not, and why

- **Taps.** A tap on a button, a row, a segment or a day of the strip is answered by the state layer's ripple; a
  tap that selects a row, once something is selected, too. Android vibrates on a long press, not on a tap.
- **The keypad's keys.** A key click should last 10 to 20 ms: the plugin's lightest impact lasts 50 ms, which is
  buzzy at typing speed.
- **The undo, a lookup's answer, opening and closing a page.** They change what is shown, which says enough.

## Verified, and not

- The commands are checked by each program's `program.test.ts`; the root's tests run them on a device without
  a vibrator.
- Seen in the emulator on 2026-10-28 (`dumpsys vibrator` on Android 10, `dumpsys vibrator_manager` on Android
  17): `Confirm` is a 43 ms waveform at amplitude 180 of 255, `LongPress` a 60 ms one at 255. Android 17 files
  them as `usage: TOUCH` and, with "Touch feedback" off, drops them (`ignored_for_settings`); Android 10 plays
  them with the setting off (`usageHint: 0`). On Android 17 the WebView vibrates on its own on a long press
  (`performHapticFeedback(LONG_PRESS)`, a `HEAVY_CLICK`), though the row prevents `contextmenu`, 3 ms before
  the plugin's, which supersedes it (`cancelled_superseded`); on Android 10 it does not. The system's vibration
  switch was not tried.
- Felt on a phone (Galaxy S21, Android 15) on 2026-10-30: each pattern feels like the constant it stands for.
