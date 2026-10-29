import * as DateTime from 'effect/DateTime'
import * as fc from 'fast-check'

/** Any instant from 1970 to 2100. */
export const utc = fc.integer({ min: 0, max: 4_102_444_800_000 }).map((millis) => DateTime.makeUnsafe(millis))

/**
 * A zone of the device: UTC, the farthest from it either way, offsets of half and three quarters of an hour, and
 * zones whose clocks change, one of them at midnight.
 */
export const zone = fc.constantFrom(
  'UTC',
  'Pacific/Pago_Pago',
  'America/New_York',
  'America/Santiago',
  'Europe/Rome',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Pacific/Chatham',
  'Pacific/Kiritimati',
).map((name) => DateTime.zoneMakeNamedUnsafe(name))

/** Any instant from 1970 to 2100, in a zone of the device. */
export const zoned = fc.tuple(utc, zone).map(([date, zone]) => DateTime.setZone(date, zone))
