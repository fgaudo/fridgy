import esbuild from 'esbuild'
import postcss from 'esbuild-postcss'
import { injectManifest as inject } from 'workbox-build'
import { deleteAsync } from 'del'
import { promisify } from 'util'
import fs from 'fs'
import gulp from 'gulp'

const { series, parallel, src, dest } = gulp
const mkdir = promisify(fs.mkdir)

const target = ['chrome102', 'edge108', 'firefox108', 'safari15']
const outDir = 'dist'

async function clean () {
  await deleteAsync(outDir)
  await mkdir(outDir)
}

async function copyAssets () {
  return src('./public/**').pipe(dest(outDir))
}

async function injectManifest () {
  return inject({
    globDirectory: outDir,
    globPatterns: ['**/*.js', '**/*.css'],
    swDest: outDir + '/sw.js',
    swSrc: outDir + '/sw.js'
  })
}

async function buildApp () {
  return esbuild.build({
    charset: 'utf8',
    platform: 'browser',
    logLevel: 'info',
    sourcemap: false,
    legalComments: 'eof',
    define: { DEBUG: 'false', BASE_URL: '"http://127.0.0.1:35000"' },
    entryPoints: ['src/index.ts', 'src/sw.ts', 'src/style.css'],
    bundle: true,
    plugins: [postcss()],
    target,
    minify: true,
    outdir: outDir
  })
}

async function serveApp () {
  return esbuild.build({
    charset: 'utf8',
    platform: 'browser',
    logLevel: 'info',
    sourcemap: 'linked',
    legalComments: 'none',
    define: { DEBUG: 'true', BASE_URL: '"http://127.0.0.1:35000"' },
    entryPoints: ['src/index.ts', 'src/style.css'],
    bundle: true,
    watch: true,
    plugins: [postcss()],
    target,
    minify: true,
    outdir: outDir
  })
}

export default series(
  clean,
  parallel(copyAssets, series(buildApp, injectManifest))
)

export const serve = series(clean, copyAssets, serveApp)
