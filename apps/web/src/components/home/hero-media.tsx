import type { ReactNode } from 'react'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'

/**
 * The panel beside the hero copy: an image, the brandmark over its top corner,
 * and whatever is slotted into the bottom.
 *
 * Two layers in one grid cell rather than absolutely positioned children. The
 * image is the lower layer; the upper layer is a padded three-row grid, so the
 * things sitting on top are placed by the row they are in and spaced by one
 * padding value. Nothing needs to know its own offset, and the card slotted in
 * carries no positioning at all.
 *
 * `--inset` is that one value. The mockup used four: a left, a bottom, and a
 * right that was twice the others, with the brandmark pinned to its own pair.
 *
 * Size comes from the aspect ratio and the max width, and nothing else. A max
 * height as well would win over the ratio at full size and quietly distort it.
 */
export function HeroMedia({ children }: { children: ReactNode }) {
  return (
    <div className="animate-rise grid aspect-4/5 w-full max-w-[496px] justify-self-end [--inset:clamp(14px,1.8vw,22px)]">
      {/*
        The photo is 3:4 and the panel is 4:5, so object-cover trims roughly 6% of
        the height. Centred, which takes it off the ceiling and the floor and
        leaves the room itself intact.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/photos/hackathon-2026-08.jpg"
        alt="Students at a Griffith ICT Club hackathon, seated around tables with laptops while three committee members present from the front of the room."
        className="bg-surface col-start-1 row-start-1 size-full rounded-[clamp(28px,3.4vw,48px)] object-cover"
      />

      <div className="col-start-1 row-start-1 grid grid-rows-[auto_1fr_auto] p-[var(--inset)]">
        {/* Lifted clear of the top edge, which is the one deliberate overhang. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogo(LOGOS.heroTile)}
          alt=""
          className="block w-[clamp(64px,9vw,108px)] -translate-y-[calc(var(--inset)+14px)] justify-self-end"
        />

        <div aria-hidden="true" />

        {children}
      </div>
    </div>
  )
}
