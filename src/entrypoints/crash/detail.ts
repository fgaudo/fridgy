import * as Cause from 'effect/Cause'

const chain = (value: unknown): ReadonlyArray<unknown> =>
  value instanceof Error && value.cause !== undefined ? [value, ...chain(value.cause)] : [value]

const sentence = (value: unknown): string => value instanceof Error ? `${value.name}: ${value.message}` : String(value)

/**
 * The text of what a crash ended with. First the sentence of each defect and of each error it wraps, a line each: a
 * `ProgramDefect` says where, the `InvariantDefect` it wraps which rule was broken. Then their stacks, which a
 * release names functions in: Hermes keeps the names of a bundle that the build does not minify.
 */
export const detail = (cause: Cause.Cause<unknown>): string => {
  const values = cause.reasons.flatMap((reason) =>
    Cause.isDieReason(reason)
      ? chain(reason.defect)
      : Cause.isFailReason(reason)
      ? chain(reason.error)
      : []
  )
  // A stack's first line is the engine's, and may name the error by a class it extends: the sentence replaces it.
  const stacks = values.flatMap((value) =>
    value instanceof Error && value.stack !== undefined
      ? [[sentence(value), ...value.stack.split('\n').filter((line) => /^\s+at /.test(line)).map((line) => line.trim())]
        .join('\n')]
      : []
  )
  return [values.map(sentence).join('\n'), ...stacks].join('\n\n')
}
