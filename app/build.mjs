import { deleteAsync } from 'del'
import esbuild from 'esbuild'
import postcss from 'esbuild-postcss'
import fs from 'fs'
import { promisify } from 'util'
import { injectManifest as inject } from 'workbox-build'

const mkdir = promisify(fs.mkdir)

const target = ['chrome102', 'edge108', 'firefox108', 'safari15']
const outDir = 'dist'

async function clean() {
	await deleteAsync(outDir)
	await mkdir(outDir)
}

async function injectManifest() {
	return inject({
		globDirectory: outDir,
		globPatterns: ['**/*.js', '**/*.css'],
		swDest: outDir + '/sw.js',
		swSrc: outDir + '/sw.js'
	})
}

async function buildApp() {
	return esbuild.build({
		charset: 'utf8',
		platform: 'browser',
		logLevel: 'info',
		sourcemap: false,
		legalComments: 'eof',
		define: { DEBUG: 'false', BASE_URL: '"http://127.0.0.1:35000"' },
		entryPoints: ['src/index.ts', 'src/sw.ts'],
		bundle: true,
		plugins: [postcss()],
		target,
		minify: true,
		outdir: outDir
	})
}

async function serveApp() {
	const context = await esbuild.context({
		charset: 'utf8',
		platform: 'browser',
		logLevel: 'info',
		sourcemap: 'linked',
		legalComments: 'none',
		define: { DEBUG: 'true', BASE_URL: '"http://127.0.0.1:35000"' },
		entryPoints: ['src/index.ts', 'src/style.css', 'src/index.html'],
		bundle: true,
		plugins: [postcss()],
		loader: { '.html': 'copy' },
		target,
		assetNames: '[name]',
		minify: true,
		outdir: outDir
	})

	await context.watch()
}

;(async () => {
	await clean()
	await serveApp()
})()
