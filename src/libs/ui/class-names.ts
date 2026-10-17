import { clsx } from 'clsx'

// Joins class names, dropping the falsy ones and those mapped to `false`. Conflicting Tailwind classes are not
// merged: a component offers typed variants instead of accepting classes that override its own.
export const cn = clsx
