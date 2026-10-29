// The module `android/bolts-tasks` is Meta's code under MIT, and must stay byte for byte the commit that relicensed it
// (`android/bolts-tasks/build.gradle`): its record holds the commit and each file's git blob id there, which anyone
// can compare with the repository's tree.
import { describe, expect, test } from 'bun:test'
import * as EffBun from '@effect/platform-bun'
import * as Effect from 'effect/Effect'
import * as FS from 'effect/FileSystem'
import * as Path from 'effect/Path'
import * as Schema from 'effect/Schema'

const Provenance = Schema.fromJsonString(Schema.Struct({
  commit: Schema.String,
  files: Schema.Record(Schema.String, Schema.String),
}))

/** Git's id of a file's content: the SHA-1 of `blob <size>\0` and the bytes. */
const blobId = (bytes: Uint8Array) =>
  new Bun.CryptoHasher('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')

/** The record, the module's sources and LICENSE with their blob ids. */
const read = Effect.gen(function*() {
  const fs = yield* FS.FileSystem
  const path = yield* Path.Path
  const module = path.join(import.meta.dir, '..', 'android', 'bolts-tasks')
  const provenance = yield* Schema.decodeEffect(Provenance)(
    yield* fs.readFileString(path.join(module, 'provenance.json')),
  )
  const sources = (yield* fs.readDirectory(path.join(module, 'src'), { recursive: true }))
    .map((file) => `src/${file.replaceAll('\\', '/')}`)
    .filter((file) => file.endsWith('.java'))
  const files = yield* Effect.forEach(
    [...sources, 'LICENSE'],
    (file) => Effect.map(fs.readFile(path.join(module, file)), (bytes) => [file, blobId(bytes)] as const),
  )
  return { provenance, files: Object.fromEntries(files) }
}).pipe(Effect.provide(EffBun.BunServices.layer))

describe('android/bolts-tasks', () => {
  test('holds the files of the relicensing commit, byte for byte, and no other source', async () => {
    const { provenance, files } = await Effect.runPromise(read)
    expect(files).toEqual(provenance.files)
  })
})
