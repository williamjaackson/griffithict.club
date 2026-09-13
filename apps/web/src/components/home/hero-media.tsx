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
        Placeholder. The design calls for a photo and the hatch stands in until
        the club has one. See docs/OPEN-QUESTIONS.md.
      */}
      <div className="bg-surface col-start-1 row-start-1 rounded-[clamp(28px,3.4vw,48px)] bg-[repeating-linear-gradient(135deg,#E7E3E0_0_10px,#F4F2F0_10px_20px)]" />

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
