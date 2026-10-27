import type * as Tea from '@fgaudo/effect-tea'
import * as Effect from 'effect/Effect'
import type { Hooks, On, VNode } from 'snabbdom'

export type View<Model, Message> = Tea.View<Model, Message, VNode>

type EventName = keyof HTMLElementEventMap

/**
 * Builds snabbdom's `on` from the messages in the model. snabbdom's handlers are plain callbacks: a dispatch
 * needs no services and completes synchronously, so it runs with `Effect.runSync`.
 */
export const handlers = <Message>(dispatch: Tea.Dispatch<Message>) => {
  const send = (message: Message) => Effect.runSync(dispatch(message))
  return {
    on: (event: EventName, message: Message): On => ({ [event]: () => send(message) }),
    /** For a message built from what the event carries, e.g. an input's value. */
    onValue: <Value>(
      event: EventName,
      toMessage: (value: Value) => Message,
      read: (event: Event) => Value,
    ): On => ({ [event]: (domEvent: Event) => send(toMessage(read(domEvent))) }),
    /**
     * Always prevents the browser's default (e.g. the native menu of a long press), and sends the message when
     * there is one.
     */
    onPreventingDefault: (event: EventName, message?: Message): On => ({
      [event]: (domEvent: Event) => {
        domEvent.preventDefault()
        if (message !== undefined) send(message)
      },
    }),
  }
}

export type Handlers<Message> = ReturnType<typeof handlers<Message>>

/**
 * Writes `text` into an input only when it is created. From then on the user owns its text, and the program
 * learns it from the input's messages: writing the model's text on every frame could draw a frame older than
 * the last keys, taking them back and moving the caret. To replace the text, give the input a new `key`.
 */
export const initialValue = (text: string): NonNullable<Hooks['create']> => (_, vnode) => {
  ;(vnode.elm as HTMLInputElement).value = text
}

/**
 * Focuses an input once it is in the document, so that the keyboard is up where the user is about to type.
 * Only then: a focus on every frame would fight the user's own. To focus again, give the input a new `key`.
 */
export const focusOnInsert: NonNullable<Hooks['insert']> = (vnode) => {
  ;(vnode.elm as HTMLInputElement).focus()
}

type Point = Readonly<{ x: number; y: number }>

const centreOf = ({ left, top, width, height }: DOMRect): Point => ({ x: left + width / 2, y: top + height / 2 })

/** The last match of `selector`: the one drawn on top. */
const lastOf = (selector: string) => Array.from(document.querySelectorAll(selector)).at(-1)

const setPoint = (element: HTMLElement, name: string, { x, y }: Point) => {
  element.style.setProperty(`--${name}-dx`, `${x}px`)
  element.style.setProperty(`--${name}-dy`, `${y}px`)
}

/** Where the text of an element is drawn, inside its border and padding, and how tall a line of it is. */
const textBoxOf = (element: Element) => {
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  const px = Number.parseFloat
  const left = rect.left + px(style.borderLeftWidth) + px(style.paddingLeft)
  const top = rect.top + px(style.borderTopWidth) + px(style.paddingTop)
  const width = rect.right - px(style.borderRightWidth) - px(style.paddingRight) - left
  const height = rect.bottom - px(style.borderBottomWidth) - px(style.paddingBottom) - top
  // An input centres its one line; other elements start at the top. A `normal` line height is the font's own,
  // about 1.2 times its size.
  const lineHeight = element instanceof HTMLInputElement
    ? height
    : style.lineHeight === 'normal'
    ? px(style.fontSize) * 1.2
    : px(style.lineHeight)
  return { left, top, width, lineHeight, style }
}

/**
 * Turns the text of the last match of `from` into an element that then travels to the last match of `to`, once it
 * is in the document: the keyframes do the moving, with what this measures. Measured once, on insertion: a measure
 * on every frame would fight the animation.
 *
 * The element is positioned (`absolute` or `fixed`) at the top left of its containing block, which may be moved by
 * a transform: its own place is measured first. It holds `[data-letters]`, whose `[data-letter]` pieces are the
 * text, and `[data-traveller]`. The letters are laid over the text, in its font, one line of it (those
 * past its width are hidden), each given the way to their centre (`--gather-dx`, `--gather-dy`) and its place
 * among them, from 0 to 1 (`--stagger`); the traveller is placed at that centre and given the way to `to`
 * (`--flight-dx`, `--flight-dy`). Without `from`, the traveller starts where `to` is, with no letters; without
 * `to`, everything is hidden.
 */
export const gatherAndFly = (from: string, to: string): NonNullable<Hooks['insert']> => (vnode) => {
  const element = vnode.elm as HTMLElement
  const letters = element.querySelector<HTMLElement>('[data-letters]')
  const traveller = element.querySelector<HTMLElement>('[data-traveller]')
  const maybeTo = lastOf(to)
  if (letters === null || traveller === null || maybeTo === undefined) {
    element.style.visibility = 'hidden'
    return
  }
  const origin = element.getBoundingClientRect()
  const end = centreOf(maybeTo.getBoundingClientRect())
  const maybeFrom = lastOf(from)
  const start = maybeFrom === undefined ? end : gather(letters, maybeFrom, origin)
  if (maybeFrom === undefined) letters.style.visibility = 'hidden'
  const size = traveller.getBoundingClientRect()
  traveller.style.left = `${start.x - origin.left - size.width / 2}px`
  traveller.style.top = `${start.y - origin.top - size.height / 2}px`
  setPoint(traveller, 'flight', { x: end.x - start.x, y: end.y - start.y })
}

/** Lays the letters over the text of `source`, sends each to their centre, and returns it. */
const gather = (letters: HTMLElement, source: Element, origin: DOMRect): Point => {
  const box = textBoxOf(source)
  letters.style.font = box.style.font
  letters.style.letterSpacing = box.style.letterSpacing
  letters.style.left = `${box.left - origin.left}px`
  letters.style.top = `${box.top - origin.top}px`
  letters.style.width = `${box.width}px`
  letters.style.height = `${box.lineHeight}px`
  // The letters take the direction of their own text: they start where the source's text does.
  letters.style.justifyContent = getComputedStyle(letters).direction === box.style.direction
    ? 'flex-start'
    : 'flex-end'
  const right = box.left + box.width
  const shown = Array.from(letters.querySelectorAll<HTMLElement>('[data-letter]')).flatMap((letter) => {
    const rect = letter.getBoundingClientRect()
    if (rect.left < box.left - 1 || rect.right > right + 1) {
      letter.style.visibility = 'hidden'
      return []
    }
    return [{ letter, rect }]
  })
  if (shown.length === 0) return centreOf(letters.getBoundingClientRect())
  const left = Math.min(...shown.map(({ rect }) => rect.left))
  const top = Math.min(...shown.map(({ rect }) => rect.top))
  const centre = centreOf(
    new DOMRect(
      left,
      top,
      Math.max(...shown.map(({ rect }) => rect.right)) - left,
      Math.max(...shown.map(({ rect }) => rect.bottom)) - top,
    ),
  )
  shown.forEach(({ letter, rect }, index) => {
    const own = centreOf(rect)
    setPoint(letter, 'gather', { x: centre.x - own.x, y: centre.y - own.y })
    letter.style.setProperty('--stagger', String(shown.length > 1 ? index / (shown.length - 1) : 0))
  })
  return centre
}
