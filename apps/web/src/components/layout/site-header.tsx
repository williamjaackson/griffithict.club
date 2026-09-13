'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Links, Site } from '@/content/schema'
import { brandLogo } from '@/lib/brand'
import { LOGOS } from '@/lib/logos'
import { useSponsorship } from '@/components/sponsorship/sponsorship-context'
import { useScrollLock } from '@/components/ui/use-scroll-lock'
import { BUTTON } from '@/components/ui/button-styles'

export function SiteHeader({ site, links }: { site: Site; links: Links }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-[clamp(12px,2vw,32px)] px-[clamp(20px,5vw,56px)] py-[14px] transition-shadow duration-250 ${
        menuOpen ? 'bg-white' : 'bg-white/72 backdrop-blur-[18px] backdrop-saturate-180'
      } ${scrolled && !menuOpen ? 'shadow-[0_1px_0_rgba(17,16,16,0.06),0_8px_24px_rgba(17,16,16,0.07)]' : ''}`}
    >
      <Link href="/#top" className="block flex-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandLogo(LOGOS.header)}
          alt={site.name}
          className="block h-[clamp(26px,3.4vw,32px)] w-auto"
        />
      </Link>

      <nav className="wide:flex hidden items-center gap-[clamp(14px,2vw,28px)] text-[13px] font-bold tracking-[0.1em] uppercase">
        {site.nav.map((item) => (
          <Link key={item.href} href={item.href} className="text-ink hover:text-brand">
            {item.label}
          </Link>
        ))}
        <a
          href={links.discord}
          className={`${BUTTON.brand} inline-flex h-[42px] items-center gap-2 rounded-[11px] px-[18px] text-[13px] font-bold tracking-[0.06em]`}
        >
          Join the Discord
        </a>
      </nav>

      <MobileMenu site={site} links={links} open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  )
}

function MobileMenu({
  site,
  links,
  open,
  onOpenChange,
}: {
  site: Site
  links: Links
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setOpen: setSponsorOpen } = useSponsorship()
  useScrollLock(open)

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Trigger
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="hover:bg-surface wide:hidden -mr-[10px] inline-flex size-[46px] flex-none cursor-pointer items-center justify-center rounded-[13px] border-none bg-transparent"
      >
        <span className="relative block h-4 w-[22px]">
          <Bar className={open ? 'translate-y-[-1px] rotate-45' : '-translate-y-2'} />
          <Bar className={`translate-y-[-1px] ${open ? 'opacity-0' : 'opacity-100'}`} />
          <Bar className={open ? 'translate-y-[-1px] -rotate-45' : 'translate-y-[6px]'} />
        </span>
      </RadixDialog.Trigger>

      <RadixDialog.Portal>
        <RadixDialog.Content
          aria-label="Menu"
          className="animate-slide-in fixed inset-x-0 top-[74px] bottom-0 z-15 flex flex-col bg-white px-[clamp(24px,5.5vw,88px)] pt-4 pb-7"
        >
          <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
          <nav className="flex flex-col">
            {site.nav.map((item, index) => (
              <RadixDialog.Close asChild key={item.href}>
                <Link
                  href={item.href}
                  className="animate-fade-up border-edge-soft text-ink flex items-center justify-between border-b py-5 text-[26px] font-extrabold tracking-[-0.03em] [font-stretch:110%]"
                  style={{ animationDelay: `${0.04 + index * 0.05}s` }}
                >
                  {item.label}
                </Link>
              </RadixDialog.Close>
            ))}
            <RadixDialog.Close asChild>
              <button
                type="button"
                onClick={() => setSponsorOpen(true)}
                className="animate-fade-up border-edge-soft text-ink flex cursor-pointer items-center justify-between border-x-0 border-t-0 border-b bg-transparent py-5 text-left text-[26px] font-extrabold tracking-[-0.03em] [font-stretch:110%]"
                style={{ animationDelay: `${0.04 + site.nav.length * 0.05}s` }}
              >
                Sponsor us
              </button>
            </RadixDialog.Close>
          </nav>
          <a
            href={links.discord}
            className={`animate-fade-up ${BUTTON.brand} mt-auto inline-flex min-h-[62px] items-center justify-center rounded-2xl px-6 text-lg font-bold`}
            style={{ animationDelay: `${0.09 + site.nav.length * 0.05}s` }}
          >
            Join the Discord
          </a>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function Bar({ className }: { className: string }) {
  return (
    <span
      className={`bg-ink absolute inset-x-0 top-1/2 h-0.5 rounded-sm transition-transform duration-300 ${className}`}
    />
  )
}
