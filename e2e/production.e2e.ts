// The production bundle in a browser (`docs/testing.md`): `dist/` as built, on the SQLite worker over OPFS, in
// headless Chromium on the reference screen. Run by `bun run e2e`, which builds first; `bun test` skips it. It
// acts as a user, by role and visible text, and imports nothing from `src/`.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import * as os from 'node:os'
import { type Browser, chromium, type Page } from 'playwright'
import packageJson from '../package.json' with { type: 'json' }

const DIST = new URL('../dist/', import.meta.url)

// Roboto, which the bundle does not ship (`scripts/cli.ts`): the harness serves it so that the reference screen
// is measured with the metrics the phone has, and not with the fonts of whoever runs the tests.
const ROBOTO = new URL('../node_modules/@fontsource-variable/roboto/', import.meta.url)
const ROBOTO_PATH = '/fonts/roboto/'
const ROBOTO_HEAD = `<link rel="stylesheet" href="${ROBOTO_PATH}wght.css" />
    <style>body { font-family: 'Roboto Variable', system-ui, sans-serif }</style>`

// Where CI keeps what a failed run leaves (`checks.yml`).
const { RUNNER_TEMP } = Bun.env
const SCREENSHOTS = `${RUNNER_TEMP ?? os.tmpdir()}/e2e`

// The worker, the WASM and the migration take a few seconds before the first view.
const START_TIMEOUT = 20_000

let server: ReturnType<typeof Bun.serve>
let browser: Browser

beforeAll(async () => {
  server = Bun.serve({
    hostname: 'localhost',
    port: 0,
    fetch: async (request) => {
      const { pathname } = new URL(request.url)
      if (pathname.startsWith(ROBOTO_PATH)) {
        const font = Bun.file(new URL(pathname.slice(ROBOTO_PATH.length), ROBOTO))
        return (await font.exists()) ? new Response(font) : new Response('Not found', { status: 404 })
      }
      if (pathname === '/') {
        const html = await Bun.file(new URL('index.html', DIST)).text()
        return new Response(html.replace('</head>', `  ${ROBOTO_HEAD}\n  </head>`), {
          headers: { 'content-type': 'text/html' },
        })
      }
      const file = Bun.file(new URL(`.${pathname}`, DIST))
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
    },
  })
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser.close()
  await server.stop()
})

/**
 * Runs `act` on the app, in a context of its own: a new context has an empty OPFS, so every test starts with no
 * products. An error of the page fails the test; a failure leaves a screenshot where CI keeps it. With
 * `maybeZone`, the device is in that zone, in English, and its clock stands at `time`.
 */
const onApp = async (
  name: string,
  act: (page: Page) => Promise<void>,
  maybeZone?: Readonly<{ timezoneId: string; time: string }>,
) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ...(maybeZone === undefined ? {} : { timezoneId: maybeZone.timezoneId, locale: 'en-US' }),
  })
  const page = await context.newPage()
  if (maybeZone !== undefined) {
    await page.clock.setFixedTime(maybeZone.time)
  }
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  try {
    await page.goto(server.url.href)
    await page.getByText('Nothing in the fridge').waitFor({ timeout: START_TIMEOUT })
    await act(page)
    expect(errors).toEqual([])
  } catch (error) {
    const screenshot = `${SCREENSHOTS}/${name}.png`
    await page.screenshot({ path: screenshot }).catch(() => undefined)
    throw new Error(`${String(error)}\nPage errors: ${JSON.stringify(errors)}\nScreenshot: ${screenshot}`, {
      cause: error,
    })
  } finally {
    await context.close()
  }
}

/** Fails unless the page fits the reference screen: neither the document nor a scrolling box scrolls. */
const expectNoScroll = async (page: Page, pageName: string) => {
  // Measured once the entrances are over: a page sliding in overflows while it moves, and once Roboto is in,
  // since a fallback font's metrics are not the ones the page is laid out for.
  // An animation that follows the scroll never finishes.
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations()
        .filter((animation) => animation.timeline instanceof DocumentTimeline)
        .map((animation) => animation.finished),
    )
  )
  await page.evaluate(() => document.fonts.ready)
  expect(
    await page.evaluate(() =>
      [...document.fonts].some((face) => face.family === 'Roboto Variable' && face.status === 'loaded')
    ),
    'Roboto has not loaded, so the measurement would be of another font',
  ).toBe(true)
  const scrolling = await page.evaluate(() => {
    const found: Array<string> = []
    const root = document.scrollingElement
    if (root !== null && root.scrollHeight > window.innerHeight) {
      found.push(`the document (${root.scrollHeight}px)`)
    }
    for (const element of document.querySelectorAll('*')) {
      const { overflowY } = getComputedStyle(element)
      if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight + 1) {
        found.push(`<${element.tagName.toLowerCase()} class="${element.className}">`)
      }
    }
    return found
  })
  expect(scrolling, `${pageName} scrolls at 320×640`).toEqual([])
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })

describe('the production bundle', () => {
  test('a product added by hand survives a reload, is edited and is deleted', async () => {
    await onApp('product', async (page) => {
      await expectNoScroll(page, 'Home, empty')
      await button(page, 'Add products').click()
      await page.getByRole('textbox', { name: 'Name' }).fill('Milk')
      await button(page, 'Set expiration').click()
      await button(page, 'Clear date').waitFor()
      await expectNoScroll(page, 'Add products, the date')
      await button(page, 'Back').click()
      await expectNoScroll(page, 'Add products, the name')
      await button(page, 'Add without date').click()
      // What a screen reader hears once the product is stored. The page cannot be left before.
      await page.getByText('Milk added.').waitFor({ state: 'attached' })
      await button(page, 'Close').click()
      await page.getByRole('heading', { name: 'Add products' }).first().waitFor({ state: 'detached' })
      await page.getByText('Milk').waitFor()
      await expectNoScroll(page, 'Home, one product')
      // The check of the worker and of OPFS: the product comes back from the database.
      await page.reload()
      await page.getByText('Milk').waitFor({ timeout: START_TIMEOUT })
      await page.getByText('Milk').click()
      await page.getByRole('heading', { name: 'Edit product' }).waitFor()
      await expectNoScroll(page, 'Edit product')
      await page.getByRole('textbox', { name: 'Name' }).fill('Butter')
      // Milk was added without a date, which the button says it keeps.
      await button(page, 'Save without date').click()
      await page.getByRole('heading', { name: 'Edit product' }).waitFor({ state: 'detached' })
      await page.getByText('Butter').waitFor()
      await page.getByText('Milk').waitFor({ state: 'detached' })
      // A right click is the desktop's long press, which selects the product.
      await page.getByText('Butter').click({ button: 'right' })
      await button(page, 'Delete').click()
      await page.getByText('Nothing in the fridge').waitFor()
    })
  }, 60_000)

  // In UTC, it is already October 31 (`docs/dates.md`). The device's zone reaches the app through the entrypoint.
  test('in New York at 20:30 on October 30, today is offered, and a product expiring today expires today', async () => {
    await onApp('zone', async (page) => {
      await button(page, 'Add products').click()
      await page.getByRole('textbox', { name: 'Name' }).fill('Milk')
      await button(page, 'Set expiration').click()
      for (const digit of '10302026') {
        await button(page, digit).click()
      }
      await page.getByText('Oct 30, 2026').waitFor()
      await button(page, 'Add').click()
      await page.getByText('Milk added.').waitFor({ state: 'attached' })
      await button(page, 'Close').click()
      await page.getByText('Expires today').waitFor()
    }, { timezoneId: 'America/New_York', time: '2026-10-31T00:30:00Z' })
  }, 60_000)

  test('About shows package.json\'s version', async () => {
    await onApp('about', async (page) => {
      await button(page, 'More options').click()
      await button(page, 'About').click()
      // About is a page to read, longer than any screen: it scrolls, by design.
      await page.getByText(`Version ${packageJson.version}`).waitFor()
    })
  }, 60_000)
})
