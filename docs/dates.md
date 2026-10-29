# Design: days and the device's zone

Implemented on 2026-10-29. Before it, every rule about days was computed in UTC, which was an oversight. In New
York in the evening, today's date could not be typed, and a product expiring that day read "Expired yesterday".
In Rome just after midnight, yesterday's product still read "Expires today".

## Decisions

- **An expiration is a day of the calendar, not an instant.** A package prints a day, and the user means that
  day wherever the phone is. `libs/dates/day.ts` holds it as `YYYY-MM-DD`. It is stored as that text in
  `product_expiration.date`, which orders as the days do, so the list's `ORDER BY` stays a text order.
- **The creation date stays an instant**, in UTC (ISO 8601). It says when the product entered the fridge.
- **"Today" is the device's day.** The clocks (`libs/timers`, `every`) send the time as a `DateTime.Zoned`, in
  the `DateTime.CurrentTimeZone`. `update` stays pure: it reads the day and the zone from that value, never from
  `Date` or `Intl`.
- **The entrypoints provide the zone**, with `DateTime.layerCurrentZoneLocal`: it is read once, when the app
  starts. The tests provide a zone of their own (`rehearsed`'s `zone`, UTC unless given).
- **The keypad's rules take today as a day.** `libs/dates` knows nothing of zones: a page gives it today in the
  device's zone, and it offers days of the calendar.
- **A product has expired from the start of the day after its expiration day, in the device's zone**
  (`Product.expirationStatus`). The day counts ("in 3 days", "2 days ago") are differences between days, so a
  clock change never makes a day of 23 or 25 hours count wrong. The freshness is the part of the time from the
  creation to that end that is left.
- **A new product may expire from its creation's day in the device's zone** (`Product.canExpireOn`).
- **A stored product is read whatever its expiration day** (`Product.fromSnapshot`). The day it was created
  depends on the zone it was created in, which is not stored. A product set to expire the day it was added, in New
  York, has an expiration before its creation's day once the phone is in Tokyo.
- **An edit allows the day the product expires on already, and every later day**, as well as the days a new
  product created at the same time could expire on (`Product.canBeEditedToExpireOn`, `Product.edit`). Without it,
  the product above could not even be renamed in Tokyo.
- **The views write a day without a zone shift** (`Day.format`): the day shown is the day typed.

## Not done

- A phone that changes zone while the app runs keeps the old zone's days until the app restarts, since the zone
  is read at start. Reading the zone at each tick of the clocks would need a service of the platform in place of
  `CurrentTimeZone`.
