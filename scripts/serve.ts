import * as Bun from 'bun'
import path from 'path'

import index from '../src/index.html'

await Bun.build({
	entrypoints: [path.join(import.meta.dir, '../src/sqlite-worker.ts')],
	outdir: path.join(import.meta.dir, '../dist'),
})

Bun.serve({
	development: true,

	port: 3000,
	routes: {
		'/wa-sqlite.wasm': Bun.file(
			path.join(
				import.meta.dir,
				'../node_modules/@effect/wa-sqlite/dist/wa-sqlite.wasm',
			),
		),
		'/index.html': index,
		'/sqlite-worker.js': Bun.file(
			path.join(import.meta.dir, '../dist/sqlite-worker.js'),
		),
	},
})
