import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type { Source } from '#libs/source/source.ts'

export class ScannerError extends Data.TaggedError('ScannerError')<{
  readonly cause: unknown
}> {}

export class Scanner extends Context.Service<
  Scanner,
  {
    /**
     * Event: the barcodes the camera reads, each once until another one is read. The camera is on, drawn behind
     * the page, only while this is observed. Fails when the camera cannot be used (none, or not allowed).
     */
    readonly barcodes: Source<string, never, ScannerError>
  }
>()('c09e01f910c84261') {}
