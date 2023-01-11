import { build } from "esbuild";
import postcss from "esbuild-postcss";
import { injectManifest as inject } from 'workbox-build';
import { deleteAsync } from 'del';
import { promisify } from 'util';
import fs from 'fs';
import gulp from 'gulp';

const { series, parallel, src, dest } = gulp
const mkdir = promisify(fs.mkdir);

const target = ["chrome102", "edge108", "firefox108", "safari15"];
const minify = true;
const outDir = 'dist';

async function clean() {
    await deleteAsync(outDir);
    await mkdir(outDir)
}

async function copyAssets() {
    return src('./public/**')
        .pipe(dest(outDir));
}

async function injectManifest() {
    return inject({
        globDirectory: outDir,
        globPatterns: [
            '**/*.js',
            '**/*.css'
        ],
        swDest: outDir + '/sw.js',
        swSrc: outDir + '/sw.js'
    })

}

async function buildCss() {
    return build({
        entryPoints: ['src/style.css'],
        bundle: true,
        outdir: outDir,
        minify,
        plugins: [postcss()],
    });
}

async function buildApp() {
    return build({
        charset: 'utf8',
        platform: 'browser',
        logLevel: "info",
        sourcemap: 'linked',
        legalComments: 'eof',
        entryPoints: ["src/app.tsx", "src/sw.ts"],
        bundle: true,
        target,
        minify,
        outdir: outDir
    });
}


export default series(
    clean,
    parallel(
        copyAssets,
        series(
            buildApp,
            injectManifest
        ),
        buildCss
    )
);