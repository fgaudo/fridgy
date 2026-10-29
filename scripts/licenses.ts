// What the About page lists: the packages whose code the app ships, and the license of each. Two sources, each
// written to a file of its own: the JavaScript in Metro's bundle (`npmEntries`), and the Android libraries that
// Gradle packages (`androidEntries`, from AboutLibraries' export, with `nativeEntries`).
import * as Arr from 'effect/Array'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'

/**
 * The licenses the app may ship with, being AGPL-3.0-or-later: permissive ones, and the copyleft ones that combine
 * with it. A license outside this list, or none, fails the generation: the author decides, and adds it here.
 */
const ALLOWED = new Set([
  '0BSD',
  'AGPL-3.0-or-later',
  'Apache-2.0',
  'Apache-2.0 WITH LLVM-exception',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSL-1.0',
  'blessing',
  'dtoa',
  'IJG',
  'ISC',
  'MIT',
  'MPL-2.0',
  'NCSA',
  'Unlicense',
  'Zlib',
])

/**
 * Whether an SPDX expression is allowed: one alternative of an `OR`, every term of an `AND`. Parentheses are
 * dropped: the expressions packages declare are flat.
 */
export const isAllowed = (expression: string): boolean => {
  const flat = expression.replaceAll(/[()]/g, '').trim()
  if (flat.includes(' OR ')) return flat.split(' OR ').some(isAllowed)
  if (flat.includes(' AND ')) return flat.split(' AND ').every(isAllowed)
  return ALLOWED.has(flat)
}

/** The folder of each package a source of Metro's source map belongs to, from the last `node_modules`. */
export const bundledPackages = (sources: ReadonlyArray<string>): ReadonlySet<string> =>
  new Set(Arr.getSomes(Arr.map(sources, (source) => {
    const path = source.replaceAll('\\', '/')
    const at = path.lastIndexOf('node_modules/')
    if (at < 0) return Opt.none()
    const [first = '', second = ''] = path.slice(at + 'node_modules/'.length).split('/')
    const name = first.startsWith('@') ? `${first}/${second}` : first
    return Opt.some(`${path.slice(0, at)}node_modules/${name}`)
  })))

/** Metro's source map, with a section per module: only where each module comes from is read. */
export const SourceMap = Schema.fromJsonString(Schema.Struct({
  sections: Schema.Array(Schema.Struct({ map: Schema.Struct({ sources: Schema.Array(Schema.String) }) })),
}))

/** What AboutLibraries exports: each library with the ids of its licenses, and each license's SPDX id. */
export const AboutLibraries = Schema.fromJsonString(Schema.Struct({
  libraries: Schema.Array(Schema.Struct({
    uniqueId: Schema.String,
    artifactVersion: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    website: Schema.optional(Schema.String),
    developers: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.optional(Schema.String) }))),
    organization: Schema.optional(Schema.Struct({ name: Schema.optional(Schema.String) })),
    scm: Schema.optional(Schema.Struct({ url: Schema.optional(Schema.String) })),
    licenses: Schema.Array(Schema.String),
  })),
  licenses: Schema.Record(
    Schema.String,
    Schema.Struct({ spdxId: Schema.optional(Schema.String), name: Schema.String }),
  ),
}))

/** An entry of the About page, as `Entries` (`licenses.bundled.ts`) holds it, before encoding. */
export type Entry = Readonly<{
  licenses?: string | undefined
  repository?: string | undefined
  publisher?: string | undefined
  email?: string | undefined
  copyright?: string | undefined
  name?: string | undefined
  description?: string | undefined
}>

/** The Android libraries, keyed `group:artifact@version`, each license by its SPDX id, or its name without one. */
export const androidEntries = (
  exported: typeof AboutLibraries.Type,
): ReadonlyArray<readonly [string, Entry]> =>
  exported.libraries.map((library) => {
    const licenses = library.licenses.map((id) => {
      const license = exported.licenses[id]
      return license?.spdxId ?? license?.name ?? id
    })
    const publisher = library.organization?.name ?? library.developers?.find((d) => d.name !== undefined)?.name
    return [
      library.artifactVersion === undefined ? library.uniqueId : `${library.uniqueId}@${library.artifactVersion}`,
      {
        licenses: licenses.length === 0 ? undefined : licenses.join(' AND '),
        repository: library.scm?.url ?? library.website,
        publisher,
        name: library.name,
        description: library.description,
      },
    ] as const
  })

/** The entries whose license is missing or not allowed, by key, for the error that stops the generation. */
export const disallowed = (entries: ReadonlyArray<readonly [string, Entry]>): ReadonlyArray<string> =>
  entries
    .filter(([, entry]) => entry.licenses === undefined || !isAllowed(entry.licenses))
    .map(([key, entry]) => `${key}: ${entry.licenses ?? 'no license'}`)

/**
 * What the APK carries that no POM describes, listed by hand with the Android libraries: the C and C++ compiled into
 * the native libraries (`lib/<abi>/*.so`), and the module built from sources. Read on 2026-10-29 from React Native
 * 0.88.1 (the headers of `react-android`'s prefab, the versions of its `gradle/libs.versions.toml`), Hermes' `external/`,
 * libjpeg-turbo's version string in Fresco's `libnative-imagetranscoder.so`, op-sqlite's `sqlite3.h` and the NDK of
 * `android/build.gradle`; on 2026-10-30, from zxing-cpp 3.1.1's `core/CMakeLists.txt` (CameraX's POM names the
 * libyuv it compiles in). Read again after an upgrade of React Native, of Fresco, of op-sqlite, of the NDK or of
 * zxing-cpp.
 */
export const nativeEntries: ReadonlyArray<readonly [string, Entry]> = [
  ['bolts-tasks@5465bcc3b', {
    licenses: 'MIT',
    repository: 'https://github.com/BoltsFramework/Bolts-Android',
    copyright: 'Copyright (c) Facebook, Inc. and its affiliates.',
    name: 'Bolts Tasks',
    description: 'Built from the sources Meta relicensed under MIT, in place of the 1.4.0 that Fresco depends on.',
  }],
  ['boost@1.83.0', {
    licenses: 'BSL-1.0',
    repository: 'https://github.com/boostorg/boost',
    name: 'Boost',
    description: 'C++ libraries, compiled into React Native and Hermes.',
  }],
  ['double-conversion@1.1.6', {
    licenses: 'BSD-3-Clause',
    repository: 'https://github.com/google/double-conversion',
    copyright: 'Copyright 2006-2011, the V8 project authors.',
    name: 'double-conversion',
    description: 'Conversions between binary and decimal doubles, compiled into React Native.',
  }],
  ['dragonbox', {
    licenses: 'Apache-2.0 WITH LLVM-exception OR BSL-1.0',
    repository: 'https://github.com/jk-jeon/dragonbox',
    copyright: 'Copyright 2020-2024 Junekey Jeon',
    name: 'Dragonbox',
    description: 'Shortest float-to-string conversion, compiled into Hermes.',
  }],
  ['dtoa', {
    licenses: 'dtoa',
    repository: 'https://www.netlib.org/fp/',
    copyright: 'Copyright (c) 1991, 2000, 2001 by Lucent Technologies.',
    name: 'dtoa',
    description: 'David M. Gay\'s conversions of floating-point numbers, compiled into Hermes.',
  }],
  ['fast_float@8.0.0', {
    licenses: 'Apache-2.0 OR MIT OR BSL-1.0',
    repository: 'https://github.com/fastfloat/fast_float',
    copyright: 'Copyright (c) 2021 The fast_float authors',
    name: 'fast_float',
    description: 'Number parsing, compiled into React Native and Hermes.',
  }],
  ['fmt@12.1.0', {
    licenses: 'MIT',
    repository: 'https://github.com/fmtlib/fmt',
    copyright: 'Copyright (c) 2012 - present, Victor Zverovich and {fmt} contributors',
    name: '{fmt}',
    description: 'Text formatting, compiled into React Native.',
  }],
  ['folly@2024.11.18.00', {
    licenses: 'Apache-2.0',
    repository: 'https://github.com/facebook/folly',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    name: 'Folly',
    description: 'Meta\'s C++ library, compiled into React Native.',
  }],
  ['glog@0.3.5', {
    licenses: 'BSD-3-Clause',
    repository: 'https://github.com/google/glog',
    copyright: 'Copyright (c) 2008, Google Inc.',
    name: 'glog',
    description: 'Logging, compiled into React Native and Hermes.',
  }],
  ['hermes@260318099.0.5', {
    licenses: 'MIT',
    repository: 'https://github.com/facebook/hermes',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    name: 'Hermes',
    description: 'The JavaScript engine the app runs on.',
  }],
  ['libc++@ndk-27.1.12297006', {
    licenses: 'Apache-2.0 WITH LLVM-exception AND NCSA',
    repository: 'https://github.com/llvm/llvm-project',
    name: 'libc++',
    description: 'LLVM\'s C++ standard library, as the Android NDK ships it.',
  }],
  ['libjpeg-turbo@2.1.5.1', {
    licenses: 'IJG AND BSD-3-Clause AND Zlib',
    repository: 'https://github.com/libjpeg-turbo/libjpeg-turbo',
    copyright:
      'Copyright (C) 2009-2023 D. R. Commander; this software is based in part on the work of the Independent JPEG Group.',
    name: 'libjpeg-turbo',
    description: 'JPEG coding, compiled into Fresco\'s image transcoder.',
  }],
  ['libzueci@zxing-cpp-3.1.1', {
    licenses: 'BSD-3-Clause AND MIT',
    repository: 'https://github.com/zxing-cpp/zxing-cpp/tree/v3.1.1/core/src/libzueci',
    copyright: 'Copyright (C) 2022 gitlost; Copyright (c) 2008-2009 Bjoern Hoehrmann',
    name: 'libzueci',
    description: 'Conversions of a barcode\'s character sets, compiled into zxing-cpp.',
  }],
  ['llvh', {
    licenses: 'Apache-2.0 WITH LLVM-exception AND NCSA',
    repository: 'https://github.com/facebook/hermes/tree/main/external/llvh',
    name: 'LLVM support libraries',
    description: 'The copy of LLVM\'s libraries that Hermes is built on.',
  }],
  ['sqlite@3.53.4', {
    licenses: 'blessing',
    repository: 'https://sqlite.org',
    name: 'SQLite',
    description: 'The database, compiled into op-sqlite.',
  }],
]
