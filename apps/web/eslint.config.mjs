// eslint-config-next ships flat-config arrays directly, but as CommonJS, so they
// arrive on the default export rather than as named ones.
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    // Generated from the vendored SVG filenames; see scripts/brand-manifest.mjs.
    ignores: ['.next/**', 'node_modules/**', 'src/lib/brand.ts'],
  },
]

export default config
