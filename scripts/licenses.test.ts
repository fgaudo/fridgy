import { describe, expect, test } from 'bun:test'
import { androidEntries, bundledPackages, disallowed, isAllowed, nativeEntries } from './licenses.ts'

describe('isAllowed', () => {
  test('allows a listed license, one alternative of an OR, and an AND only when every term is', () => {
    expect(isAllowed('MIT')).toBe(true)
    expect(isAllowed('(GPL-2.0-only OR MIT)')).toBe(true)
    expect(isAllowed('Apache-2.0 WITH LLVM-exception AND NCSA')).toBe(true)
    expect(isAllowed('MIT AND GPL-2.0-only')).toBe(false)
  })

  test('refuses what is not an allowed SPDX id, as a POM\'s free text', () => {
    expect(isAllowed('BSD License')).toBe(false)
    expect(isAllowed('GPL-2.0-only')).toBe(false)
  })
})

describe('bundledPackages', () => {
  test('names the folder of each package by its last node_modules, scoped or not, on either separator', () => {
    expect(bundledPackages([
      'node_modules/effect/dist/Effect.js',
      'node_modules\\@babel\\runtime\\helpers\\x.js',
      'node_modules/react-native/node_modules/promise/lib/core.js',
      'src/app/program.ts',
    ])).toEqual(
      new Set([
        'node_modules/effect',
        'node_modules/@babel/runtime',
        'node_modules/react-native/node_modules/promise',
      ]),
    )
  })
})

describe('androidEntries', () => {
  test('keys a library by its coordinates and version, each license by its SPDX id or else its name', () => {
    const entries = androidEntries({
      libraries: [
        { uniqueId: 'com.example:a', artifactVersion: '1.0', licenses: ['apache', 'odd'], name: 'A' },
        { uniqueId: 'com.example:b', licenses: [] },
      ],
      licenses: { apache: { spdxId: 'Apache-2.0', name: 'Apache License' }, odd: { name: 'Odd License' } },
    })
    expect(entries).toEqual([
      ['com.example:a@1.0', {
        licenses: 'Apache-2.0 AND Odd License',
        repository: undefined,
        publisher: undefined,
        name: 'A',
        description: undefined,
      }],
      ['com.example:b', {
        licenses: undefined,
        repository: undefined,
        publisher: undefined,
        name: undefined,
        description: undefined,
      }],
    ])
    expect(disallowed(entries)).toEqual(['com.example:a@1.0: Apache-2.0 AND Odd License', 'com.example:b: no license'])
  })
})

describe('nativeEntries', () => {
  test('are all under licenses the app may ship with', () => {
    expect(disallowed(nativeEntries)).toEqual([])
  })
})
