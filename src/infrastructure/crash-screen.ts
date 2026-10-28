import * as Effect from 'effect/Effect'
import * as Fonts from './fonts.ts'
import * as SplashScreen from './splash-screen.ts'

const element = (tag: string, className: string, text?: string) => {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * The screen a defect leaves: Material's empty state in the error's colors, and a filled button that reloads the
 * page. The program cannot go on, and the database is on disk, so a reload starts the app where it was. The cause
 * goes to the console, where the runtime writes it; nothing of it is shown or sent.
 */
const screen = () => {
  const column = element(
    'div',
    'flex min-h-dvh flex-col items-center justify-center gap-2 bg-surface px-8 pt-sait pb-saib pl-sail pr-sair text-center',
  )
  const disc = element(
    'div',
    'mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-error-container text-on-error-container',
  )
  disc.append(element('span', 'material-symbols-rounded icon-large', 'error'))
  const button = element(
    'button',
    'state-layer mt-6 h-14 rounded-full bg-primary px-6 text-label-large text-on-primary',
    'Restart Fridgy',
  )
  button.addEventListener('click', () => location.reload())
  column.append(
    disc,
    element('h1', 'text-headline-small text-on-surface', 'Fridgy stopped'),
    element(
      'p',
      'text-body-large text-on-surface-variant',
      'Something went wrong inside the app. Your products are kept.',
    ),
    button,
  )
  return column
}

/**
 * Puts the screen in the page's place. A defect before the first paint leaves the splash screen up and the icon
 * font unloaded, as the first view would: both are seen to, as `onFirstPaint` does.
 */
export const show = Effect.sync(() => {
  document.body.replaceChildren(screen())
}).pipe(Effect.andThen(Fonts.loaded), Effect.andThen(SplashScreen.hide))
