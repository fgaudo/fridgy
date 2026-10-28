// `fontverter` ships no types: only what the build uses.
declare module 'fontverter' {
  type Format = 'sfnt' | 'woff' | 'woff2'
  export function convert(buffer: Buffer, toFormat: Format, fromFormat?: Format): Promise<Buffer>
}
