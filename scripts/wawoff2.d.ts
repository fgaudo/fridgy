// The converter ships no types: the one function the icons command calls.
declare module 'wawoff2' {
  export const decompress: (woff2: Uint8Array) => Promise<Uint8Array>
}
