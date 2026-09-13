import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import { links, site, sponsorship } from '@/content'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SponsorshipDialog } from '@/components/sponsorship/sponsorship-dialog'
import { SponsorshipProvider } from '@/components/sponsorship/sponsorship-context'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { currentSponsorshipPeriods, currentYear } from '@/lib/clock'
import './globals.css'

/*
 * Archivo carries a width axis as well as a weight axis, and the headings in the
 * design sit at font-stretch 106–118%. Without `axes: ['wdth']` the variable font
 * loads weight-only and every heading quietly collapses to normal width.
 *
 * next/font self-hosts the files at build time, so there is no request to Google
 * at runtime and no layout shift from a late swap.
 */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
})

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  icons: {
    icon: brandLogo(LOGOS.icon),
    apple: brandLogo(LOGOS.icon),
  },
}

export const viewport: Viewport = {
  themeColor: '#E51B13',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [periods, year] = await Promise.all([currentSponsorshipPeriods(), currentYear()])

  return (
    <html lang="en-AU" className={archivo.variable}>
      <body>
        {/*
          The sponsorship dialog opens from the header, the sponsor strip and the
          footer, so its state lives above all three rather than inside any one.
        */}
        <SponsorshipProvider>
          <SiteHeader site={site} links={links} />
          {children}
          <SiteFooter site={site} links={links} year={year} />
          <SponsorshipDialog
            tiers={sponsorship.tiers}
            benefits={sponsorship.benefits}
            periods={periods}
          />
        </SponsorshipProvider>
      </body>
    </html>
  )
}
