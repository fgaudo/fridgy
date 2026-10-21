type Tagged = Readonly<{ _tag: string }>

const isTagged = (value: unknown): value is Tagged =>
  typeof value === 'object' && value !== null && '_tag' in value && typeof value._tag === 'string'

/**
 * A tagged value as the logs show it: its tag, then the tags of what it wraps in `message` or `command`
 * (e.g. `Home › Products › ItemSelected`), never its data, which may be personal.
 */
export const describeTags = (value: Tagged): string => {
  const wrapped = 'message' in value ? value.message : 'command' in value ? value.command : undefined
  return isTagged(wrapped) ? `${value._tag} › ${describeTags(wrapped)}` : value._tag
}
