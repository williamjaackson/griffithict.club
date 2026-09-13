# Open questions

Things that are deliberately unfinished, and why. Delete an entry when it is
resolved.

## Photography — blocks launch

The design has a photo panel in the hero and a headshot for each committee
member. Neither exists, so both render a diagonal hatch placeholder
(`components/home/hero.tsx`, `components/committee/committee-section.tsx`).

The hero panel is roughly 40% of the first screen. The page does not work without
it — this is the one item that should hold a launch.

Needs: one strong landscape photo of an event, and four headshots. Same
treatment, ideally the same session.

## `/sponsors`

The footer's "Our sponsors" is an anchor to the sponsor strip on the homepage.
Fine for three sponsors. Worth a page of its own if the list grows.

## Cream

The brand guidelines say three colours and "cream is retired". The mockup uses
`#F4F2F0` for the What's On section, event chips and committee thumbnails.

Read as: the three-colour rule governs logo artwork, and those greys are interface
neutrals the layout depends on structurally. If the rule was meant to apply site
wide, the What's On section needs redesigning rather than recolouring — it
currently relies on that surface to separate itself from the sections either side.

## Scrollbars

The mockup hides scrollbars globally (`html, div { scrollbar-width: none }`).
That is not carried over: hiding the page scrollbar removes the only indication
of how long the page is. The `no-scrollbar` utility exists in `globals.css` and is
applied to dialog bodies, where the design intent makes sense.
