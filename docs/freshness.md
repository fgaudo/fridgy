# Design: how a product's expiration is drawn in Home's list

Decided on 2026-10-30. A row of Home's list (`src/app/children/home/children/products/`) leads with a disc that
shows the expiration day. The disc's color and a ring around it tell two different things.

## The disc: the days left

The user asks the list which product to eat first. That answer is in days, the days the disc shows, so the disc's
color follows the days left. It follows the calendar's counts of `docs/dates.md`, which change at midnight only.

| Status (`ProductStatus`)            | Days left        | Disc                                     |
| ----------------------------------- | ---------------- | ---------------------------------------- |
| `Stale`, `ExpiredYesterday`         | expired          | `error`, under `onError`                 |
| `ExpiringToday`, `ExpiringTomorrow` | 0 or 1           | `errorContainer`                         |
| `ExpiringSoon`                      | 2 to `SOON_DAYS` | `primaryContainer`                       |
| `Fresh`                             | more             | `tertiaryContainer`                      |
| `Everlasting`                       | none             | `surfaceContainerHighest`, with a ∞ sign |

`SOON_DAYS` is 3, in `src/domain/product.ts`: a few days of a weekly shopping. AddProducts colors the disc of a
product entering the fridge by it too (`docs/product-flight.md`). The program decides the case, the view only
gives it a look.

An expired product takes the error's solid role, louder than the container of a product about to expire. Its
supporting text ("Expired 5 days ago") is in `error` too.

The color once followed the share of life left. That made the color and the text disagree: a cheese bought three
months ago and good for ten more days was red, a yogurt bought yesterday and good through tomorrow was orange. In a
list sorted by expiration, the colors jumped from row to row.

## The ring: the time in the fridge

The share of life left (`Product.expirationStatus`'s `freshness`) is still worth seeing, as what it really
measures. Its start is the product's creation, when it was entered in the app, not when it was made. So it tells
how much of its time in the fridge is still ahead.

It is drawn as Material's determinate circular progress indicator around the disc:

- the arc is the share still ahead, from twelve o'clock, clockwise, with round caps. It shrinks as the time passes;
- the arc is in the solid role of the disc's container (`error`, `primary`, `tertiary`), the track in
  `secondaryContainer`, Material's;
- it is 3dp wide, 2dp off the 40dp disc, so the avatar's slot is 50dp in every row, ring or not, and the texts of
  the rows stay aligned. The row stays 72dp;
- there is none on an expired product (its time is over, the solid disc says it), on one that never expires, and
  on a selected row, whose disc turns into a check.

The ring and the disc disagree on purpose. A green disc with an almost empty ring is a product with time ahead that
has been in the fridge for a long while; a red disc with a half ring was bought recently and expires soon.

The arc moves when the program reads the clock again, every 30 seconds, not on every frame.

TalkBack reads a row as its name, its supporting text and, with a ring, "N% of its time left".

The ring is drawn with `react-native-svg`, for the round caps of Material's indicator. It has no gap between the
arc and the track, which Material's expressive indicator has.
