import * as Cause from 'effect/Cause'

const sentences = (value: unknown): ReadonlyArray<string> =>
  value instanceof Error
    ? [`${value.name}: ${value.message}`, ...(value.cause === undefined ? [] : sentences(value.cause))]
    : [String(value)]

/**
 * The text of what a crash ended with: the sentence of each defect and of each error it wraps, a line each. A
 * `ProgramDefect` says where, the `InvariantDefect` it wraps which rule was broken. No stack: a release's is
 * minified, and names no function of the app.
 */
export const detail = (cause: Cause.Cause<unknown>): string =>
  cause.reasons
    .flatMap((reason) =>
      Cause.isDieReason(reason)
        ? sentences(reason.defect)
        : Cause.isFailReason(reason)
        ? sentences(reason.error)
        : []
    )
    .join('\n')
