# Bot marks

Designs for bots that do not exist yet. When one is built its mark moves to
`apps/<name>/assets/icon.svg` beside the code.

Every mark is built the same way: an off-white ground, an ink silhouette, and
three bands — `#E51B13`, `#F4674E`, `#F9A99A` — clipped into the top of the
shape. Sharing the construction rather than only the palette is what makes them
read as a set in a member list.

Two rules learned the hard way:

- **Break the colour on a line the shape already owns.** A calendar's header, a
  gem's girdle. Inventing one produces a seam. Where a shape has none, as with
  the star, band across solid mass instead of a pinch point.
- **Keep the footprint near 280x280.** Funnel's mark is 276 wide by 264 tall.
  Anything much larger sits visibly heavier than its siblings at the same size.
  Judge it by eye afterwards, though: the star is deliberately bigger, because
  its concave points make it read smaller than the box it fills.
- **Copy a shape rather than recalling it.** Boost took three attempts because
  the first two were drawn from memory. Discord's boost badge is 10.92 by 18.6
  on a 24 grid, an aspect of 0.59; both guesses were near 0.77, which is a house
  rather than a diamond. It is in `mezotv/discord-badges`, `discord-boost-3.svg`.

`pnpm icons` renders every SVG here and in `apps/*/assets/` to the 512x512 PNG
the developer portal wants.
