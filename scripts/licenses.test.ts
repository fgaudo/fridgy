import { describe, expect, test } from 'bun:test'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import {
  androidEntries,
  bundledPackages,
  copyrightOf,
  disallowed,
  isAllowed,
  licenseFile,
  nativeEntries,
  npmEntry,
  PackageJson,
  repositoryPage,
} from './licenses.ts'

const decodePackage = (pkg: object) => Schema.decodeSync(PackageJson)(JSON.stringify(pkg))

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

describe('licenseFile', () => {
  test('takes a LICENSE before its variants, whatever the case or extension, and never a README', () => {
    expect(licenseFile(['README.md', 'COPYING', 'license.md', 'LICENSE-MIT'])).toEqual(Opt.some('license.md'))
    expect(licenseFile(['Readme.md', 'COPYING.txt'])).toEqual(Opt.some('COPYING.txt'))
    expect(licenseFile(['README.md', 'package.json'])).toEqual(Opt.none())
  })
})

describe('copyrightOf', () => {
  test('takes the line of the first statement, even right under the title or above the text', () => {
    expect(copyrightOf('The MIT License (MIT)\nCopyright (c) 2016 Someone\n\nPermission is hereby granted'))
      .toEqual(Opt.some('Copyright (c) 2016 Someone'))
    expect(copyrightOf('MIT License\r\n\r\n  Copyright 2021 Someone\r\nPermission is hereby granted'))
      .toEqual(Opt.some('Copyright 2021 Someone'))
  })

  test('leaves out the license\'s own sentences on copyright', () => {
    expect(copyrightOf('Copyright notice and this permission notice shall be included')).toEqual(Opt.none())
  })
})

describe('repositoryPage', () => {
  test('makes a web page of a git URL', () => {
    expect(repositoryPage('git+https://github.com/react/metro.git')).toBe('https://github.com/react/metro')
    expect(repositoryPage('git://github.com/beatgammit/base64-js.git')).toBe('https://github.com/beatgammit/base64-js')
    expect(repositoryPage('git+ssh://git@github.com/a/b.git')).toBe('https://github.com/a/b')
    expect(repositoryPage('git@github.com:a/b.git')).toBe('https://github.com/a/b')
    expect(repositoryPage('https://github.com/facebook/regenerator/tree/main/packages/runtime'))
      .toBe('https://github.com/facebook/regenerator/tree/main/packages/runtime')
  })

  test('makes one of GitHub\'s shorthand', () => {
    expect(repositoryPage('github/fetch')).toBe('https://github.com/github/fetch')
    expect(repositoryPage('github:a/b.js')).toBe('https://github.com/a/b.js')
  })
})

describe('npmEntry', () => {
  test('reads the author from a string, and the copyright from the license\'s text', () => {
    expect(npmEntry(
      decodePackage({
        name: 'a',
        version: '1.0.0',
        description: 'A package',
        license: 'MIT',
        repository: { type: 'git', url: 'git+https://github.com/x/a.git' },
        author: 'Some One <one@example.com> (https://example.com)',
      }),
      Opt.some('MIT License\n\nCopyright (c) 2020 Some One\n'),
    )).toEqual(['a@1.0.0', {
      licenses: 'MIT',
      repository: 'https://github.com/x/a',
      publisher: 'Some One',
      email: 'one@example.com',
      copyright: 'Copyright (c) 2020 Some One',
      name: 'a',
      description: 'A package',
    }])
  })

  test('reads the legacy forms of the license, and the author from fields', () => {
    const [, typed] = npmEntry(
      decodePackage({ name: 'b', version: '1.0.0', license: { type: 'ISC' }, author: { name: 'B' } }),
      Opt.none(),
    )
    expect(typed).toMatchObject({ licenses: 'ISC', publisher: 'B', copyright: undefined })
    const [, listed] = npmEntry(
      decodePackage({ name: 'c', version: '1.0.0', licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }),
      Opt.none(),
    )
    expect(listed.licenses).toBe('MIT OR Apache-2.0')
  })

  test('leaves the license out when none is declared, which stops the generation', () => {
    const entry = npmEntry(decodePackage({ name: 'd', version: '1.0.0', licenses: [] }), Opt.none())
    expect(disallowed([entry])).toEqual(['d@1.0.0: no license'])
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
