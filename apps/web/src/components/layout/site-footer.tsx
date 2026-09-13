'use client'

import Link from 'next/link'
import type { Links, Site } from '@/content/schema'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { useSponsorship } from '@/components/sponsorship/sponsorship-context'
import { DiscordIcon, GitHubIcon, InstagramIcon, LinkedInIcon } from './social-icons'

export function SiteFooter({ site, links, year }: { site: Site; links: Links; year: number }) {
  const { setOpen } = useSponsorship()

  const socials = [
    { href: links.discord, label: 'Discord', Icon: DiscordIcon },
    { href: links.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: links.linkedin, label: 'LinkedIn', Icon: LinkedInIcon },
    { href: links.github, label: 'GitHub', Icon: GitHubIcon },
  ]

  return (
    <footer className="bg-ink px-[clamp(24px,5.5vw,88px)] pt-[clamp(44px,5vw,68px)] pb-[34px] text-white">
      <div className="border-edge-dark wide:grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] wide:gap-[clamp(28px,3vw,44px)] grid grid-cols-2 gap-x-5 gap-y-[30px] border-b pb-[clamp(28px,3.5vw,44px)]">
        <div className="wide:col-span-1 wide:flex-col wide:items-start wide:gap-5 col-span-full flex items-start justify-between gap-[14px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogo(LOGOS.footer)}
            alt={site.name}
            className="wide:w-[84px] block w-[58px]"
          />
          <div className="wide:mr-0 wide:-ml-3 wide:gap-0.5 -mr-3 flex items-center">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                title={label}
                className="text-muted-dim inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[11px] text-[15px]">
          <span className="text-muted-dim text-xs font-bold tracking-[0.16em] uppercase">Club</span>
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-brand text-white">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-[11px] text-[15px]">
          <span className="text-muted-dim text-xs font-bold tracking-[0.16em] uppercase">
            Partners
          </span>
          <Link href="/#sponsors" className="hover:text-brand text-white">
            Our sponsors
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hover:text-brand cursor-pointer border-none bg-transparent p-0 text-left text-[15px] text-white"
          >
            Sponsor us
          </button>
        </div>
      </div>

      <div className="text-muted-dim mt-[22px] flex flex-wrap items-end justify-between gap-5 text-[13px]">
        <p className="m-0">
          © {year} {site.name}. By students.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href={links.builtBy.href} className="text-muted-dim hover:text-white">
            {links.builtBy.label}
          </a>
          <a href={links.university} className="text-muted-dim hover:text-white">
            Griffith University
          </a>
        </div>
      </div>
    </footer>
  )
}
