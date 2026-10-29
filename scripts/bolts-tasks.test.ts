// The module `android/bolts-tasks` is Meta's code under MIT, and must stay byte for byte the commit that relicensed it
// (`android/bolts-tasks/build.gradle`): its record holds the commit and each file's git blob id there, which anyone
// can compare with the repository's tree.
import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const MODULE = join(import.meta.dir, '..', 'android', 'bolts-tasks')

type Provenance = Readonly<{ commit: string; files: Readonly<Record<string, string>> }>

const provenance = JSON.parse(readFileSync(join(MODULE, 'provenance.json'), 'utf8')) as Provenance

/** Git's id of a file's content: the SHA-1 of `blob <size>\0` and the bytes. */
const blobId = (bytes: Buffer) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')

const filesUnder = (folder: string): ReadonlyArray<string> =>
  readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(MODULE, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))

describe('android/bolts-tasks', () => {
  test('holds the files of the relicensing commit, and no other source', () => {
    expect(new Set([...filesUnder(join(MODULE, 'src')), 'LICENSE'])).toEqual(new Set(Object.keys(provenance.files)))
  })

  test('holds each file byte for byte as that commit has it', () => {
    for (const [file, id] of Object.entries(provenance.files)) {
      expect({ file, id: blobId(readFileSync(join(MODULE, file))) }).toEqual({ file, id })
    }
  })
})
