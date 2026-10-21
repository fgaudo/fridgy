type Tagged = Readonly<{ _tag: string }>

const isTagged = (value: unknown): value is Tagged =>
  typeof value === 'object' && value !== null && '_tag' in value && typeof value._tag === 'string'

/**
 * A message or a command by what it is, without its data: its tag, then the tags of what it wraps in
 * `message` or `command` (e.g. `Home › Products › ItemSelected`), as effect-tea's logs show it.
 */
export const tagPath = (value: Tagged): string => {
  const wrapped = 'message' in value ? value.message : 'command' in value ? value.command : undefined
  return isTagged(wrapped) ? `${value._tag} › ${tagPath(wrapped)}` : value._tag
}
