import type { BrandLogo } from './brand'

/**
 * Where each logo variant is used on the site.
 *
 * The brand guidelines ship 79 variants and most of them are wrong for any given
 * slot, so the choice is made once here rather than at each call site. Swapping a
 * placement is a one-line change, and `BrandLogo` stops you naming a file that
 * does not exist.
 *
 * Naming grammar, from the guidelines:
 *   background_<field>   frame | spaced | red | white | ink
 *   <element>_<colour>   red | white | ink
 *   wordmark_<stacked|inline>_<colour>
 *
 * `frame` variants are cropped tight, so we control the spacing in CSS. `spaced`
 * and filled fields bake the clear space in and are for handing to other people.
 */
export const LOGOS = {
  /** Sticky header, sitting on white. */
  header: 'lockup-inline-background_frame-brandmark_red-wordmark_stacked_ink',

  /** Footer, sitting on ink. */
  footer: 'lockup-stacked-background_frame-brandmark_white-wordmark_stacked_white',

  /** The tile floating over the hero image. Filled field, so its corners use the mark's own curve. */
  heroTile: 'brandmark-background_red-white',

  /** Watermark in the red call-to-action band. */
  ctaWatermark: 'brandmark-background_frame-white',

  /** Favicon, app icon, avatar. Named for this use in the guidelines. */
  icon: 'brandmark-background_white-red',

  /** Open Graph and social cards, where a filled field beats a transparent one. */
  social: 'lockup-inline-background_red-brandmark_white-wordmark_stacked_white',
} as const satisfies Record<string, BrandLogo>
