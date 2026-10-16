// The public API of the package: everything else in `src/` is internal.

// A program: its pieces, and how a child program is lifted into its parent.
export { embed, embedEach, type Program } from './program.ts'

// What `update` returns, and the effects it describes.
export {
  type Bug,
  type BugReporter,
  type Command,
  type DefectSource,
  type Emitter,
  isRejected,
  reject,
  type Rejected,
  RejectedMessage,
  type RejectionOptions,
  type RejectionPolicy,
  type Step,
  type Subscription,
  type Subscriptions,
  type Transition,
  type Update,
} from './engine.ts'

// Commands from effects that may fail: their failures become messages.
export { attempt } from './command.ts'

// What the model offers to the view, decided by asking `update`.
export { type InputOffer, type Offer, type Offered, offered, offeredInput, type Offers, offers } from './offer.ts'

// Views, independent of the renderer.
export { type Dispatch, mapDispatch, type View } from './view.ts'

// Running a program with a renderer.
export { type Frame, run, type RunOptions } from './run.ts'
