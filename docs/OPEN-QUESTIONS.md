# Open questions

Things that are deliberately unfinished, and why. Delete an entry when it is
resolved.

## Committee headshots

Tylar Pinniger and Owen Richardson have one. The rest still render the hatch
placeholder, on the cards and on the role-history timeline.

Add a photo by dropping it in `public/photos/committee/` and adding a `photo:` to
that person's term in `committee.yaml` — the thumbnail swaps itself. The photo
belongs to the term, not the role, so a past holder keeps theirs.

Resize before committing one. A phone screenshot is a couple of megabytes and
image optimisation is off, so it would ship at full size for a 76px avatar. Around
400px on the long edge as JPEG is plenty.

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
