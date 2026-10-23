import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import type * as Path from 'effect/Path'

// Tailwind for `Bun.build`, on the installed `tailwindcss`. `bun-plugin-tailwind` does the same, but carries its
// own copy of Tailwind, frozen at the version it was published with.
export const tailwind = (projectRoot: string, path: Path.Path): Bun.BunPlugin => ({
  name: 'tailwind',
  setup: (build) => {
    build.onLoad({ filter: /\.css$/ }, async ({ path: file }) => {
      const compiler = await compile(await Bun.file(file).text(), {
        base: path.dirname(file),
        shouldRewriteUrls: true,
        onDependency: () => {},
      })
      // As Tailwind's own integrations: `source(none)` scans nothing, no `source(…)` scans the whole project
      // (skipping what .gitignore lists), and `@source` adds paths.
      const root = compiler.root === 'none'
        ? []
        : compiler.root === null
        ? [{ base: projectRoot, pattern: '**/*', negated: false }]
        : [{ ...compiler.root, negated: false }]
      const scanner = new Scanner({ sources: [...root, ...compiler.sources] })
      return { contents: compiler.build(scanner.scan()), loader: 'css' }
    })
  },
})
