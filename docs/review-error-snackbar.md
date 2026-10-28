# To review: failures told by the app's snackbar (commit 53e5134, 2026-10-28)

Choices made while replacing the Capacitor toast with app-drawn snackbars, to be confirmed or changed. Delete this
file once each item is settled.

- **"This product no longer exists" is told by Home.** The edit page leaves on that failure, so a snackbar of its
  own would vanish with the page. It raises a `ProductGone` event; the root passes it to Home (`src/app/program.ts`)
  and Home to Products, which shows it in its snackbar. This is a new kind of message from a parent to a child,
  which did not exist before. Alternatives: the root holds the snackbar; the edit page stays until it leaves.
- **The snackbar covers the docked Add or Save button** for its four seconds, on the add and edit pages. It stands
  over the bottom controls, 16dp from the edges, where Android's toast stood, and moves nothing on the page.
  Alternative: the controls rise above it, as Home's add button does.
- **A failed deletion replaces the offer to undo.** Before, the toast and the undo snackbar could show together. Now
  one snackbar stands at a time in Products, and the failure takes the undo's place.
- **Undo lasts 5 seconds, not 10.** `UNDO_DURATION` has always been 5 s while its comment says Material allows up to
  10 s. Kept at 5 s; decide which one is meant and align the comment or the value.
- **A deletion with nothing to undo lasts 4 s**, not 5, since its snackbar has no action.
- **Failure snackbars are not checked in a browser or on a device.** The in-memory storage does not fail, so only the
  programs' tests cover them; look at one on the emulator before the next release.
