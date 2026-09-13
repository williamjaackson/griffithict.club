import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-hosted in Docker. Produces a minimal server bundle in .next/standalone.
  output: 'standalone',

  // The workspace root, so file tracing picks up packages/db.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,

  // Prerenders the static shell and streams the dynamic holes (the event slots)
  // at request time, instead of making the whole route dynamic because one
  // component touches Postgres.
  cacheComponents: true,

  images: {
    // Every image here is a committed static asset: 79 logo SVGs and a few sponsor
    // PNGs. next/image will not touch SVGs without dangerouslyAllowSVG, and
    // optimising a dozen PNGs at runtime is not worth carrying sharp, a cache
    // volume, and their failure modes on a single VPS.
    unoptimized: true,
  },
}

export default nextConfig
